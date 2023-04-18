// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Nodes.sol";
import "../selectRoute/SelectPerpRoute.sol";
import "../interfaces/IGmx.sol";

contract Perpetual {
    using SafeERC20 for IERC20;

    address public immutable owner;
    Nodes private nodes;
    SelectPerpRoute private selectPerpRoute;
    address public immutable gmxContract;
    bytes32 private constant referralCode = bytes32(0);
    address private constant callbackTarget = 0x0000000000000000000000000000000000000000;
    address public immutable wftm;

    modifier onlyAllowed() {
        require(msg.sender == owner || msg.sender == address(nodes) || msg.sender == address(selectPerpRoute), 'You must be the owner.');
        _;
    }

    constructor(address owner_, address gmxContract_) {
        owner = owner_;
        gmxContract = gmxContract_;
        wftm = IGmx(gmxContract).weth();
    }

    /**
     * @notice Approve of a token
     * @param token Address of the token wanted to be approved
     * @param spender Address that is wanted to be approved to spend the token
     * @param amount Amount of the token that is wanted to be approved.
     */
    function _approve(address token, address spender, uint256 amount) private {
        IERC20(token).safeApprove(spender, 0);
        IERC20(token).safeApprove(spender, amount);
    }

    function setNodeContract(Nodes nodes_) public onlyAllowed {
        nodes = nodes_;
    }

    function setSelectLPRouteContract(SelectPerpRoute selectPerpRoute_) public onlyAllowed {
        selectPerpRoute = selectPerpRoute_;
    }

    function openPerpPosition(
        address[] memory path_,
        address indexToken_,
        uint256 amount_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 executionFee_,
        uint256 amountOutMin_
    ) external onlyAllowed returns (bytes32 data) {
        IWETH(wftm).withdraw(amount_);
        data = IGmx(gmxContract).createIncreasePositionETH{value: amount_}(
            path_,
            indexToken_,
            amountOutMin_,
            sizeDelta_,
            isLong_,
            acceptablePrice_,
            executionFee_,
            referralCode,
            callbackTarget
        );
    }

    function closePerpPosition(
        address[] memory path_,
        address indexToken_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 executionFee_,
        uint256 minOut_
    ) external onlyAllowed returns (bytes32 data, uint256 amount) {
        uint256 balanceBefore_ = address(this).balance;

        IWETH(wftm).withdraw(executionFee_);
        data = IGmx(gmxContract).createDecreasePosition{value: executionFee_}(
            path_,
            indexToken_,
            collateralDelta_,
            sizeDelta_,
            isLong_,
            address(this),
            acceptablePrice_,
            minOut_,
            executionFee_,
            true,
            callbackTarget
        );

        uint256 balanceAfter_ = address(this).balance;
        amount = balanceAfter_ - balanceBefore_;
        IWETH(wftm).deposit{value: amount}();
        IERC20(wftm).safeTransfer(address(nodes), amount);
    }

    receive() external payable {}
}