// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import "./lib/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';

error Nodes__PairDoesNotExist();
error Nodes__InsufficientReserve();

contract Nodes_ is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable owner;
    address private immutable FTM;
    address private immutable USDC;
    address[] public routers;
    uint256 public constant minimumAmount = 1000;

    constructor(address _owner, address _usdc, address[] memory _routers) {
        owner = _owner;
        routers = _routers;
        FTM = IUniswapV2Router02(_routers[0]).WETH();
        USDC = _usdc;
    }

    /**
     * @notice Calculate the percentage of a number.
     * @param x Number.
     * @param y Percentage of number.
     * @param scale Division.
     */
    function mulScale(
        uint256 x,
        uint256 y,
        uint128 scale
    ) internal pure returns (uint256) {
        uint256 a = x / scale;
        uint256 b = x % scale;
        uint256 c = y / scale;
        uint256 d = y % scale;

        return a * c * scale + a * d + b * c + (b * d) / scale;
    }

    /**
     * @notice Function that allows to send X amount of tokens and returns the token you want.
     * @param _tokenIn Address of the token to be swapped.
     * @param _amount Amount of Tokens to be swapped.
     * @param _tokenOut Contract of the token you wish to receive.
     * @param _amountOutMin Minimum amount you wish to receive.
     */
    function swapTokens(
        address _tokenIn,
        uint256 _amount,
        address _tokenOut,
        uint256 _amountOutMin
    ) public nonReentrant returns (uint256 _amountOut) {
        IUniswapV2Router02 routerIn = getRouterOneToken(_tokenIn);
        IUniswapV2Router02 routerOut = getRouterOneToken(_tokenOut);

        address[] memory path;
        uint256[] memory amountsOut;

        if(_tokenIn != FTM && routerIn != routerOut) {
            IERC20(_tokenIn).safeApprove(address(routerIn), _amount);

            path = new address[](2);
            path[0] = _tokenIn;
            path[1] = FTM;

            amountsOut = routerIn.swapExactTokensForTokens(
                _amount,
                _amountOutMin,
                path,
                address(this),
                block.timestamp
            );

            _amount = amountsOut[amountsOut.length - 1];
            _tokenIn = FTM;
        }

        IERC20(_tokenIn).safeApprove(address(routerOut), 0);
        IERC20(_tokenIn).safeApprove(address(routerOut), _amount);

        if(_tokenIn != _tokenOut) {
            address tokenInPool_ = _getTokenPool(_amount, _tokenIn, routerOut);
            address tokenOutPool_ = _getTokenPool(_amount, _tokenOut, routerOut);
            if (_tokenIn == tokenOutPool_ || _tokenOut == tokenInPool_) {
                path = new address[](2);
                path[0] = _tokenIn;
                path[1] = _tokenOut;
            } else if(tokenInPool_ != tokenOutPool_) {
                path = new address[](4);
                path[0] = _tokenIn;
                path[1] = tokenInPool_;
                path[2] = tokenOutPool_;
                path[3] = _tokenOut;
            } else {
                path = new address[](3);
                path[0] = _tokenIn;
                path[1] = tokenInPool_;
                path[2] = _tokenOut;
            }
            
            amountsOut = routerOut.swapExactTokensForTokens(
                _amount,
                _amountOutMin,
                path,
                address(msg.sender),
                block.timestamp
            );

            _amountOut = amountsOut[amountsOut.length - 1];
        } else {
            _amountOut = _amount;
            IERC20(_tokenIn).safeTransfer(msg.sender, _amountOut);
        }
    }

    /**
    * @notice Function used to, given a token, get wich pool has more liquidity (FTM or UDSC)
    * @param _amount Amount of input tokens
    * @param _token  Address of input token
    * @param _router Router used to get pair tokens information
    */
    function _getTokenPool(uint256 _amount, address _token, IUniswapV2Router02 _router) internal view returns(address tokenPool) {
        address wftmLpToken = IUniswapV2Factory(IUniswapV2Router02(_router).factory()).getPair(FTM, _token);
        address usdcLpToken = IUniswapV2Factory(IUniswapV2Router02(_router).factory()).getPair(USDC, _token);
        
        uint256 _totalAmountOutWftm;
        uint256 _totalAmountOutUsdc;
        if(wftmLpToken != address(0)) {
            (uint256 reserveWftmA, uint256 reserveWftmB, ) = IUniswapV2Pair(wftmLpToken).getReserves();
            _totalAmountOutWftm = IUniswapV2Router02(_router).quote(_amount, reserveWftmA, reserveWftmB);
        }
        if(usdcLpToken != address(0)) {
            (uint256 reserveUsdcA, uint256 reserveUsdcB, ) = IUniswapV2Pair(usdcLpToken).getReserves();
            _totalAmountOutUsdc = IUniswapV2Router02(_router).quote(_amount, reserveUsdcA, reserveUsdcB);
        }

        if(_totalAmountOutWftm >= _totalAmountOutUsdc) {
            if (_totalAmountOutWftm < minimumAmount) revert Nodes__InsufficientReserve();
            tokenPool = FTM;
        } else {
            if (_totalAmountOutUsdc < minimumAmount) revert Nodes__InsufficientReserve();
            tokenPool = USDC;
        }
    }

    /**
    * @notice Function used to get a router of 2 tokens. It tries to get its main router
    * @param _token0 Address of the first token
    * @param _token1 Address of the second token
    */
    function getRouter(address _token0, address _token1) public view returns(IUniswapV2Router02 router) {
        address pairToken0;
        address pairToken1;
        for(uint8 i = 0; i < routers.length; i++) {
            if(_token0 == FTM || _token1 == FTM){
                router = IUniswapV2Router02(routers[i]);
                break;
            } else {
                pairToken0 = IUniswapV2Factory(IUniswapV2Router02(routers[i]).factory()).getPair(_token0, FTM);
                if(pairToken0 != address(0)) {
                    pairToken1 = IUniswapV2Factory(IUniswapV2Router02(routers[i]).factory()).getPair(_token1, FTM);
                }
            }
            if(pairToken1 != address(0)) {
                router = IUniswapV2Router02(routers[i]);
            }
        }

        if (address(router) == address(0)) revert Nodes__PairDoesNotExist();
    }

    /**
    * @notice Function used to get the router of a tokens. It tries to get its main router.
    * @param _token Address of the token
    */
    function getRouterOneToken(address _token) public view returns(IUniswapV2Router02 router) {
        address pair;
        for(uint8 i = 0; i < routers.length; i++) {
            if(_token == FTM){
                router = IUniswapV2Router02(routers[i]);
                break;
            } else {
                pair = IUniswapV2Factory(IUniswapV2Router02(routers[i]).factory()).getPair(_token, FTM);
                if(pair == address(0)) {
                    pair = IUniswapV2Factory(IUniswapV2Router02(routers[i]).factory()).getPair(_token, USDC);
                }
            }
            if(pair != address(0)) {
                router = IUniswapV2Router02(routers[i]);
            }
        }

        if (address(router) == address(0)) revert Nodes__PairDoesNotExist();
    }

    receive() external payable {}
}
