// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IMasterChef {
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. BOO to distribute per second.
        uint256 lastRewardBlock;  // Last block number that SUSHI distribution occurs.
        uint256 accBooPerShare; // Accumulated BOO per share, times 1e12. See below.
    }

    function poolInfo(uint256 pid) external view returns (IMasterChef.PoolInfo memory);
    function userInfo(uint256, address) external view returns (uint256 amount, uint256 rewardDebt);
    function dev(address _devaddr) external;

    function devaddr() external view returns (address);
    function emergencyWithdraw(uint256 _pid) external;
    function getMultiplier(uint256 _from, uint256 _to) external view returns (uint256);
    function massUpdatePools() external;
    function maxBooPerSecond() external view returns (uint256);
    function owner() external view returns (address);
    function pendingBOO(uint256 _pid, address _user) external view returns (uint256);
    function totalAllocPoint() external view returns (uint256);
    function booPerSecond() external view returns (uint256);
    function deposit(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
}