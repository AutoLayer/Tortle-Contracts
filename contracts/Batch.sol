// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Nodes.sol";
import "./lib/AddressToUintIterableMap.sol";

contract Batch {
    address public owner;
    Nodes public nodes;
    Nodes.SplitStruct private splitStruct;
    uint256[] public auxStack;

    struct Function {
        string id;
        string functionName;
        address user;
        string[] arguments;
        bool hasNext;
    }

    event AddFundsForTokens(string id, address tokenInput, uint256 amount);
    event AddFundsForFTM(string id, uint256 amount);
    event Split(
        string id,
        address tokenInput,
        uint256 amountIn,
        uint256 amountOutToken1,
        uint256 amountOutToken2
    );
    event SwapTokens(
        string id,
        address tokenInput,
        uint256 amountIn,
        address tokenOutput,
        uint256 amountOut
    );
    event Liquidate(
        string id,
        IERC20[] tokensInput,
        uint256[] amountsIn,
        address tokenOutput,
        uint256 amountOut
    );
    event SendToWallet(string id, address tokenOutput, uint256 amountOut);
    event ComboTrigger(string id, uint256 amount);

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You must be the owner.");
        _;
    }

    function setNodeContract(Nodes _nodes) public onlyOwner {
        nodes = _nodes;
    }

    function batchFunctions(Function[] memory _functions) public onlyOwner {
        for (uint256 i = 0; i < _functions.length; i++) {
            string memory _id = _functions[i].id;
            string memory _functionName = _functions[i].functionName;
            address _user = _functions[i].user;
            string[] memory _arguments = _functions[i].arguments;
            bool _hasNext = _functions[i].hasNext;

            if (StringUtils.equal(_functionName, "addFundsForTokens")) {
                address _token = StringUtils.parseAddr(_arguments[0]);
                uint256 _amount = StringUtils.safeParseInt(_arguments[1]);

                uint256 amount = nodes.addFundsForTokens(
                    _user,
                    IERC20(_token),
                    _amount
                );
                if (_hasNext) {
                    auxStack.push(amount);
                }

                emit AddFundsForTokens(_id, _token, amount);
            } else if (StringUtils.equal(_functionName, "addFundsForFTM")) {
                uint256 _amount = StringUtils.safeParseInt(_arguments[0]);
                if (_hasNext) {
                    auxStack.push(_amount);
                }

                emit AddFundsForFTM(_id, _amount);
            } else if (StringUtils.equal(_functionName, "split")) {
                Nodes.SplitStruct memory _splitStruct = splitStruct;
                _splitStruct.user = _user;
                _splitStruct.token = StringUtils.parseAddr(_arguments[0]);
                _splitStruct.firstToken = StringUtils.parseAddr(_arguments[2]);
                _splitStruct.secondToken = StringUtils.parseAddr(_arguments[3]);
                _splitStruct.percentageFirstToken = StringUtils.safeParseInt(
                    _arguments[4]
                );
                _splitStruct.amountOutMinFirst = StringUtils.safeParseInt(
                    _arguments[5]
                );
                _splitStruct.amountOutMinSecond = StringUtils.safeParseInt(
                    _arguments[6]
                );
                string memory _firstTokenHasNext = _arguments[7];
                string memory _secondTokenHasNext = _arguments[8];

                if (auxStack.length > 0) {
                    _splitStruct.amount = auxStack[auxStack.length - 1];
                    auxStack.pop();
                } else {
                    _splitStruct.amount = StringUtils.safeParseInt(
                        _arguments[1]
                    );
                }

                (uint256 amountOutToken1, uint256 amountOutToken2) = nodes
                    .split(_splitStruct);

                if (StringUtils.equal(_firstTokenHasNext, "y")) {
                    auxStack.push(amountOutToken1);
                }
                if (StringUtils.equal(_secondTokenHasNext, "y")) {
                    auxStack.push(amountOutToken2);
                }

                emit Split(
                    _id,
                    _splitStruct.token,
                    _splitStruct.amount,
                    amountOutToken1,
                    amountOutToken2
                );
            } else if (StringUtils.equal(_functionName, "swapTokens")) {
                address _token = StringUtils.parseAddr(_arguments[0]);
                uint256 _amount;
                address _newToken = StringUtils.parseAddr(_arguments[2]);
                uint256 _amountOutMin = StringUtils.safeParseInt(_arguments[3]);

                if (auxStack.length > 0) {
                    _amount = auxStack[auxStack.length - 1];
                    auxStack.pop();
                } else {
                    _amount = StringUtils.safeParseInt(_arguments[1]);
                }

                uint256 amountOut = nodes.swapTokens(
                    _user,
                    IERC20(_token),
                    _amount,
                    _newToken,
                    _amountOutMin
                );
                if (_hasNext) {
                    auxStack.push(amountOut);
                }

                emit SwapTokens(_id, _token, _amount, _newToken, amountOut);
            } else if (StringUtils.equal(_functionName, "liquidate")) {
                uint256 _tokenArguments = (_arguments.length - 1) / 2;

                IERC20[] memory _tokens = new IERC20[](_tokenArguments);
                for (uint256 x = 0; x < _tokenArguments; x++) {
                    address _token = StringUtils.parseAddr(_arguments[x]);

                    _tokens[x] = IERC20(_token);
                }

                uint256[] memory _amounts = new uint256[](_tokenArguments);
                uint256 y;
                for (
                    uint256 x = _tokenArguments;
                    x < _arguments.length - 1;
                    x++
                ) {
                    uint256 _amount;
                    if (auxStack.length > 0) {
                        _amount = auxStack[auxStack.length - 1];
                        auxStack.pop();
                    } else {
                        _amount = StringUtils.safeParseInt(_arguments[x]);
                    }

                    _amounts[y] = _amount;
                    y++;
                }

                address _tokenOutput = StringUtils.parseAddr(
                    _arguments[_arguments.length - 1]
                );

                uint256 amountOut = nodes.liquidate(
                    _user,
                    _tokens,
                    _amounts,
                    _tokenOutput
                );

                emit Liquidate(_id, _tokens, _amounts, _tokenOutput, amountOut);
            } else if (StringUtils.equal(_functionName, "sendToWallet")) {
                address _token = StringUtils.parseAddr(_arguments[0]);
                uint256 _amount;

                if (auxStack.length > 0) {
                    _amount = auxStack[auxStack.length - 1];
                    auxStack.pop();
                } else {
                    _amount = StringUtils.safeParseInt(_arguments[1]);
                }

                uint256 amount = nodes.sendToWallet(
                    _user,
                    IERC20(_token),
                    _amount
                );

                emit SendToWallet(_id, _token, amount);
            } else if (StringUtils.equal(_functionName, "depositOnLp")) {
                nodes.depositOnLp(
                    _user,
                    StringUtils.parseAddr(_arguments[0]),
                    StringUtils.parseAddr(_arguments[1]),
                    StringUtils.parseAddr(_arguments[2]),
                    StringUtils.safeParseInt(_arguments[3]),
                    StringUtils.safeParseInt(_arguments[4])
                );
            } else if (StringUtils.equal(_functionName, "depositOnFarm")) {
                nodes.depositOnFarm(_user, _arguments);
            } else {
                revert();
            }
        }

        if (auxStack.length > 0) {
            deleteAuxStack();
        }
    }

    function deleteAuxStack() private {
        for (uint8 i = 1; i <= auxStack.length; i++) {
            auxStack.pop();
        }
    }

    receive() external payable {}
}
