// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IMasterChef {
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    struct PoolInfo {
        uint128 accBooPerShare;
        uint64 lastRewardTime;
        uint64 allocPoint;
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

interface IMasterChefV2 {
    function deposit(uint256 _pid, uint256 _amount, address _to) external;
    function withdraw(uint256 _pid, uint256 _amount, address _to) external;
    function emergencyWithdraw(uint256 _pid, address _to) external;
    function harvest(uint256 _pid, address _to) external;
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external;
}

interface IMiniChef {
    function pendingSushi(uint256 _pid, address _user) external view returns (uint256);
}