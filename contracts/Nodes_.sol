// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import "./lib/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract Nodes_ is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;
    address private FTM;
    address[] public routers;
    uint256 public constant minimumAmount = 1000;

    struct SplitStruct {
        address token;
        uint256 amount;
        address firstToken;
        address secondToken;
        uint256 percentageFirstToken;
        uint256 amountOutMinFirst;
        uint256 amountOutMinSecond;
    }

    constructor(address _owner, address[] memory _routers) {
        owner = _owner;
        routers = _routers;
        FTM = IUniswapV2Router02(_routers[0]).WETH();
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
     * @notice Function that divides the token you send into two tokens according to the percentage you select.
     * @param _splitStruct Struct: token, amount, firstToken, secondToken, percentageFirstToken, amountOutMinFirst, amountOutMinSecond.
     */
    function split(
        SplitStruct memory _splitStruct
    )
        public
        nonReentrant
        returns (uint256 amountOutToken1, uint256 amountOutToken2)
    {
        address _token = _splitStruct.token;
        uint256 _amount = _splitStruct.amount;
        address _firstToken = _splitStruct.firstToken;
        address _secondToken = _splitStruct.secondToken;
        uint256 _amountOutMinFirst = _splitStruct.amountOutMinFirst;
        uint256 _amountOutMinSecond = _splitStruct.amountOutMinSecond;

        IUniswapV2Router02 routerIn = getRouterOneToken(_token);
        IUniswapV2Router02 routerOutFirstToken = getRouterOneToken(_firstToken);
        IUniswapV2Router02 routerOutSecondToken = getRouterOneToken(_secondToken);

        uint256[] memory amountsOut;
        if(_token != FTM && (routerIn != routerOutFirstToken || routerIn != routerOutSecondToken)) {
            IERC20(_token).safeApprove(address(routerIn), _amount);

            address[] memory path = new address[](2);
            path[0] = _token;
            path[1] = FTM;

            amountsOut = routerIn.swapExactTokensForTokens(
                _amount,
                0,
                path,
                address(this),
                block.timestamp
            );

            _amount = amountsOut[amountsOut.length - 1];
            _token = FTM;
        }

        uint256 _firstTokenAmount = mulScale(
            _amount,
            _splitStruct.percentageFirstToken,
            10000
        ); // Amount of first token.
        uint256 _secondTokenAmount = _amount - _firstTokenAmount; // Amount of second token.

        if(routerOutFirstToken == routerOutSecondToken && address(routerOutFirstToken) != address(0) && address(routerOutSecondToken) != address(0)) {
            IERC20(_token).safeApprove(address(routerOutFirstToken), _amount);
        } else {
            if(address(routerOutFirstToken) != address(0)) {
                IERC20(_token).safeApprove(address(routerOutFirstToken), _firstTokenAmount);
            }
            if(address(routerOutSecondToken) != address(0)) {
                IERC20(_token).safeApprove(address(routerOutSecondToken), _secondTokenAmount);
            }
        }
        
        uint256 _amountOutToken1;
        uint256 _amountOutToken2;
        if (_token == FTM) {
            (_amountOutToken1, _amountOutToken2) = _splitFromFTM(
                _firstToken,
                _secondToken,
                _firstTokenAmount,
                _secondTokenAmount,
                _amountOutMinFirst,
                _amountOutMinSecond
            );
        } else if (_firstToken == FTM || _secondToken == FTM) {
            (_amountOutToken1, _amountOutToken2) = _splitToFTM(
                _token,
                _firstToken,
                _secondToken,
                _firstTokenAmount,
                _secondTokenAmount,
                _amountOutMinFirst,
                _amountOutMinSecond
            );
        } else {
            if (_firstToken != _token) {
                address[] memory pathFirstToken = new address[](3);
                pathFirstToken[0] = _token;
                pathFirstToken[1] = FTM;
                pathFirstToken[2] = _firstToken;

                amountsOut = routerOutFirstToken.swapExactTokensForTokens(
                    _firstTokenAmount,
                    _amountOutMinFirst,
                    pathFirstToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken1 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken1 = _firstTokenAmount;
                IERC20(_firstToken).safeTransfer(msg.sender, _firstTokenAmount);
            }

            if (_secondToken != _token) {
                address[] memory pathSecondToken = new address[](3);
                pathSecondToken[0] = _token;
                pathSecondToken[1] = FTM;
                pathSecondToken[2] = _secondToken;

                amountsOut = routerOutSecondToken.swapExactTokensForTokens(
                    _secondTokenAmount,
                    _amountOutMinSecond,
                    pathSecondToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken2 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken2 = _secondTokenAmount;
                IERC20(_secondToken).safeTransfer(msg.sender, _secondTokenAmount);
            }
        }

        return (_amountOutToken1, _amountOutToken2);
    }

    function _splitFromFTM(
        address _firstToken,
        address _secondToken,
        uint256 _firstTokenAmount,
        uint256 _secondTokenAmount,
        uint256 _amountOutMinFirst,
        uint256 _amountOutMinSecond
    ) private returns (uint256 amountOutToken1, uint256 amountOutToken2) {
        uint256[] memory amountsOut;

        uint256 _amountOutToken1;
        if (_firstToken != FTM) {
            IUniswapV2Router02 routerOutFirstToken = getRouterOneToken(_firstToken);

            address[] memory pathFirstToken = new address[](2);
            pathFirstToken[0] = FTM;
            pathFirstToken[1] = _firstToken;

            amountsOut = routerOutFirstToken.swapExactTokensForTokens(
                _firstTokenAmount,
                _amountOutMinFirst,
                pathFirstToken,
                msg.sender,
                block.timestamp
            );

            _amountOutToken1 = amountsOut[amountsOut.length - 1];
        } else {
            _amountOutToken1 = _firstTokenAmount;
            IERC20(_firstToken).safeTransfer(msg.sender, _firstTokenAmount);
        }

        uint256 _amountOutToken2;
        if (_secondToken != FTM) {
            IUniswapV2Router02 routerOutSecondToken = getRouterOneToken(_secondToken);

            address[] memory pathSecondToken = new address[](2);
            pathSecondToken[0] = FTM;
            pathSecondToken[1] = _secondToken;

            amountsOut = routerOutSecondToken.swapExactTokensForTokens(
                _secondTokenAmount,
                _amountOutMinSecond,
                pathSecondToken,
                address(msg.sender),
                block.timestamp
            );

            _amountOutToken2 = amountsOut[amountsOut.length - 1];
        } else {
            _amountOutToken2 = _secondTokenAmount;
            IERC20(_secondToken).safeTransfer(msg.sender, _secondTokenAmount);
        }

        return (_amountOutToken1, _amountOutToken2);
    }

    function _splitToFTM(
        address _token,
        address _firstToken,
        address _secondToken,
        uint256 _firstTokenAmount,
        uint256 _secondTokenAmount,
        uint256 _amountOutMinFirst,
        uint256 _amountOutMinSecond
    ) private returns (uint256 amountOutToken1, uint256 amountOutToken2) {
        IUniswapV2Router02 routerOutFirstToken;
        IUniswapV2Router02 routerOutSecondToken;

        uint256[] memory amountsOut;
        uint256 _amountOutToken1;
        uint256 _amountOutToken2;
        if (_firstToken == FTM) {
            if (_firstToken != _token) {
                routerOutFirstToken = getRouterOneToken(FTM);

                address[] memory pathFirstToken = new address[](2);
                pathFirstToken[0] = _token;
                pathFirstToken[1] = FTM;

                amountsOut = routerOutFirstToken.swapExactTokensForTokens(
                    _firstTokenAmount,
                    _amountOutMinFirst,
                    pathFirstToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken1 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken1 = _firstTokenAmount;
                IERC20(_firstToken).safeTransfer(msg.sender, _firstTokenAmount);
            }

            if (_secondToken != _token) {
                routerOutSecondToken = getRouterOneToken(_secondToken);

                address[] memory pathSecondToken;
                if(_secondToken == FTM) {
                    pathSecondToken = new address[](2);
                    pathSecondToken[0] = _token;
                    pathSecondToken[1] = FTM;
                } else {
                    pathSecondToken = new address[](3);
                    pathSecondToken[0] = _token;
                    pathSecondToken[1] = FTM;
                    pathSecondToken[2] = _secondToken;
                }

                amountsOut = routerOutSecondToken.swapExactTokensForTokens(
                    _secondTokenAmount,
                    _amountOutMinSecond,
                    pathSecondToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken2 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken2 = _secondTokenAmount;
                IERC20(_secondToken).safeTransfer(msg.sender, _secondTokenAmount);
            }
        } else if (_secondToken == FTM) {
            if (_firstToken != _token) {
                routerOutFirstToken = getRouterOneToken(_firstToken);

                address[] memory pathFirstToken;
                if(_firstToken == FTM) {
                    pathFirstToken = new address[](2);
                    pathFirstToken[0] = _token;
                    pathFirstToken[1] = FTM;
                } else {
                    pathFirstToken = new address[](3);
                    pathFirstToken[0] = _token;
                    pathFirstToken[1] = FTM;
                    pathFirstToken[2] = _firstToken;
                }

                amountsOut = routerOutFirstToken.swapExactTokensForTokens(
                    _firstTokenAmount,
                    _amountOutMinFirst,
                    pathFirstToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken1 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken1 = _firstTokenAmount;
                IERC20(_firstToken).safeTransfer(msg.sender, _firstTokenAmount);
            }

            if (_secondToken != _token) {
                routerOutSecondToken = getRouterOneToken(FTM);

                address[] memory pathSecondToken = new address[](2);
                pathSecondToken[0] = _token;
                pathSecondToken[1] = FTM;

                amountsOut = routerOutSecondToken.swapExactTokensForTokens(
                    _secondTokenAmount,
                    _amountOutMinSecond,
                    pathSecondToken,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOutToken2 = amountsOut[amountsOut.length - 1];
            } else {
                _amountOutToken2 = _secondTokenAmount;
                IERC20(_secondToken).safeTransfer(msg.sender, _secondTokenAmount);
            }
        }

        return (_amountOutToken1, _amountOutToken2);
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
    ) public nonReentrant returns (uint256 amountOut) {
        IUniswapV2Router02 routerIn = getRouterOneToken(_tokenIn);
        IUniswapV2Router02 routerOut = getRouterOneToken(_tokenOut);

        uint256[] memory amountsOut;
        if(_tokenIn != FTM && routerIn != routerOut) {
            IERC20(_tokenIn).safeApprove(address(routerIn), _amount);

            address[] memory path = new address[](2);
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
        
        IERC20(_tokenIn).safeApprove(address(routerOut), _amount);
        
        uint256 _amountOut;
        if(_tokenIn != _tokenOut) {
            if (_tokenIn == FTM || _tokenOut == FTM) {
                address[] memory path = new address[](2);
                path[0] = _tokenIn;
                path[1] = _tokenOut;

                amountsOut = routerOut.swapExactTokensForTokens(
                    _amount,
                    _amountOutMin,
                    path,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOut = amountsOut[amountsOut.length - 1];
            } else {
                address[] memory path = new address[](3);
                path[0] = _tokenIn;
                path[1] = FTM;
                path[2] = _tokenOut;

                amountsOut = routerOut.swapExactTokensForTokens(
                    _amount,
                    _amountOutMin,
                    path,
                    address(msg.sender),
                    block.timestamp
                );

                _amountOut = amountsOut[amountsOut.length - 1];
            }
        } else {
            _amountOut = _amount;
        }

        return _amountOut;
    }

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

        require(address(router) != address(0), "Pair doesn't exists.");
    }

    function getRouterOneToken(address _token) public view returns(IUniswapV2Router02 router) {
        address pair;
        for(uint8 i = 0; i < routers.length; i++) {
            if(_token == FTM){
                router = IUniswapV2Router02(routers[i]);
                break;
            } else {
                pair = IUniswapV2Factory(IUniswapV2Router02(routers[i]).factory()).getPair(_token, FTM);
            }
            if(pair != address(0)) {
                router = IUniswapV2Router02(routers[i]);
            }
        }

        require(address(router) != address(0), "Pair doesn't exists.");
    }

    receive() external payable {}
}
