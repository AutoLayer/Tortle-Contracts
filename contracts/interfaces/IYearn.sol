// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IYearnVyper {
    function deposit(uint256 _amount, address recipient) external returns(uint256);
    function withdraw(uint256 maxShares) external returns(uint256);
    function balanceOf(address user) external view returns(uint256);
}