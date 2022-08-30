// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/proxy/utils/Initializable.sol';

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/Babylonian.sol';
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import './lib/AddressToUintIterableMap.sol';
import './lib/StringUtils.sol';
import './interfaces/ITortleVault.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IWETH.sol';
import './Nodes_.sol';
import './Batch.sol';

error Nodes__InsufficientBalance();
error Nodes__EmptyArray();
error Nodes__InvalidArrayLength();
error Nodes__TransferFailed();
error Nodes__WithdrawLpAndSwapError();
error Nodes__DepositOnLPInvalidLPToken();
error Nodes__DepositOnLPInsufficientT0Funds();
error Nodes__DepositOnLPInsufficientT1Funds();
error Nodes__DepositOnFarmTokensInsufficientT0Funds();
error Nodes__DepositOnFarmTokensInsufficientT1Funds();
error Nodes__DepositOnFarmLPInsufficientLPTokenFunds();
error Nodes__WithdrawFromLPInsufficientFunds();
error Nodes__WithdrawFromFarmInsufficientFunds();
error Nodes__UniswapV2RouterInsufficientAAmount();
error Nodes__UniswapV2RouterInsufficientBAmount();

contract Nodes is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using AddressToUintIterableMap for AddressToUintIterableMap.Map;

    struct SplitStruct {
        address user;
        address token;
        uint256 amount;
        address firstToken;
        address secondToken;
        uint256 percentageFirstToken;
        uint256 amountOutMinFirst;
        uint256 amountOutMinSecond;
    }

    struct _doft {
        address lpToken;
        address tortleVault;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
    }

    struct _wffot {
        // withdraw from farm One Token
        address lpToken;
        address tortleVault;
        address token0;
        address token1;
        address tokenDesired;
        uint256 amountTokenDesiredMin;
        uint256 amount;
    }

    address public owner;
    address public tortleDojos;
    address public tortleTreasury;
    address public tortleDevFund;
    Nodes_ public nodes_;
    Nodes_.SplitStruct private nodes_SplitStruct;
    Batch private batch;
    address public usdc;
    IUniswapV2Router02 router;
    address private WFTM;

    uint8 public constant TOTAL_FEE = 150; //1.50%
    uint8 public constant DOJOS_FEE = 50; //0.50%
    uint8 public constant TREASURY_FEE = 70; //0.70%
    uint8 public constant DEV_FUND_FEE = 30; //0.30%
    uint256 public constant minimumAmount = 1000;

    mapping(address => mapping(address => uint256)) public userLp;
    mapping(address => mapping(address => uint256)) public userTt;

    mapping(address => AddressToUintIterableMap.Map) private balance;

    event AddFunds(address tokenInput, uint256 amount);
    event Swap(address tokenInput, uint256 amountIn, address tokenOutput, uint256 amountOut);
    event Split(uint256 amountOutToken1, uint256 amountOutToken2);
    event Liquidate(address tokenOutput, uint256 amountOut);
    event SendToWallet(address tokenOutput, uint256 amountOut);
    event RecoverAll(address tokenOut, uint256 amountOut);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(batch), 'You must be the owner.');
        _;
    }

    function initializeConstructor(
        address _owner,
        Nodes_ _nodes_,
        Batch _batch,
        address _tortleDojos,
        address _tortleTrasury,
        address _tortleDevFund,
        address _usdc,
        address _router
    ) public initializer {
        owner = _owner;
        nodes_ = _nodes_;
        batch = _batch;
        tortleDojos = _tortleDojos;
        tortleTreasury = _tortleTrasury;
        tortleDevFund = _tortleDevFund;
        usdc = _usdc;
        router = IUniswapV2Router02(_router);
        WFTM = router.WETH();
    }

    function depositOnLp(
        address user,
        address lpToken,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 amountOutMin0,
        uint256 amountOutMin1
    ) external nonReentrant onlyOwner returns (uint256) {
        IUniswapV2Router02 router1 = nodes_.getRouter(token0, token1);

        if (lpToken != IUniswapV2Factory(IUniswapV2Router02(router1).factory()).getPair(token0, token1)) revert  Nodes__DepositOnLPInvalidLPToken();
        if (amount0 > getBalance(user, IERC20(token0))) revert Nodes__DepositOnLPInsufficientT0Funds();
        if (amount1 > getBalance(user, IERC20(token1))) revert Nodes__DepositOnLPInsufficientT1Funds();
    
        (uint256 amount0f, uint256 amount1f, uint256 lpRes) = _addLiquidity(token0, token1, amount0, amount1, amountOutMin0, amountOutMin1);
        userLp[lpToken][user] += lpRes;

        decreaseBalance(user, address(token0), amount0f);
        decreaseBalance(user, address(token1), amount1f);

        return lpRes;
    }

    function depositOnFarmLp(
        address user,
        string[] memory _arguments,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint256[] memory result) {
        address lpToken = StringUtils.parseAddr(_arguments[1]);
        address tortleVault = StringUtils.parseAddr(_arguments[2]);
        uint256 amount = StringUtils.safeParseInt(_arguments[3]);
        result = new uint256[](2);
        if (auxStack.length > 0) {
            amount = auxStack[auxStack.length - 1];
            result[0] = 1;
        }
        if (amount > getBalance(user, IERC20(lpToken))) revert Nodes__DepositOnFarmLPInsufficientLPTokenFunds();
        _approve(lpToken, tortleVault, amount);
        uint256 ttShares = ITortleVault(tortleVault).deposit(amount);
        userTt[tortleVault][user] += ttShares;
        decreaseBalance(user, address(lpToken), amount);
        result[1] = ttShares;
    }

    function depositOnFarmTokens(
        address user,
        string[] memory _arguments,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint256[] memory result) {
        _doft memory args;
        args.lpToken = StringUtils.parseAddr(_arguments[1]);
        args.tortleVault = StringUtils.parseAddr(_arguments[2]);
        args.token0 = StringUtils.parseAddr(_arguments[3]);
        args.token1 = StringUtils.parseAddr(_arguments[4]);
        args.amount0 = StringUtils.safeParseInt(_arguments[5]);
        args.amount1 = StringUtils.safeParseInt(_arguments[6]);
        result = new uint256[](2);
        if (auxStack.length > 0) {
            args.amount0 = auxStack[auxStack.length - 2];
            args.amount1 = auxStack[auxStack.length - 1];
            result[0] = 2;
        }

        if (args.amount0 > getBalance(user, IERC20(args.token0))) revert Nodes__DepositOnFarmTokensInsufficientT0Funds();
        if (args.amount1 > getBalance(user, IERC20(args.token1))) revert Nodes__DepositOnFarmTokensInsufficientT1Funds();
        (uint256 amount0f, uint256 amount1f, uint256 lpBal) = _addLiquidity(args.token0, args.token1, args.amount0, args.amount1, 0, 0);
        _approve(args.lpToken, args.tortleVault, lpBal);
        uint256 ttAmount = ITortleVault(args.tortleVault).deposit(lpBal);
        userTt[args.tortleVault][user] += ttAmount;
        decreaseBalance(user, address(args.token0), amount0f);
        decreaseBalance(user, address(args.token1), amount1f);
        result[1] = ttAmount;
    }

    function withdrawFromLp(
        address user,
        string[] memory _arguments,
        uint256 amount
    ) external nonReentrant onlyOwner returns (uint256 amountTokenDesired) {
        _wffot memory args;
        args.lpToken = StringUtils.parseAddr(_arguments[1]);
        args.token0 = StringUtils.parseAddr(_arguments[3]);
        args.token1 = StringUtils.parseAddr(_arguments[4]);
        args.tokenDesired = StringUtils.parseAddr(_arguments[5]);
        args.amountTokenDesiredMin = StringUtils.safeParseInt(_arguments[6]);

        if (amount > userLp[args.lpToken][user]) revert Nodes__WithdrawFromLPInsufficientFunds();

        userLp[args.lpToken][user] -= amount;
        amountTokenDesired = _withdrawLpAndSwap(user, args, amount);
    }

    function withdrawFromFarm(
        address user,
        string[] memory _arguments,
        uint256 amount
    ) external nonReentrant onlyOwner returns (uint256 amountTokenDesired) {
        // For now it will only allow to withdraw one token, in the future this function will be renamed
        _wffot memory args;
        args.lpToken = StringUtils.parseAddr(_arguments[1]);
        args.tortleVault = StringUtils.parseAddr(_arguments[2]);
        args.token0 = StringUtils.parseAddr(_arguments[3]);
        args.token1 = StringUtils.parseAddr(_arguments[4]);
        args.tokenDesired = StringUtils.parseAddr(_arguments[5]);
        args.amountTokenDesiredMin = StringUtils.safeParseInt(_arguments[6]);

        if (amount > userTt[args.tortleVault][user]) revert Nodes__WithdrawFromFarmInsufficientFunds();

        uint256 amountLp = ITortleVault(args.tortleVault).withdraw(amount);
        userTt[args.tortleVault][user] -= amount;
        amountTokenDesired = _withdrawLpAndSwap(user, args, amountLp);
    }

    /**
     * @notice Function that allows to withdraw tokens to the user's wallet.
     * @param _user Address of the user who wishes to remove the tokens.
     * @param _token Token to be withdrawn.
     * @param _amount Amount of tokens to be withdrawn.
     */
    function sendToWallet(
        address _user,
        IERC20 _token,
        uint256 _amount
    ) public nonReentrant onlyOwner returns (uint256 amount) {
        uint256 _userBalance = getBalance(_user, _token);
        if (_userBalance < _amount) revert Nodes__InsufficientBalance();
        
        if(address(_token) == WFTM) {
            IWETH(WFTM).withdraw(_amount);
            payable(_user).transfer(_amount);
        } else {
            _token.safeTransfer(_user, _amount);
        }

        decreaseBalance(_user, address(_token), _amount);

        emit SendToWallet(address(_token), _amount);
        return _amount;
    }

    /**
     * @notice Emergency function that allows to recover all tokens in the state they are in.
     * @param _tokens Array of the tokens to be withdrawn.
     * @param _amounts Array of the amounts to be withdrawn.
     */
    function recoverAll(IERC20[] memory _tokens, uint256[] memory _amounts) public nonReentrant {
        if (_tokens.length <= 0) revert Nodes__EmptyArray();
        if (_tokens.length != _amounts.length) revert Nodes__InvalidArrayLength();

        for (uint256 _i = 0; _i < _tokens.length; _i++) {
            IERC20 _tokenAddress = _tokens[_i];

            uint256 _userBalance = getBalance(msg.sender, _tokenAddress);
            if (_userBalance < _amounts[_i]) revert Nodes__InsufficientBalance();

            if(address(_tokenAddress) == WFTM) {
                IWETH(WFTM).withdraw(_amounts[_i]);
                payable(msg.sender).transfer(_amounts[_i]);
            } else {
                _tokenAddress.safeTransfer(msg.sender, _amounts[_i]);
            }
            
            decreaseBalance(msg.sender, address(_tokenAddress), _amounts[_i]);

            emit RecoverAll(address(_tokenAddress), _amounts[_i]);
        }
    }

    function setBatch(Batch _batch) public onlyOwner {
        batch = _batch;
    }

    /**
     * @notice Function that allows to add funds to the contract to execute the recipes.
     * @param _token Contract of the token to be deposited.
     * @param _user Address of the user who will deposit the tokens.
     * @param _amount Amount of tokens to be deposited.
     */
    function addFundsForTokens(
        address _user,
        address _token,
        uint256 _amount
    ) public nonReentrant returns (uint256 amount) {
        if (_amount <= 0) revert Nodes__InsufficientBalance();

        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransferFrom(_user, address(this), _amount); // Send tokens from investor account to contract account.
        uint256 balanceAfter = IERC20(_token).balanceOf(address(this));
        if (balanceAfter <= balanceBefore) revert Nodes__TransferFailed(); // Checks that the balance of the contract has increased.

        _amount = chargeFees(_token, balanceAfter - balanceBefore);
        increaseBalance(_user, _token, _amount);

        emit AddFunds(_token, _amount);
        return _amount;
    }

    /**
     * @notice Function that allows to add funds to the contract to execute the recipes.
     * @param _user Address of the user who will deposit the tokens.
     */
    function addFundsForFTM(address _user) public payable nonReentrant returns (address token, uint256 amount) {
        if (msg.value <= 0) revert Nodes__InsufficientBalance();

        IWETH(WFTM).deposit{value: msg.value}();

        uint256 _amount = chargeFees(WFTM, msg.value);
        increaseBalance(_user, WFTM, _amount);

        emit AddFunds(WFTM, _amount);
        return (WFTM, _amount);
    }

    function chargeFees(address _token, uint256 _amount) internal returns (uint256 amount) {
        uint256 _amountFee = mulScale(_amount, TOTAL_FEE, 10000);

        uint256 _swapedAmountOut;
        if (_token == usdc) _swapedAmountOut = _amountFee;
        else {
            IERC20(_token).safeTransfer(address(nodes_), _amountFee);
            _swapedAmountOut = nodes_.swapTokens(_token, _amountFee, usdc, 0);
        }

        uint256 _dojosTokens = mulScale(_swapedAmountOut, DOJOS_FEE, 10000);
        uint256 _treasuryTokens = mulScale(_swapedAmountOut, TREASURY_FEE, 10000);
        uint256 _devFundTokens = mulScale(_swapedAmountOut, DEV_FUND_FEE, 10000);
        IERC20(usdc).safeTransfer(tortleDojos, _dojosTokens);
        IERC20(usdc).safeTransfer(tortleTreasury, _treasuryTokens);
        IERC20(usdc).safeTransfer(tortleDevFund, _devFundTokens);

        return _amount - _amountFee;
    }

    /**
     * @notice Function that allows you to see the balance you have in the contract of a specific token.
     * @param _user Address of the user who will deposit the tokens.
     * @param _token Contract of the token from which the balance is to be obtained.
     */
    function getBalance(address _user, IERC20 _token) public view returns (uint256) {
        return balance[_user].get(address(_token));
    }

    /**
     * @notice Function that divides the token you send into two tokens according to the percentage you select.
     * @param _splitStruct Struct: user, token, amount, firstToken, secondToken, percentageFirstToken, amountOutMinFirst, amountOutMinSecond.
     */
    function split(SplitStruct memory _splitStruct)
        public
        nonReentrant
        onlyOwner
        returns (uint256 amountOutToken1, uint256 amountOutToken2)
    {
        address user_ = _splitStruct.user;
        address token_ = _splitStruct.token;
        uint256 amount_ = _splitStruct.amount;
        address firstToken_ = _splitStruct.firstToken;
        address secondToken_ = _splitStruct.secondToken;
        uint256 amountOutMinFirst_ = _splitStruct.amountOutMinFirst;
        uint256 amountOutMinSecond_ = _splitStruct.amountOutMinSecond;

        uint256 _userBalance = getBalance(user_, IERC20(token_));
        if (amount_ > _userBalance) revert Nodes__InsufficientBalance();

        uint256 _firstTokenAmount = mulScale(amount_, _splitStruct.percentageFirstToken, 10000);
        uint256 _secondTokenAmount = amount_ - _firstTokenAmount;

        if (token_ != firstToken_) {
            IERC20(token_).safeTransfer(address(nodes_), _firstTokenAmount);
            amountOutToken1 = nodes_.swapTokens(token_, _firstTokenAmount, firstToken_, amountOutMinFirst_);
        } else amountOutToken1 = _firstTokenAmount;

        if (token_ != secondToken_) {
            IERC20(token_).safeTransfer(address(nodes_), _secondTokenAmount);
            amountOutToken2 = nodes_.swapTokens(token_, _secondTokenAmount, secondToken_, amountOutMinSecond_);
        } else amountOutToken2 = _secondTokenAmount;

        increaseBalance(user_, firstToken_, amountOutToken1);
        increaseBalance(user_, secondToken_, amountOutToken2);

        decreaseBalance(user_, token_, amount_);

        emit Split(amountOutToken1, amountOutToken2);
    }

    /**
     * @notice Function that allows to send X amount of tokens and returns the token you want.
     * @param _user Address of the user running the node.
     * @param _token Address of the token to be swapped.
     * @param _amount Amount of Tokens to be swapped.
     * @param _newToken Contract of the token you wish to receive.
     * @param _amountOutMin Minimum amount you wish to receive.
     */
    function swapTokens(
        address _user,
        address _token,
        uint256 _amount,
        address _newToken,
        uint256 _amountOutMin
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        uint256 _userBalance = getBalance(_user, IERC20(_token));

        if (_amount > _userBalance) revert Nodes__InsufficientBalance();

        if (_token != _newToken) {
            IERC20(_token).safeTransfer(address(nodes_), _amount);

            amountOut = nodes_.swapTokens(_token, _amount, _newToken, _amountOutMin);

            increaseBalance(_user, _newToken, amountOut);

            decreaseBalance(_user, _token, _amount);
        } else amountOut = _amount;

        emit Swap(_token, _amount, _newToken, amountOut);
    }

    /**
     * @notice Function that allows to liquidate all tokens in your account by swapping them to a specific token.
     * @param _user Address of the user whose tokens are to be liquidated.
     * @param _tokens Array of tokens input.
     * @param _amounts Array of amounts.
     * @param _tokenOutput Address of the token to which all tokens are to be swapped.
     * @param _amountOutMin Minimum amount you wish to receive.
     */
    function liquidate(
        address _user,
        IERC20[] memory _tokens,
        uint256[] memory _amounts,
        address _tokenOutput,
        uint256 _amountOutMin
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        if (_tokens.length != _amounts.length) revert Nodes__InvalidArrayLength();

        uint256 amount;
        for (uint256 _i = 0; _i < _tokens.length; _i++) {
            address tokenInput = address(_tokens[_i]);
            uint256 amountInput = _amounts[_i];
            uint256 userBalance = getBalance(_user, IERC20(tokenInput));
            if (userBalance < amountInput) revert Nodes__InsufficientBalance();

            uint256 _amountOut;
            if (tokenInput != _tokenOutput) {
                IERC20(tokenInput).safeTransfer(address(nodes_), amountInput);

                _amountOut = nodes_.swapTokens(tokenInput, amountInput, _tokenOutput, _amountOutMin);

                amount += _amountOut;
            } else {
                _amountOut = amountInput;
                amount += amountInput;
            }

            decreaseBalance(_user, tokenInput, amountInput);

            if(_tokenOutput == WFTM) {
                IWETH(WFTM).withdraw(_amountOut);
                payable(_user).transfer(_amountOut);
            } else {
                IERC20(_tokenOutput).safeTransfer(_user, _amountOut); 
            }
        }

        emit Liquidate(_tokenOutput, amount);
        return amount;
    }

    function _withdrawLpAndSwap(
        address user,
        _wffot memory args,
        uint256 amountLp
    ) internal returns (uint256 amountTokenDesired) {
        IUniswapV2Pair lp = IUniswapV2Pair(args.lpToken);
        if ((lp.token0() != args.token0 || lp.token1() != args.token1) && (lp.token0() != args.token1 || lp.token1() != args.token0)) revert Nodes__WithdrawLpAndSwapError();
        if (args.tokenDesired != args.token0 && args.tokenDesired != args.token1) revert Nodes__WithdrawLpAndSwapError();
        IERC20(args.lpToken).safeTransfer(args.lpToken, amountLp);
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(args.lpToken).burn(address(this));

        if (amount0 < minimumAmount) revert Nodes__UniswapV2RouterInsufficientAAmount();
        if (amount1 < minimumAmount) revert Nodes__UniswapV2RouterInsufficientBAmount();

        uint256 swapAmount;
        address swapToken;

        if (args.token1 == args.tokenDesired) {
            swapToken = args.token0;
            swapAmount = amount0;
            amountTokenDesired += amount1;
        } else {
            swapToken = args.token1;
            swapAmount = amount1;
            amountTokenDesired += amount0;
        }

        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = args.tokenDesired;

        IUniswapV2Router02 router1 = nodes_.getRouter(swapToken, args.tokenDesired);
        _approve(swapToken, address(router1), swapAmount);

        uint256[] memory swapedAmounts = router1.swapExactTokensForTokens(
            swapAmount,
            args.amountTokenDesiredMin,
            path,
            address(this),
            block.timestamp
        );
        amountTokenDesired += swapedAmounts[1];
        increaseBalance(user, args.tokenDesired, amountTokenDesired);
    }

    function _addLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 amountOutMin0,
        uint256 amountOutMin1
    )
        internal
        returns (
            uint256 amount0f,
            uint256 amount1f,
            uint256 lpRes
        )
    {
        IUniswapV2Router02 router1 = nodes_.getRouter(token0, token1);
        _approve(token0, address(router1), amount0);
        _approve(token1, address(router1), amount1);
        (amount0f, amount1f, lpRes) = router1.addLiquidity(token0, token1, amount0, amount1, amountOutMin0, amountOutMin1, address(this), block.timestamp);
    }

    function _approve(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).safeApprove(spender, 0);
        IERC20(token).safeApprove(spender, amount);
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

    function increaseBalance(
        address _user,
        address _token,
        uint256 _amount
    ) private {
        uint256 _userBalance = getBalance(_user, IERC20(_token));
        _userBalance += _amount;
        balance[_user].set(address(_token), _userBalance);
    }

    function decreaseBalance(
        address _user,
        address _token,
        uint256 _amount
    ) private {
        uint256 _userBalance = getBalance(_user, IERC20(_token));
        if (_userBalance < _amount) revert Nodes__InsufficientBalance();

        _userBalance -= _amount;
        balance[_user].set(address(_token), _userBalance);
    }

    
    receive() external payable {}
}
