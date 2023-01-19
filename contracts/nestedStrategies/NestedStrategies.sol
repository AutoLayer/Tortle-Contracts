// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IYearn.sol";
import "../interfaces/ICurvePools.sol";

contract NestedStrategies {
    using SafeERC20 for IERC20;
    mapping(address => mapping(address => uint256)) public sharesBalance;

    /**
     * @notice Approve of a token
     * @param token_ Address of the token wanted to be approved
     * @param spender_ Address that is wanted to be approved to spend the token
     * @param amount_ Amount of the token that is wanted to be approved.
     */
    function _approve(address token_, address spender_, uint256 amount_) internal {
        IERC20(token_).safeApprove(spender_, 0);
        IERC20(token_).safeApprove(spender_, amount_);
    }

    function _addLiquidity(address token_, uint256[3] memory amounts_, bool oldContract_) private returns (uint256 lpAmount) {
        if(oldContract_) {
            uint256 balanceBefore_ = IERC20(token_).balanceOf(address(this));
            ICurvePools(token_).add_liquidity(amounts_, 1);
            lpAmount = IERC20(token_).balanceOf(address(this)) - balanceBefore_;
        } else {
            lpAmount = ICurvePools(token_).add_liquidity(amounts_, 1, true);
        }
    }

    function deposit(address user_, address token_, address vaultAddress_, uint256 amount_) external returns (uint256 sharesAmount) {
        IERC20(token_).safeTransferFrom(msg.sender, address(this), amount_);
        _approve(token_, vaultAddress_, amount_);

        sharesAmount = IYearnVyper(vaultAddress_).deposit(amount_, msg.sender);

        sharesBalance[vaultAddress_][user_] += sharesAmount;
    }

    function withdraw(address user_, address tokenOut_, address vaultAddress_, uint256 sharesAmount_) external returns (uint256 amountTokenDesired) {
        IERC20(vaultAddress_).safeTransferFrom(msg.sender, address(this), sharesAmount_);
        _approve(vaultAddress_, vaultAddress_, sharesAmount_);

        sharesBalance[vaultAddress_][user_] -= sharesAmount_;

        (, bytes memory data) = vaultAddress_.call(abi.encodeWithSignature("withdraw(uint256)", sharesAmount_));
        amountTokenDesired = abi.decode(data, (uint256));

        IERC20(tokenOut_).transfer(msg.sender, amountTokenDesired);
    }
}