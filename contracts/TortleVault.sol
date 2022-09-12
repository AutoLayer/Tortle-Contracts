// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import './interfaces/IStrategy.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import 'hardhat/console.sol';

error TortleVault__ContractAlreadyInitialized();
error TortleVault__InvalidAmount();
error TortleVault__VaultIsFull();

contract TortleVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public strategy;

    uint256 public depositFee;
    uint256 public constant PERCENT_DIVISOR = 10000;
    uint256 public tvlCap;

    bool public initialized = false;
    uint256 public immutable constructionTime;

    IERC20 public immutable token;

    mapping(address => uint256) public cumulativeDeposits;
    mapping(address => uint256) public cumulativeWithdrawals;

    event TvlCapUpdated(uint256 newTvlCap);

    event DepositsIncremented(address user, uint256 amount, uint256 total);
    event WithdrawalsIncremented(address user, uint256 amount, uint256 total);

    constructor(
        address _token,
        string memory _name,
        string memory _symbol,
        uint256 _depositFee,
        uint256 _tvlCap
    ) ERC20(string(_name), string(_symbol)) {
        token = IERC20(_token);
        constructionTime = block.timestamp;
        depositFee = _depositFee;
        tvlCap = _tvlCap;
    }

    function depositAll() external {
        deposit(msg.sender, token.balanceOf(msg.sender));
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
        return token.balanceOf(address(this)) + IStrategy(strategy).balanceOf();
    }

    function getPricePerFullShare() public view returns (uint256) {
        uint256 decimals = 10 ** ERC20(address(token)).decimals();
        return totalSupply() == 0 ? decimals : (balance() * decimals) / totalSupply();
    }
    
    function deposit(address _user, uint256 _amount) public nonReentrant returns (uint256 shares) {
        uint256 vaultBalStart = token.balanceOf(address(this));
        if (_amount == 0) revert TortleVault__InvalidAmount();
        uint256 _pool = vaultBalStart + IStrategy(strategy).balanceOf();
        if (_pool + _amount > tvlCap) revert TortleVault__VaultIsFull();

        token.safeTransferFrom(msg.sender, address(this), _amount);
        _amount = token.balanceOf(address(this)) - vaultBalStart;
        uint256 _amountAfterDeposit = (_amount * (PERCENT_DIVISOR - depositFee)) / PERCENT_DIVISOR;
        shares = _amountAfterDeposit;
        if (totalSupply() != 0) {
            shares = (_amountAfterDeposit * totalSupply()) / _pool;
        }
        _mint(msg.sender, shares);
        earn();
        incrementDeposits(_user, _amount);
    }

    function earn() public {
        token.safeTransfer(strategy, token.balanceOf(address(this)));
        IStrategy(strategy).deposit();
    }

    function withdraw(address _user, uint256 _shares) public nonReentrant returns (uint256 r) {
        if (_shares <= 0) revert TortleVault__InvalidAmount();
        uint256 tokenBalStart = token.balanceOf(address(this));
        r = ((IStrategy(strategy).balanceOf() + tokenBalStart) * _shares) / totalSupply();
        _burn(msg.sender, _shares);
        if (tokenBalStart < r) {
            uint256 _withdraw = r - tokenBalStart;
            IStrategy(strategy).withdraw(_withdraw);
            uint256 _diff = token.balanceOf(address(this)) - tokenBalStart;
            if (_diff < _withdraw) {
                r = tokenBalStart + _diff;
            }
        }
        token.safeTransfer(_user, r);
        incrementWithdrawals(_user, r);
    }

    function updateDepositFee(uint256 fee) public onlyOwner {
        depositFee = fee;
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
