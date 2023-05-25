// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface INodes {
    function executeClosePosition(address user_, uint256 amount_) external;
}