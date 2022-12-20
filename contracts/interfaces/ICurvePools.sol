// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface ICurvePools {
    // Old Contract
    function add_liquidity(uint256[3] memory _amounts, uint256 _min_mint_amount) external;
    // New Contract
    function add_liquidity(uint256[3] memory _amounts, uint256 _min_mint_amount, bool _use_underlying) external returns(uint256);
}