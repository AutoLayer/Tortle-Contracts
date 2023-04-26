// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IPerpetual {
    function createIncreasePositionETH(
        address[] memory path_,
        address indexToken_,
        uint256 minOut_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 executionFee_,
        bytes32 referralCode_,
        address callbackTarget_
    ) external payable returns (bytes32);

    function closePerpPosition(
        address[] memory path_,
        address indexToken_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 executionFee_,
        uint256 minOut_
    ) external returns (bytes32 data, uint256 amount);
}