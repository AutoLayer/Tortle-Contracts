// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/lib/contracts/libraries/Babylonian.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/ITortleVault.sol";

error TortleUniV2Zap__InputAmountTooLow();
error TortleUniV2Zap__TokenIsNotPresentInLiquidityPar();
error TortleUniV2Zap__RouterInsuficientAAmount();
error TortleUniV2Zap__RouterInsuficientBAmount();
error TortleUniV2Zap__IncompatibleLiquidityPairFactory();
error TortleUniV2Zap__LiquidityPairReservesTooLow();
error TortleUniV2Zap__ETHTransferFailed();

contract TortleUniV2Zap {
    using LowGasSafeMath for uint256;
    using SafeERC20 for IERC20;
    using SafeERC20 for ITortleVault;

    IUniswapV2Router02 public immutable router;
    address public immutable WETH;
    uint256 public constant minimumAmount = 1000;

    constructor(address _router, address _WETH) {
        // Safety checks to ensure WETH token address
        IWETH(_WETH).deposit{value: 0}();
        IWETH(_WETH).withdraw(0);

        router = IUniswapV2Router02(_router);
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH);
    }

    function beefInETH(address tortleVault, uint256 tokenAmountOutMin)
        external
        payable
    {
        if (msg.value < minimumAmount) revert TortleUniV2Zap__InputAmountTooLow();
        IWETH(WETH).deposit{value: msg.value}();
        _swapAndStake(tortleVault, tokenAmountOutMin, WETH);
    }

    function beefIn(
        address tortleVault,
        uint256 tokenAmountOutMin,
        address tokenIn,
        uint256 tokenInAmount
    ) external {
        if (tokenInAmount < minimumAmount) revert TortleUniV2Zap__InputAmountTooLow();
        IERC20(tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            tokenInAmount
        );
        _swapAndStake(tortleVault, tokenAmountOutMin, tokenIn);
    }

    function beefOut(address tortleVault, uint256 withdrawAmount) external {
        (ITortleVault vault, IUniswapV2Pair pair) = _getVaultPair(tortleVault);

        IERC20(tortleVault).safeTransferFrom(
            msg.sender,
            address(this),
            withdrawAmount
        );
        vault.withdraw(msg.sender, withdrawAmount);

        if (pair.token0() != WETH && pair.token1() != WETH) {
            return _removeLiquidity(address(pair), msg.sender);
        }

        _removeLiquidity(address(pair), address(this));

        address[] memory tokens = new address[](2);
        tokens[0] = pair.token0();
        tokens[1] = pair.token1();

        _returnAssets(tokens);
    }

    function beefOutAndSwap(
        address tortleVault,
        uint256 withdrawAmount,
        address desiredToken,
        uint256 desiredTokenOutMin
    ) external {
        (ITortleVault vault, IUniswapV2Pair pair) = _getVaultPair(tortleVault);
        address token0 = pair.token0();
        address token1 = pair.token1();
        if (token0 != desiredToken && token1 != desiredToken) revert TortleUniV2Zap__TokenIsNotPresentInLiquidityPar();
       
        vault.safeTransferFrom(msg.sender, address(this), withdrawAmount);
        vault.withdraw(msg.sender, withdrawAmount);
        _removeLiquidity(address(pair), address(this));

        address swapToken = token1 == desiredToken ? token0 : token1;
        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = desiredToken;

        _approveTokenIfNeeded(path[0], address(router));
        router.swapExactTokensForTokens(
            IERC20(swapToken).balanceOf(address(this)),
            desiredTokenOutMin,
            path,
            address(this),
            block.timestamp
        );

        _returnAssets(path);
    }

    function _removeLiquidity(address pair, address to) private {
        IERC20(pair).safeTransfer(pair, IERC20(pair).balanceOf(address(this)));
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pair).burn(to);

        if (amount0 < minimumAmount) revert TortleUniV2Zap__RouterInsuficientAAmount();
        if (amount1 < minimumAmount) revert TortleUniV2Zap__RouterInsuficientBAmount();
    }

    function _getVaultPair(address tortleVault)
        private
        view
        returns (ITortleVault vault, IUniswapV2Pair pair)
    {
        vault = ITortleVault(tortleVault);
        pair = IUniswapV2Pair(vault.token());
        if (pair.factory() != router.factory()) revert TortleUniV2Zap__IncompatibleLiquidityPairFactory();
    }

    function _swapAndStake(
        address tortleVault,
        uint256 tokenAmountOutMin,
        address tokenIn
    ) private {
        (ITortleVault vault, IUniswapV2Pair pair) = _getVaultPair(tortleVault);

        (uint256 reserveA, uint256 reserveB, ) = pair.getReserves();
        if (reserveA < minimumAmount || reserveB < minimumAmount) revert TortleUniV2Zap__LiquidityPairReservesTooLow();

        bool isInputA = pair.token0() == tokenIn;
        if (!isInputA && pair.token1() != tokenIn) revert TortleUniV2Zap__TokenIsNotPresentInLiquidityPar();

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = isInputA ? pair.token1() : pair.token0();

        uint256 fullInvestment = IERC20(tokenIn).balanceOf(address(this));
        uint256 swapAmountIn;
        if (isInputA) {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveA, reserveB);
        } else {
            swapAmountIn = _getSwapAmount(fullInvestment, reserveB, reserveA);
        }

        _approveTokenIfNeeded(path[0], address(router));
        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            swapAmountIn,
            tokenAmountOutMin,
            path,
            address(this),
            block.timestamp
        );
        _approveTokenIfNeeded(path[1], address(router));
        (, , uint256 amountLiquidity) = router.addLiquidity(
            path[0],
            path[1],
            fullInvestment.sub(swapedAmounts[0]),
            swapedAmounts[1],
            1,
            1,
            address(this),
            block.timestamp
        );
        _approveTokenIfNeeded(address(pair), address(vault));
        vault.deposit(msg.sender, amountLiquidity);

        vault.safeTransfer(msg.sender, vault.balanceOf(address(this)));
        _returnAssets(path);
    }

    function _returnAssets(address[] memory tokens) private {
        uint256 balance;
        for (uint256 i; i < tokens.length; i++) {
            balance = IERC20(tokens[i]).balanceOf(address(this));
            if (balance > 0) {
                if (tokens[i] == WETH) {
                    IWETH(WETH).withdraw(balance);
                    (bool success, ) = msg.sender.call{value: balance}(
                        new bytes(0)
                    );
                    if (!success) revert TortleUniV2Zap__ETHTransferFailed();
                } else {
                    IERC20(tokens[i]).safeTransfer(msg.sender, balance);
                }
            }
        }
    }

    function _getSwapAmount(
        uint256 investmentA,
        uint256 reserveA,
        uint256 reserveB
    ) private view returns (uint256 swapAmount) {
        uint256 halfInvestment = investmentA / 2;
        uint256 nominator = router.getAmountOut(
            halfInvestment,
            reserveA,
            reserveB
        );
        uint256 denominator = router.quote(
            halfInvestment,
            reserveA.add(halfInvestment),
            reserveB.sub(nominator)
        );
        swapAmount = investmentA.sub(
            Babylonian.sqrt(
                (halfInvestment * halfInvestment * nominator) / denominator
            )
        );
    }

    function estimateSwap(
        address tortleVault,
        address tokenIn,
        uint256 fullInvestmentIn
    )
        public
        view
        returns (
            uint256 swapAmountIn,
            uint256 swapAmountOut,
            address swapTokenOut
        )
    {
        (, IUniswapV2Pair pair) = _getVaultPair(tortleVault);

        bool isInputA = pair.token0() == tokenIn;
        if (!isInputA && pair.token1() != tokenIn) revert TortleUniV2Zap__TokenIsNotPresentInLiquidityPar();

        (uint256 reserveA, uint256 reserveB, ) = pair.getReserves();
        (reserveA, reserveB) = isInputA
            ? (reserveA, reserveB)
            : (reserveB, reserveA);

        swapAmountIn = _getSwapAmount(fullInvestmentIn, reserveA, reserveB);
        swapAmountOut = router.getAmountOut(swapAmountIn, reserveA, reserveB);
        swapTokenOut = isInputA ? pair.token1() : pair.token0();
    }

    function _approveTokenIfNeeded(address token, address spender) private {
        if (IERC20(token).allowance(address(this), spender) == 0) {
            IERC20(token).safeApprove(spender, type(uint256).max);
        }
    }
}
