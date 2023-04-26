// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IFirstTypePerpetual {
    function openPerpPosition(bytes memory args_, uint256 amount_) external returns (bytes32 data, uint256 sizeDelta, uint256 acceptablePrice);
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
    ) external returns (bytes32 data, uint256 amount);

    function minExecutionFee() external returns(uint256);
}