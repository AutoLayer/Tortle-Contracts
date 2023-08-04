// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStrategy {
    //deposits all funds into the farm
    function deposit() external;

    //vault only - withdraws funds from the strategy
    function withdraw(address user_, uint256[2] memory rewardsAmount_, uint256 lpAmount_) external;

    //claims farmed tokens, distributes fees, and sells tokens to re-add to the LP & farm
    function harvest() external;

   //calculates the amount of rewards per farm node
    function getRewardsPerFarmNode(uint256 shares_) external view returns (uint256[2] memory rewardsAmount);

    //returns the balance of all tokens managed by the strategy
    function balanceOf() external view returns (uint256);

    //returns the approx amount of profit from harvesting plus fee returned to harvest caller.
    function estimateHarvest()
        external
        view
        returns (uint256 profit, uint256 callFeeToUser);

    //withdraws all tokens and sends them back to the vault
    function retireStrat() external;

    //pauses deposits, resets allowances, and withdraws all funds from farm
    function panic() external;

    //pauses deposits and resets allowances
    function pause() external;

    //unpauses deposits and maxes out allowances again
    function unpause() external;
}
