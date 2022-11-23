// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import "../lib/ReentrancyGuard.sol";
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import "../Nodes.sol";
import "../interfaces/ISwapsUni.sol";

error FarmsUni_WithdrawLpAndSwapError();

contract FarmsUni is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable owner;
    Nodes private nodes;

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(nodes), 'You must be the owner.');
        _;
    }

    constructor(address owner_) {
        owner = owner_;
    }

    /**
    * @notice Function used to add liquidity
    * @param router_ Router that will perform the addliquidity.
    * @param token0_ Address of the first token that is going to be added.
    * @param token1_ Address of the second token that is going to be added.
    * @param amount0_ Amount of token0.
    * @param amount1_ Amount of token1.
    * @param amountOutMin0_ Minimum amount of token0.
    * @param amountOutMin0_ Minimum amount of token1.
    */
    function addLiquidity(
        IUniswapV2Router02 router_,
        address token0_,
        address token1_,
        uint256 amount0_,
        uint256 amount1_,
        uint256 amountOutMin0_,
        uint256 amountOutMin1_
    ) public onlyOwner returns (uint256 amount0f, uint256 amount1f, uint256 lpRes) {
        IERC20(token0_).safeTransferFrom(msg.sender, address(this), amount0_);
        IERC20(token1_).safeTransferFrom(msg.sender, address(this), amount1_);
        _approve(token0_, address(router_), amount0_);
        _approve(token1_, address(router_), amount1_);
        (amount0f, amount1f, lpRes) = router_.addLiquidity(token0_, token1_, amount0_, amount1_, amountOutMin0_, amountOutMin1_, address(msg.sender), block.timestamp);
    }

    /**
     * @notice Function used to withdraw and swap a token
     * @param swapsUni_ Address of SwapsUni contract.
     * @param lpToken_ Address of the lpToken.
     * @param tokens_ Array of addresses.
     * @param amountOutMin_ Minimum amount you want to use.
     * @param amountLp_ Amount of LpTokens wanted to be executed.
     */
    function withdrawLpAndSwap(
        address swapsUni_,
        address lpToken_,
        address[] memory tokens_,
        uint256 amountOutMin_,
        uint256 amountLp_
    ) public onlyOwner returns (uint256 amountTokenDesired) {
        IUniswapV2Pair lp = IUniswapV2Pair(lpToken_);
        if ((lp.token0() != tokens_[0] || lp.token1() != tokens_[1]) && (lp.token0() != tokens_[1] || lp.token1() != tokens_[0])) revert FarmsUni_WithdrawLpAndSwapError();
        if (tokens_[3] != tokens_[0] && tokens_[3] != tokens_[1]) revert FarmsUni_WithdrawLpAndSwapError();
        IERC20(lpToken_).safeTransferFrom(msg.sender, address(this), amountLp_);
        IERC20(lpToken_).safeTransfer(lpToken_, amountLp_);
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(lpToken_).burn(address(this));

        uint256 swapAmount;
        address swapToken;

        if (tokens_[1] == tokens_[3]) {
            swapToken = tokens_[0];
            swapAmount = amount0;
            amountTokenDesired += amount1;
        } else {
            swapToken = tokens_[1];
            swapAmount = amount1;
            amountTokenDesired += amount0;
        }
        
        _approve(swapToken, swapsUni_, swapAmount);
        amountTokenDesired += ISwapsUni(swapsUni_).swapTokens(swapToken, swapAmount, tokens_[3], amountOutMin_);
        IERC20(tokens_[3]).safeTransfer(msg.sender, amountTokenDesired);
    }

    /**
     * @notice Approve of a token
     * @param token Address of the token wanted to be approved
     * @param spender Address that is wanted to be approved to spend the token
     * @param amount Amount of the token that is wanted to be approved.
     */
    function _approve(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).safeApprove(spender, 0);
        IERC20(token).safeApprove(spender, amount);
    }

    function setNodeContract(Nodes nodes_) public onlyOwner {
        nodes = nodes_;
    }

    receive() external payable {}
}