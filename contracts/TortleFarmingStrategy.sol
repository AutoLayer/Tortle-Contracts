// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "./interfaces/IMasterChef.sol";
import "./interfaces/ITortleVault.sol";

import "hardhat/console.sol";

error TortleFarmingStrategy__SenderIsNotVault();
error TortleFarmingStrategy__InvalidAmount();
error TortleFarmingStrategy__FeeIsTooHigh();
error TortleFarmingStrategy__InvalidSlippageFactor();

contract TortleFarmingStrategy is Ownable, Pausable {
    using SafeERC20 for IERC20;

    address public immutable wftm;
    address public immutable rewardToken;
    address public immutable lpToken;
    address public immutable lpToken0;
    address public immutable lpToken1;

    address public immutable uniRouter;
    address public immutable masterChef;
    uint8 public immutable poolId;

    address public immutable treasury;
    address public immutable vault;

    uint256 public constant callFee = 1000;
    uint256 public constant treasuryFee = 9000;
    uint256 public constant securityFee = 10;
    uint256 public totalFee = 500;
    uint256 public constant MAX_FEE = 500;
    uint256 public constant PERCENT_DIVISOR = 10000;
    uint256 public slippageFactorMin = 950;

    address[] public rewardTokenToWftmRoute;
    address[] public rewardTokenToLp0Route;
    address[] public rewardTokenToLp1Route;
    struct Harvest {
        uint256 timestamp;
        uint256 vaultSharePrice;
    }
    Harvest[] public harvestLog;
    uint256 public harvestLogCadence;
    uint256 public lastHarvestTimestamp;
    event StratHarvest(address indexed harvester);
    event FeesUpdated(uint256 newCallFee, uint256 newTreasuryFee);
    event TotalFeeUpdated(uint256 newFee);
    event SlippageFactorMinUpdated(uint256 newSlippageFactorMin);

    constructor(
        address _lpToken,
        uint8 _poolId,
        address _vault,
        address _treasury,
        address _uniRouter,
        address _masterChef,
        address _rewardToken,
        address _wftm
    ) {
        uniRouter = _uniRouter;
        masterChef = _masterChef;
        rewardToken = _rewardToken;
        wftm = _wftm;

        lpToken = _lpToken;
        poolId = _poolId;
        vault = _vault;
        treasury = _treasury;

        lpToken0 = IUniswapV2Pair(lpToken).token0();
        lpToken1 = IUniswapV2Pair(lpToken).token1();

        if (lpToken0 == wftm) {
            rewardTokenToLp0Route = [rewardToken, wftm];
        } else if (lpToken0 != rewardToken) {
            rewardTokenToLp0Route = [rewardToken, wftm, lpToken0];
        }

        if (lpToken1 == wftm) {
            rewardTokenToLp1Route = [rewardToken, wftm];
        } else if (lpToken1 != rewardToken) {
            rewardTokenToLp1Route = [rewardToken, wftm, lpToken1];
        }

        rewardTokenToWftmRoute = [rewardToken, wftm];

        harvestLog.push(
            Harvest({
                timestamp: block.timestamp,
                vaultSharePrice: ITortleVault(_vault).getPricePerFullShare()
            })
        );
    }

    function deposit() public whenNotPaused {
        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        if (lpBalance > 0) {
            IERC20(lpToken).safeApprove(masterChef, 0);
            IERC20(lpToken).safeApprove(masterChef, lpBalance);
            IMasterChef(masterChef).deposit(poolId, lpBalance);
        }
    }

    function withdraw(uint256 _amount) external {
        if (msg.sender != vault) revert TortleFarmingStrategy__SenderIsNotVault();
        uint256 lpTokenBalance = IERC20(lpToken).balanceOf(address(this));
        if (_amount == 0 || _amount > (balanceOfPool() + lpTokenBalance)) revert TortleFarmingStrategy__InvalidAmount();
        _amount -= (_amount * securityFee) / PERCENT_DIVISOR;

        if (lpTokenBalance < _amount) {
            IMasterChef(masterChef).withdraw(poolId, _amount - lpTokenBalance);
        }
        IERC20(lpToken).safeTransfer(vault, _amount);
    }

    function harvest(uint256 _slippageFactor) external whenNotPaused {
        if (_slippageFactor > 1000 || _slippageFactor <= slippageFactorMin) revert TortleFarmingStrategy__InvalidSlippageFactor();
        IMasterChef(masterChef).deposit(poolId, 0);
        chargeFees();
        addLiquidity(_slippageFactor);
        deposit();
        if (block.timestamp >= harvestLog[harvestLog.length - 1].timestamp + harvestLogCadence) {
            harvestLog.push(Harvest({timestamp: block.timestamp, vaultSharePrice: ITortleVault(vault).getPricePerFullShare()}));
        }
        lastHarvestTimestamp = block.timestamp;
        emit StratHarvest(msg.sender);
    }

    function chargeFees() internal {
        uint256 toWftm = (IERC20(rewardToken).balanceOf(address(this)) * totalFee) / PERCENT_DIVISOR;
        swap(toWftm, rewardTokenToWftmRoute, slippageFactorMin);
        uint256 wftmBal = IERC20(wftm).balanceOf(address(this));
        uint256 callFeeToUser = (wftmBal * callFee) / PERCENT_DIVISOR;
        uint256 treasuryFeeToVault = (wftmBal * treasuryFee) / PERCENT_DIVISOR;
        IERC20(wftm).safeTransfer(msg.sender, callFeeToUser);
        IERC20(wftm).safeTransfer(treasury, treasuryFeeToVault);
    }

    function addLiquidity(uint256 _slippageFactor) internal {
        uint256 rewardTokenHalf = IERC20(rewardToken).balanceOf(address(this)) / 2;

        if (lpToken0 != rewardToken) {
            swap(rewardTokenHalf, rewardTokenToLp0Route, _slippageFactor);
        }

        if (lpToken1 != rewardToken) {
            swap(rewardTokenHalf, rewardTokenToLp1Route, _slippageFactor);
        }
        uint256 lp0Bal = IERC20(lpToken0).balanceOf(address(this));
        uint256 lp1Bal = IERC20(lpToken1).balanceOf(address(this));
        if (lp0Bal != 0 && lp1Bal != 0) {
            IERC20(lpToken0).safeApprove(uniRouter, 0);
            IERC20(lpToken0).safeApprove(uniRouter, lp0Bal);
            IERC20(lpToken1).safeApprove(uniRouter, 0);
            IERC20(lpToken1).safeApprove(uniRouter, lp1Bal);
            IUniswapV2Router02(uniRouter).addLiquidity(lpToken0, lpToken1, lp0Bal, lp1Bal, 1, 1, address(this), block.timestamp);
        }
    }

    function balanceOf() public view returns (uint256) {
        return balanceOfLpToken() + balanceOfPool();
    }

    function balanceOfLpToken() public view returns (uint256) {
        return IERC20(lpToken).balanceOf(address(this));
    }

    function balanceOfPool() public view returns (uint256) {
        (uint256 _amount, ) = IMasterChef(masterChef).userInfo(poolId, address(this));
        return _amount;
    }

    function retireStrat() external {
        if (msg.sender != vault) revert TortleFarmingStrategy__SenderIsNotVault();

        IMasterChef(masterChef).emergencyWithdraw(poolId);

        uint256 lpBalance = IERC20(lpToken).balanceOf(address(this));
        IERC20(lpToken).transfer(vault, lpBalance);
    }

    function panic() public onlyOwner {
        pause();
        IMasterChef(masterChef).withdraw(poolId, balanceOfPool());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
        deposit();
    }

    function updateTotalFee(uint256 _totalFee)
        external
        onlyOwner
        returns (bool)
    {
        if (_totalFee > MAX_FEE) revert TortleFarmingStrategy__FeeIsTooHigh();
        totalFee = _totalFee;
        emit TotalFeeUpdated(totalFee);
        return true;
    }

    function swap(
        uint256 _amount,
        address[] memory _path,
        uint256 _slippageFactor
    ) internal {
        if (_path.length < 2 || _amount == 0) {
            return;
        }
        IERC20(_path[0]).safeApprove(uniRouter, 0);
        IERC20(_path[0]).safeApprove(uniRouter, _amount);
        uint256[] memory amounts = IUniswapV2Router02(uniRouter).getAmountsOut(_amount, _path);
        uint256 amountOut = amounts[amounts.length - 1];

        IUniswapV2Router02(uniRouter).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _amount,
            (amountOut * _slippageFactor) / 1000,
            _path,
            address(this),
            block.timestamp
        );
    }

    function updateHarvestLogCadence(uint256 _newCadenceInSeconds)
        external
        onlyOwner
    {
        harvestLogCadence = _newCadenceInSeconds;
    }

    function harvestLogLength() external view returns (uint256) {
        return harvestLog.length;
    }

    function estimateHarvest()
        external
        view
        returns (uint256 profit, uint256 callFeeToUser)
    {
        uint256 pendingReward = IMasterChef(masterChef).pendingBOO(
            poolId,
            address(this)
        );
        uint256 totalRewards = pendingReward +
            IERC20(rewardToken).balanceOf(address(this));

        if (totalRewards != 0) {
            profit += IUniswapV2Router02(uniRouter).getAmountsOut(
                totalRewards,
                rewardTokenToWftmRoute
            )[1];
        }

        profit += IERC20(wftm).balanceOf(address(this));

        uint256 wftmFee = (profit * totalFee) / PERCENT_DIVISOR;
        callFeeToUser = (wftmFee * callFee) / PERCENT_DIVISOR;
        profit -= wftmFee;
    }

    function setSlippageFactorMin(uint256 _slippageFactorMin) public onlyOwner {
        slippageFactorMin = _slippageFactorMin;
        emit SlippageFactorMinUpdated(slippageFactorMin);
    }
}
