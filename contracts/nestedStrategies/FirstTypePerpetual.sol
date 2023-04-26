// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/ReentrancyGuard.sol";
import "../interfaces/IFirstTypePerpetual.sol";
import "../interfaces/IPerpetual.sol";
import "hardhat/console.sol";

contract FirstTypePerpetual is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public owner;
    address immutable mummyFinanceContract;
    address public selectPerpRoute;

    modifier onlyAllowed() {
        require(msg.sender == owner || msg.sender == selectPerpRoute, 'You must be the owner.');
        _;
    }

    constructor(address owner_, address mummyFinanceContract_) {
        owner = owner_;
        mummyFinanceContract = mummyFinanceContract_;
    }

    function setSelectPerpRoute(address selectPerpRoute_) public onlyAllowed {
        selectPerpRoute = selectPerpRoute_;
    }

    function _approve(address token_, address spender_, uint256 amount_) internal {
        IERC20(token_).safeApprove(spender_, 0);
        IERC20(token_).safeApprove(spender_, amount_);
    }

    function openPerpPosition(bytes memory args_, uint256 amount_) external onlyAllowed returns (bytes32 data, uint256 sizeDelta, uint256 acceptablePrice) {
        (address[] memory path_,
        address indexToken_,
        bool isLong_,,
        uint256 indexTokenPrice_,,,) = abi.decode(args_, (address[], address, bool, uint256, uint256, uint256, uint256, uint8));

        _approve(indexToken_, address(mummyFinanceContract), amount_);
        acceptablePrice = indexTokenPrice_;
        sizeDelta = acceptablePrice * amount_ / 1e18;
        uint256 fee = IFirstTypePerpetual(mummyFinanceContract).minExecutionFee();
        (bool success, bytes memory data_) = mummyFinanceContract.call{value: amount_}(abi.encodeWithSignature("createIncreasePositionETH(address[] memory _path, address _indexToken, uint256 _minOut, uint256 _sizeDelta, bool _isLong, uint256 _acceptablePrice,uint256 _executionFee, bytes32 _referralCode, address _callbackTarget", path_, indexToken_, 0, sizeDelta, isLong_, acceptablePrice, fee, bytes32(0), address(0)));
        require(success, 'Fail');
        data = bytes32(data_);
        // IPerpetual(mummyFinanceContract).createIncreasePositionETH{value: amount_}(path_, indexToken_, 0, sizeDelta, isLong_, acceptablePrice, fee, bytes32(0), address(0));
    }

    function closePerpPosition(
        address[] memory path_,
        address indexToken_,
        address wftm_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 executionFee_,
        uint256 amountOutMin_
    ) public returns (bytes32 data, uint256 amount) {
        // (data, amount) = IPerpetual(mummyFinanceContract).closePerpPosition(path_, indexToken_, collateralDelta_, sizeDelta_, isLong_, acceptablePrice_, executionFee_, amountOutMin_); // hay que lllamar a createDecreasePosition no a closePosition
    }
}