// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/ReentrancyGuard.sol";
import "../interfaces/INodes.sol";
import "../interfaces/IFirstTypePerpetual.sol";
import "../interfaces/IGmx.sol";
import '../interfaces/IWETH.sol';
import "hardhat/console.sol";

contract FirstTypePerpetual is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address WFTMAddress;
    address public owner;
    address immutable mummyFinanceContract;
    address mummySender;
    address immutable routerContract;
    address public selectPerpRoute;
    address public nodes;

    mapping(address => uint256) public wftBalance;

    modifier onlyAllowed() {
        require(msg.sender == owner || msg.sender == selectPerpRoute, 'You must be the owner.');
        _;
    }

    constructor(address owner_, address mummyFinanceContract_, address routerContract_, address tokenIndex_) {
        owner = owner_;
        mummyFinanceContract = mummyFinanceContract_;
        routerContract = routerContract_;
        WFTMAddress = tokenIndex_;
    }

    function setNodes(address nodes_) public onlyAllowed {
        nodes = nodes_;
    }

    function setSelectPerpRoute(address selectPerpRoute_) public onlyAllowed {
        selectPerpRoute = selectPerpRoute_;
    }

    function _approve(address token_, address spender_, uint256 amount_) internal {
        IERC20(token_).safeApprove(spender_, 0);
        IERC20(token_).safeApprove(spender_, amount_);
    }

    function openPerpPosition(bytes memory args_, uint256 amount_) external onlyAllowed payable returns (bytes32 data, uint256 sizeDelta, uint256 acceptablePrice) {
        (address[] memory path_,
        address indexToken_,
        bool isLong_,,
        uint256 preSizeDelta_,
        uint256 indexTokenPrice_,,) = abi.decode(args_, (address[], address, bool, uint256, uint256, uint256, uint256, uint8));

        IFirstTypePerpetual(routerContract).approvePlugin(mummyFinanceContract);

        uint256 executionFee = IFirstTypePerpetual(mummyFinanceContract).minExecutionFee();
        uint256 depositAmount = amount_ - executionFee;

        acceptablePrice = indexTokenPrice_;
        sizeDelta = preSizeDelta_ * amount_ / 1e18;
        IWETH(path_[0]).withdraw(depositAmount);
        data = IGmx(mummyFinanceContract).createIncreasePositionETH{value: depositAmount}(path_, indexToken_, 0, sizeDelta, isLong_, acceptablePrice, executionFee, bytes32(0), address(0));
    }

    function closePerpPosition(
        address[] memory path_,
        address indexToken_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 amountOutMin_
    ) public onlyAllowed payable returns (bytes32 data) {

        uint256 fee = IFirstTypePerpetual(mummyFinanceContract).minExecutionFee();
        IWETH(path_[0]).withdraw(fee);

        (data) = IGmx(mummyFinanceContract).createDecreasePosition{value: fee}(path_, indexToken_, collateralDelta_, sizeDelta_, isLong_, address(this), acceptablePrice_, amountOutMin_, fee, false, address(0));
    }

    function executeClosePerpPosition(address token_, uint256 amount_) public onlyAllowed {
        IERC20(token_).safeTransfer(nodes, amount_);
    }

    receive() external payable {}
}