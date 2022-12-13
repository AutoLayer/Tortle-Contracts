// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import "./lib/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IBeets.sol";

contract DepositsBeets is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable owner;
    address public immutable beets;

    constructor(address owner_, address beets_) {
        owner = owner_;
        beets = beets_;
    }

    function getBptAddress(bytes32 poolId_) public view returns(address bptAddress) {
        (bptAddress, ) = IBeets(beets).getPool(poolId_); 
    }

    function tokensToAssets(address[] memory tokens_) internal pure returns(IAsset[] memory assets) {
        assets = new IAsset[](tokens_.length);
        for (uint8 i = 0; i < tokens_.length; i++) {
            assets[i] = IAsset(tokens_[i]);
        }
    }

    function joinPool(bytes32 poolId_, address[] memory tokens_, uint256[] memory amountsIn_) public payable returns(address bptAddress, uint256 bptAmount_) {
        IERC20(tokens_[0]).safeTransferFrom(msg.sender, address(this), amountsIn_[0]);
        IERC20(tokens_[0]).safeApprove(beets, amountsIn_[0]);

        IAsset[] memory assets_ = tokensToAssets(tokens_);
        bytes memory userDataEncoded_ = abi.encode(1, amountsIn_);

        JoinPoolRequest memory request_;
        request_.assets = assets_;
        request_.maxAmountsIn = amountsIn_;
        request_.userData = userDataEncoded_;
        request_.fromInternalBalance = false;

        bptAddress = getBptAddress(poolId_); 
        uint256 bptAmountBeforeDeposit_ = IERC20(bptAddress).balanceOf(msg.sender);

        IBeets(beets).joinPool(poolId_, address(this), msg.sender, request_);

        bptAmount_ = IERC20(bptAddress).balanceOf(msg.sender) - bptAmountBeforeDeposit_;
    }

    function getUserDataExit(uint256 bptAmount_) private pure returns(bytes memory userDataEncoded) {
        userDataEncoded = abi.encode(0, bptAmount_, 0);
    }

    function exitPool(bytes32 poolId_, address[] memory tokens_, uint256[] memory minAmountsOut_, uint256 bptAmount_) public returns(uint256 amountTokenDesired) {
        IERC20(tokens_[0]).safeTransferFrom(msg.sender, address(this), bptAmount_);
        IERC20(tokens_[0]).safeApprove(beets, bptAmount_);

        IAsset[] memory assets_ = tokensToAssets(tokens_);        
        bytes memory userDataEncoded_ = getUserDataExit(bptAmount_);

        ExitPoolRequest memory request_;
        request_.assets = assets_;
        request_.minAmountsOut = minAmountsOut_;
        request_.userData = userDataEncoded_;
        request_.toInternalBalance = false;

        uint256 tokenAmountBefore_ = IERC20(address(tokens_[0])).balanceOf(msg.sender);

        IBeets(beets).exitPool(poolId_, address(this), payable(msg.sender), request_);
    
        amountTokenDesired = IERC20(tokens_[0]).balanceOf(msg.sender) - tokenAmountBefore_;
    }
}