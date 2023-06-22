// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IFirstTypePerpetual {
    function openPerpPosition(bytes memory args_, uint256 amount_) external payable returns (uint256 sizeDelta, uint256 acceptablePrice);
    function closePerpPosition(
        /*address user_,*/
        address[] memory path_,
        address indexToken_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 amountOutMin_
    ) external payable returns (bytes32 data);

    function executeClosePerpPosition(address token_, uint256 amount_) external;

    function approvePlugin(address _plugin) external;

    function minExecutionFee() external returns(uint256);
}