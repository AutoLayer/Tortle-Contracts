// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './Nodes.sol';
import './lib/AddressToUintIterableMap.sol';
import './interfaces/IBeets.sol';

contract Batch {
    address public owner;
    Nodes public nodes;
    Nodes.SplitStruct private splitStruct;
    uint8 public constant TOTAL_FEE = 150; //1.50%
    uint256[] public auxStack;

    struct Function {
        string recipeId;
        string id;
        string functionName;
        address user;
        string[] arguments;
        bool hasNext;
    }

    event AddFundsForTokens(string indexed recipeId, string indexed id, address tokenInput, uint256 amount);
    event AddFundsForFTM(string indexed recipeId, string indexed id, uint256 amount);
    event Split(string indexed recipeId, string indexed id, address tokenInput, uint256 amountIn, address tokenOutput1, uint256 amountOutToken1, address tokenOutput2, uint256 amountOutToken2);
    event SwapTokens(string indexed recipeId, string indexed id, address tokenInput, uint256 amountIn, address tokenOutput, uint256 amountOut);
    event Liquidate(string indexed recipeId, string indexed id, IERC20[] tokensInput, uint256[] amountsIn, address tokenOutput, uint256 amountOut);
    event SendToWallet(string indexed recipeId, string indexed id, address tokenOutput, uint256 amountOut);
    event lpDeposited(string indexed recipeId, string indexed id, address lpToken, uint256 amount);
    event ttDeposited(string indexed recipeId, string indexed id, address ttVault, uint256 amount);
    event lpWithdrawed(string indexed recipeId, string indexed id, address lpToken, uint256 amountLp, address tokenDesired, uint256 amountTokenDesired);
    event ttWithdrawed(string indexed recipeId, string indexed id, address ttVault, uint256 amountTt, address tokenDesired, uint256 amountTokenDesired, uint256 rewardAmount);

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'You must be the owner.');
        _;
    }

    function setNodeContract(Nodes _nodes) public onlyOwner {
        nodes = _nodes;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), 'This function is internal');
        _;
    }

    function batchFunctions(Function[] memory _functions) public onlyOwner {
        for (uint256 i = 0; i < _functions.length; i++) {
            (bool success, ) = address(this).call(abi.encodeWithSignature(_functions[i].functionName, _functions[i]));
            if (!success) revert();
        }
        if (auxStack.length > 0) deleteAuxStack();
    }

    function deleteAuxStack() private {
        for (uint8 i = 1; i <= auxStack.length; i++) {
            auxStack.pop();
        }
    }

    function addFundsForFTM(Function memory args) public onlySelf {
        uint256 amount = StringUtils.safeParseInt(args.arguments[0]);
        uint256 _fee = ((amount * TOTAL_FEE) / 10000);
        amount -= _fee;
        if (args.hasNext) {
            auxStack.push(amount);
        }

        emit AddFundsForFTM(args.recipeId, args.id, amount);
    }

    function withdrawFromFarm(Function memory args) public onlySelf {
        uint256 amount = StringUtils.safeParseInt(args.arguments[7]);
        if (auxStack.length > 0) {
            amount = auxStack[auxStack.length - 1];
            auxStack.pop();
        }
        (uint256 rewardAmount, uint256 amountTokenDesired) = nodes.withdrawFromFarm(args.user, args.arguments, amount);
        emit ttWithdrawed(
            args.recipeId,
            args.id,
            StringUtils.parseAddr(args.arguments[2]),
            amount,
            StringUtils.parseAddr(args.arguments[5]),
            amountTokenDesired,
            rewardAmount
        );
        if (args.hasNext) {
            auxStack.push(amountTokenDesired);
        }
    }

    function withdrawFromLp(Function memory args) public onlySelf {
        uint256 amount = StringUtils.safeParseInt(args.arguments[7]);
        if (auxStack.length > 0) {
            amount = auxStack[auxStack.length - 1];
            auxStack.pop();
        }
        uint256 amountTokenDesired = nodes.withdrawFromLp(args.user, args.arguments, amount);
        emit lpWithdrawed(
            args.recipeId,
            args.id,
            StringUtils.parseAddr(args.arguments[1]),
            amount,
            StringUtils.parseAddr(args.arguments[5]),
            amountTokenDesired
        );
        if (args.hasNext) {
            auxStack.push(amountTokenDesired);
        }
    }

    function depositOnLp(Function memory args) public onlySelf {
        uint256 amount0 = StringUtils.safeParseInt(args.arguments[3]);
        uint256 amount1 = StringUtils.safeParseInt(args.arguments[4]);
        uint256 amountOutMin0 = StringUtils.safeParseInt(args.arguments[5]);
        uint256 amountOutMin1 = StringUtils.safeParseInt(args.arguments[6]);
        address lpToken = StringUtils.parseAddr(args.arguments[0]);
        if (auxStack.length > 0) {
            amount0 = auxStack[auxStack.length - 2];
            amount1 = auxStack[auxStack.length - 1];
            auxStack.pop();
            auxStack.pop();
        }
        uint256 lpRes = nodes.depositOnLp(
            args.user,
            lpToken,
            StringUtils.parseAddr(args.arguments[1]),
            StringUtils.parseAddr(args.arguments[2]),
            amount0,
            amount1,
            amountOutMin0,
            amountOutMin1
        );
        emit lpDeposited(args.recipeId, args.id, lpToken, lpRes);
        if (args.hasNext) {
            auxStack.push(lpRes);
        }
    }

    function depositOnFarm(Function memory args) public onlySelf {
        (, bytes memory data) = address(nodes).call(
            abi.encodeWithSignature(args.arguments[0], args.user, args.arguments, auxStack)
        );

        uint256[] memory result = abi.decode(data, (uint256[]));
        while (result[0] != 0) {
            auxStack.pop();
            result[0]--;
        }

        emit ttDeposited(args.recipeId, args.id, StringUtils.parseAddr(args.arguments[2]), result[1]); // ttVault address and ttAmount
        if (args.hasNext) {
            auxStack.push(result[1]);
        }
    }

    function split(Function memory args) public onlySelf {
        Nodes.SplitStruct memory splitStruct_;
        splitStruct_.user = args.user;
        splitStruct_.firstTokens = abi.decode(bytes(args.arguments[0]), (IAsset[]));
        splitStruct_.secondTokens = abi.decode(bytes(args.arguments[1]), (IAsset[]));
        splitStruct_.amount = StringUtils.safeParseInt(args.arguments[2]);
        splitStruct_.percentageFirstToken = StringUtils.safeParseInt(args.arguments[3]);
        splitStruct_.limitsFirst = abi.decode(bytes(args.arguments[4]), (int256[]));
        splitStruct_.limitsSecond = abi.decode(bytes(args.arguments[5]), (int256[]));
        string memory _firstTokenHasNext = args.arguments[6];
        string memory _secondTokenHasNext = args.arguments[7];
        uint8 providerFirst_;
        if(args.arguments.length >= 9) {
            splitStruct_.batchSwapStepFirstToken = abi.decode(bytes(args.arguments[8]), (BatchSwapStep[])); 
            providerFirst_ = 1;
        }
        uint8 providerSecond_;
        if(args.arguments.length >= 10) {
            splitStruct_.batchSwapStepSecondToken = abi.decode(bytes(args.arguments[9]), (BatchSwapStep[])); 
            providerSecond_ = 1;
        }

        if (auxStack.length > 0) {
            splitStruct_.amount = auxStack[auxStack.length - 1];
            auxStack.pop();
        }

        (uint256 amountOutToken1, uint256 amountOutToken2) = nodes.split(splitStruct_);
        if (StringUtils.equal(_firstTokenHasNext, 'y')) {
            auxStack.push(amountOutToken1);
        }
        if (StringUtils.equal(_secondTokenHasNext, 'y')) {
            auxStack.push(amountOutToken2);
        }
        emit Split(args.recipeId, args.id, address(splitStruct_.firstTokens[0]), splitStruct_.amount, address(splitStruct_.firstTokens[splitStruct_.firstTokens.length - 1]), amountOutToken1, address(splitStruct_.secondTokens[splitStruct_.secondTokens.length - 1]), amountOutToken2);
    }

    function addFundsForTokens(Function memory args) public onlySelf {
        address _token = StringUtils.parseAddr(args.arguments[0]);
        uint256 _amount = StringUtils.safeParseInt(args.arguments[1]);

        uint256 amount = nodes.addFundsForTokens(args.user, _token, _amount);
        if (args.hasNext) {
            auxStack.push(amount);
        }

        emit AddFundsForTokens(args.recipeId, args.id, _token, amount);
    }

    function swapTokens(Function memory args) public onlySelf {
        IAsset[] memory tokens_ = abi.decode(bytes(args.arguments[0]), (IAsset[]));
        uint256 amount_ = StringUtils.safeParseInt(args.arguments[1]);
        int256[] memory limits_ = abi.decode(bytes(args.arguments[2]), (int256[]));
        BatchSwapStep[] memory batchSwapStep_;
        uint8 provider_;
        if(args.arguments.length >= 4) {
            batchSwapStep_ = abi.decode(bytes(args.arguments[3]), (BatchSwapStep[])); 
            provider_ = 1;
        }
        
        if (auxStack.length > 0) {
            amount_ = auxStack[auxStack.length - 1];
            auxStack.pop();
        }

        uint256 amountOut = nodes.swapTokens(args.user, provider_, tokens_, amount_, batchSwapStep_, limits_);
        if (args.hasNext) {
            auxStack.push(amountOut);
        }

        emit SwapTokens(args.recipeId, args.id, address(tokens_[0]), amount_, address(tokens_[tokens_.length - 1]), amountOut);
    }

    function liquidate(Function memory args) public onlySelf {
        uint256 _tokenArguments = (args.arguments.length - 2) / 2;

        IERC20[] memory _tokens = new IERC20[](_tokenArguments);
        for (uint256 x = 0; x < _tokenArguments; x++) {
            address _token = StringUtils.parseAddr(args.arguments[x]);

            _tokens[x] = IERC20(_token);
        }

        uint256[] memory _amounts = new uint256[](_tokenArguments);
        uint256 y;
        for (uint256 x = _tokenArguments; x < args.arguments.length - 2; x++) {
            uint256 _amount;
            if (auxStack.length > 0) {
                _amount = auxStack[auxStack.length - 1];
                auxStack.pop();
            } else {
                _amount = StringUtils.safeParseInt(args.arguments[x]);
            }

            _amounts[y] = _amount;
            y++;
        }

        address _tokenOutput = StringUtils.parseAddr(args.arguments[args.arguments.length - 2]);
        uint256 _amountOutMin = StringUtils.safeParseInt(args.arguments[args.arguments.length - 1]);

        uint256 amountOut = nodes.liquidate(args.user, _tokens, _amounts, _tokenOutput, _amountOutMin);

        emit Liquidate(args.recipeId, args.id, _tokens, _amounts, _tokenOutput, amountOut);
    }

    function sendToWallet(Function memory args) public onlySelf {
        address _token = StringUtils.parseAddr(args.arguments[0]);
        uint256 _amount;

        if (auxStack.length > 0) {
            _amount = auxStack[auxStack.length - 1];
            auxStack.pop();
        } else {
            _amount = StringUtils.safeParseInt(args.arguments[1]);
        }

        uint256 amount = nodes.sendToWallet(args.user, IERC20(_token), _amount);

        emit SendToWallet(args.recipeId, args.id, _token, amount);
    }

    receive() external payable {}
}
