// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import '../interfaces/IStrategy.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

error TortleVault__ContractAlreadyInitialized();
error TortleVault__InvalidAmount();
error TortleVault__VaultIsFull();
error TortleVault__NoZeroShares();

contract TortleVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public strategy;
    uint public constant MINIMUM_LIQUIDITY = 10**3;

    uint256 public constant PERCENT_DIVISOR = 10000;
    uint256 public tvlCap;

    bool public initialized = false;
    uint256 public immutable constructionTime;

    IERC20 public immutable lpToken;

    mapping(address => uint256) public cumulativeDeposits;
    mapping(address => uint256) public cumulativeWithdrawals;

    event TvlCapUpdated(uint256 newTvlCap);

    event DepositsIncremented(address user, uint256 amount, uint256 total);
    event WithdrawalsIncremented(address user, uint256 amount, uint256 total);

    constructor(
        address _lpToken,
        string memory _name,
        string memory _symbol,
        uint256 _tvlCap
    ) ERC20(string(_name), string(_symbol)) {
        lpToken = IERC20(_lpToken);
        constructionTime = block.timestamp;
        tvlCap = _tvlCap;
    }

    function depositAll() external {
        deposit(msg.sender, lpToken.balanceOf(msg.sender));
    }

    function withdrawAll() external {
        withdraw(msg.sender, balanceOf(msg.sender));
    }

    function removeTvlCap() external onlyOwner {
        updateTvlCap(type(uint256).max);
    }

    function initialize(address _strategy) public onlyOwner returns (bool) {
        if(initialized) revert TortleVault__ContractAlreadyInitialized();
        strategy = _strategy;
        initialized = true;
        return true;
    }

    function balance() public view returns (uint256) {
        return lpToken.balanceOf(address(this)) + IStrategy(strategy).balanceOf();
    }

    function getPricePerFullShare() public view returns (uint256) {
        uint256 decimals = 10 ** ERC20(address(lpToken)).decimals();
        return totalSupply() == 0 ? decimals : (balance() * decimals) / totalSupply();
    }
    
    function deposit(address _user, uint256 _amount) public nonReentrant returns (uint256 shares) {
        if (_amount == 0) revert TortleVault__InvalidAmount();
        uint256 vaultBalStart = lpToken.balanceOf(address(this));
        uint256 lpTokenTotalAmount_ = balance();
        if (lpTokenTotalAmount_ + _amount > tvlCap) revert TortleVault__VaultIsFull();

        lpToken.safeTransferFrom(msg.sender, address(this), _amount);
        _amount = lpToken.balanceOf(address(this)) - vaultBalStart;
        if (totalSupply() != 0) { 
            shares = ((_amount * 100000) * totalSupply()) / lpTokenTotalAmount_;
            shares /= 100000;
            if (shares == 0) revert TortleVault__NoZeroShares();
            _mint(msg.sender, shares);
        } else {
            _mint(address(1), MINIMUM_LIQUIDITY);
            shares = _amount;
            _mint(msg.sender, shares);
        }
        earn();
        incrementDeposits(_user, _amount);
    }

    function earn() public {
        lpToken.safeTransfer(strategy, lpToken.balanceOf(address(this)));
        IStrategy(strategy).deposit();
    }

    function withdraw(address _user, uint256 _shares) public nonReentrant returns (uint256 complexRewardAmount, uint256 rewardAmount, uint256 lpAmountForSharesAmount) {
        if (_shares <= 0) revert TortleVault__InvalidAmount();
        uint256 lpTokenBalStart = lpToken.balanceOf(address(this));
        lpAmountForSharesAmount = ((IStrategy(strategy).balanceOf() + lpTokenBalStart) * _shares) / totalSupply();
        uint256[] memory rewardsAmount = IStrategy(strategy).getRewardsPerFarmNode(_shares);
        complexRewardAmount = rewardsAmount[0];
        rewardAmount = rewardsAmount[1];
        _burn(msg.sender, _shares);
        if (lpTokenBalStart < lpAmountForSharesAmount) {
            uint256 _withdraw = lpAmountForSharesAmount - lpTokenBalStart;
            IStrategy(strategy).withdraw(_user, complexRewardAmount, _withdraw);
            uint256 _diff = lpToken.balanceOf(address(this)) - lpTokenBalStart;
            if (_diff < _withdraw) {
                lpAmountForSharesAmount = lpTokenBalStart + _diff;
            }
        }
        lpToken.safeTransfer(msg.sender, lpAmountForSharesAmount);
        incrementWithdrawals(_user, lpAmountForSharesAmount);
    }

    function updateTvlCap(uint256 _newTvlCap) public onlyOwner {
        tvlCap = _newTvlCap;
        emit TvlCapUpdated(tvlCap);
    }

    function incrementDeposits(address _user, uint256 _amount) internal returns (bool) {
        uint256 newTotal = cumulativeDeposits[_user] + _amount;
        cumulativeDeposits[_user] = newTotal;
        emit DepositsIncremented(_user, _amount, newTotal);
        return true;
    }

    function incrementWithdrawals(address _user, uint256 _amount) internal returns (bool) {
        uint256 newTotal = cumulativeWithdrawals[_user] + _amount;
        cumulativeWithdrawals[_user] = newTotal;
        emit WithdrawalsIncremented(_user, _amount, newTotal);
        return true;
    }
}
