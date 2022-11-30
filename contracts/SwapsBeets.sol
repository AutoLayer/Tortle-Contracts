// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./lib/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IBeets.sol";

contract SwapsBeets is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable owner;
    address public immutable beets;
    address public immutable FTM;

    constructor(address owner_, address beets_, address ftm_) {
        owner = owner_;
        beets = beets_;
        FTM = ftm_;
    }

    /**
     * @notice Function that allows to send X amount of tokens and returns the token you want.
     * @param tokens_ Array of tokens to be swapped.
     * @param batchSwapStep_ Array of structs required by beets provider.
     */
    function swapTokens(
        IAsset[] memory tokens_,
        BatchSwapStep[] memory batchSwapStep_
    ) public nonReentrant returns (uint256 amountOut) {
        address tokenIn_ = address(tokens_[0]);

        IERC20(tokenIn_).safeTransferFrom(msg.sender, address(this), batchSwapStep_[0].amount);
        IERC20(tokenIn_).safeApprove(beets, 0);
        IERC20(tokenIn_).safeApprove(beets, batchSwapStep_[0].amount);

        FundManagement memory fundManagement_;
        fundManagement_.sender = address(this);
        fundManagement_.fromInternalBalance = false;
        fundManagement_.recipient = payable(msg.sender);
        fundManagement_.toInternalBalance = false;

        int256[] memory limits_ = IBeets(beets).queryBatchSwap(SwapKind.GIVEN_IN, batchSwapStep_, tokens_, fundManagement_);

        int256[] memory amountsOut_ = IBeets(beets).batchSwap(SwapKind.GIVEN_IN, batchSwapStep_, tokens_, fundManagement_, limits_, block.timestamp);
        amountOut = uint256(amountsOut_[amountsOut_.length - 1] * -1);
    }
}