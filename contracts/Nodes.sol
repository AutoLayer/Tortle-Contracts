// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/Babylonian.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import './lib/AddressToUintIterableMap.sol';
import './lib/StringUtils.sol';
import './interfaces/ITortleVault.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IWETH.sol';
import './SwapsUni.sol';
import './SwapsBeets.sol';
import './farms/FarmsUni.sol';
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
error Nodes__WithdrawFromLPInsufficientFunds();
error Nodes__WithdrawFromFarmInsufficientFunds();

contract Nodes is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using AddressToUintIterableMap for AddressToUintIterableMap.Map;

    struct SplitStruct {
        address user;
        IAsset[] firstTokens;
        IAsset[] secondTokens;
        uint256 amount;
        uint256 percentageFirstToken;
        int256[] limitsFirst;
        int256[] limitsSecond;
        BatchSwapStep[] batchSwapStepFirstToken;
        uint8 providerFirst;
        BatchSwapStep[] batchSwapStepSecondToken;
        uint8 providerSecond;
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
    SwapsUni public swapsUni;
    SwapsBeets public swapsBeets;
    FarmsUni public farmsUni;
    Batch private batch;
    address private WFTM;
    address public usdc;

    uint8 public constant TOTAL_FEE = 150; //1.50%
    uint8 public constant DOJOS_FEE = 50; //0.50%
    uint8 public constant TREASURY_FEE = 70; //0.70%
    uint8 public constant DEV_FUND_FEE = 30; //0.30%

    uint256 public constant DOJOS_FEE_PERCENTAGE = 3333; // 33%
    uint256 public constant TREASURY_FEE_PERCENTAGE = 4666; // 46.66%
    uint256 public constant DEV_FUND_FEE_PERCENTAGE = 2000; // 20%

    mapping(address => mapping(address => uint256)) public userLp;
    mapping(address => mapping(address => uint256)) public userTt;

    mapping(address => AddressToUintIterableMap.Map) private balance;

    event AddFunds(address tokenInput, uint256 amount);
    event Swap(address tokenInput, uint256 amountIn, address tokenOutput, uint256 amountOut);
    event Split(address tokenOutput1, uint256 amountOutToken1, address tokenOutput2, uint256 amountOutToken2);
    event Liquidate(address tokenOutput, uint256 amountOut);
    event SendToWallet(address tokenOutput, uint256 amountOut);
    event RecoverAll(address tokenOut, uint256 amountOut);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(batch), 'You must be the owner.');
        _;
    }

    function initializeConstructor(
        address _owner,
        SwapsUni _swapsUni,
        SwapsBeets _swapsBeets,
        FarmsUni _farmsUni,
        Batch _batch,
        address _tortleDojos,
        address _tortleTrasury,
        address _tortleDevFund,
        address _wftm,
        address _usdc
    ) public initializer {
        owner = _owner;
        swapsUni = _swapsUni;
        swapsBeets = _swapsBeets;
        farmsUni = _farmsUni;
        batch = _batch;
        tortleDojos = _tortleDojos;
        tortleTreasury = _tortleTrasury;
        tortleDevFund = _tortleDevFund;
        WFTM = _wftm;
        usdc = _usdc;
    }

    function setBatch(Batch batch_) public onlyOwner {
        batch = batch_;
    }

    function setSwapsUni(SwapsUni swapsUni_) public onlyOwner {
        swapsUni = swapsUni_;
    }

    function setSwapsBeets(SwapsBeets swapsBeets_) public onlyOwner {
        swapsBeets = swapsBeets_;
    }

    function setFarmsUni(FarmsUni farmsUni_) public onlyOwner {
        farmsUni = farmsUni_;
    }

    function setTortleDojos(address tortleDojos_) public onlyOwner {
        tortleDojos = tortleDojos_;
    }

    function setTortleTreasury(address tortleTreasury_) public onlyOwner {
        tortleTreasury = tortleTreasury_;
    }

    function setTortleDevFund(address tortleDevFund_) public onlyOwner {
        tortleDevFund = tortleDevFund_;
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

        amount = chargeFees(_token, balanceAfter - balanceBefore);
        increaseBalance(_user, _token, amount);

        emit AddFunds(_token, amount);
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

    /**
    * @notice Function used to charge the correspoding fees (returns the amount - fees)
    * @param _token Address of the token used as fees
    * @param _amount Amount of the token that is wanted to calculate its fees
    */
    function chargeFees(address _token, uint256 _amount) internal returns (uint256) {
        uint256 _amountFee = mulScale(_amount, TOTAL_FEE, 10000);
        uint256 _dojosTokens;
        uint256 _treasuryTokens;
        uint256 _devFundTokens;

        if (_token == usdc) {
            _dojosTokens = mulScale(_amount, DOJOS_FEE, 10000);
            _treasuryTokens = mulScale(_amount, TREASURY_FEE, 10000);
            _devFundTokens = mulScale(_amount, DEV_FUND_FEE, 10000);
        } else {
            _approve(_token, address(swapsUni), _amountFee);
            uint256 _amountSwap = swapsUni.swapTokens(_token, _amountFee, usdc, 0);
            _dojosTokens = _amountSwap / 3;
            _treasuryTokens = mulScale(_amountSwap, 2000, 10000);
            _devFundTokens= _amountSwap - (_dojosTokens + _treasuryTokens);
        }

        IERC20(usdc).safeTransfer(tortleDojos, _dojosTokens);
        IERC20(usdc).safeTransfer(tortleTreasury, _treasuryTokens);
        IERC20(usdc).safeTransfer(tortleDevFund, _devFundTokens);

        return _amount - _amountFee;
    }

    /**
     * @notice Function that allows to send X amount of tokens and returns the token you want.
     * @param user_ Address of the user running the node.
     * @param provider_ Provider used for swapping tokens.
     * @param tokens_ Array of tokens to be swapped.
     * @param amount_ Amount of Tokens to be swapped.
     * @param batchSwapStep_ Array of structs required by beets provider.
     * @param limits_ Maximum amounts you want to use.
     */
    function swapTokens(
        address user_,
        uint8 provider_,
        IAsset[] memory tokens_,
        uint256 amount_,
        BatchSwapStep[] memory batchSwapStep_,
        int256[] memory limits_
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        address tokenIn_ = address(tokens_[0]);
        address tokenOut_ = address(tokens_[tokens_.length - 1]);

        uint256 _userBalance = getBalance(user_, IERC20(tokenIn_));
        if (amount_ > _userBalance) revert Nodes__InsufficientBalance();

        if (tokenIn_ != tokenOut_) {
            if (provider_ == 0) {
                _approve(tokenIn_, address(swapsUni), amount_);
                amountOut = swapsUni.swapTokens(tokenIn_, amount_, tokenOut_, uint256(limits_[0]));
            } else {
                _approve(tokenIn_, address(swapsBeets), amount_);
                amountOut = swapsBeets.swapTokens(tokens_, batchSwapStep_, limits_);
            }

            increaseBalance(user_, tokenOut_, amountOut);

            decreaseBalance(user_, tokenIn_, amount_);
        } else amountOut = amount_;

        emit Swap(tokenIn_, amount_, tokenOut_, amountOut);
    }

    /**
    * @notice Function that divides the token you send into two tokens according to the percentage you select.
    * @param splitStruct_ Struct: user, firstTokens, secondTokens, amount, percentageFirstToken, limitsFirst, limitsSecond, batchSwapStepFirstToken, providerFirst, batchSwapStepSecondToken, providerSecond.
    */
    function split(SplitStruct memory splitStruct_)
        public
        nonReentrant
        onlyOwner
        returns (uint256 amountOutToken1, uint256 amountOutToken2)
    {
        address user_ = splitStruct_.user;
        IAsset[] memory firstTokens_ = splitStruct_.firstTokens;
        IAsset[] memory secondTokens_ = splitStruct_.secondTokens;
        uint256 amount_ = splitStruct_.amount;
        int256[] memory limitsFirst_ = splitStruct_.limitsFirst;
        int256[] memory limitsSecond_ = splitStruct_.limitsSecond;
        uint8 providerFirst_ = splitStruct_.providerFirst;
        uint8 providerSecond_ = splitStruct_.providerSecond;

        address tokenIn_ = address(firstTokens_[0]);
        address firstTokenOut_ = address(firstTokens_[firstTokens_.length - 1]);
        address secondTokenOut_ = address(secondTokens_[secondTokens_.length - 1]);

        uint256 userBalance_ = getBalance(user_, IERC20(tokenIn_));
        if (amount_ > userBalance_) revert Nodes__InsufficientBalance();

        uint256 firstTokenAmount_ = mulScale(amount_, splitStruct_.percentageFirstToken, 10000);
        uint256 secondTokenAmount_ = amount_ - firstTokenAmount_;

        if (tokenIn_ != firstTokenOut_) {
            if (providerFirst_ == 0) {
                _approve(tokenIn_, address(swapsUni), firstTokenAmount_);
                amountOutToken1 = swapsUni.swapTokens(tokenIn_, amount_, firstTokenOut_, uint256(limitsFirst_[0]));
            } else {
                _approve(tokenIn_, address(swapsBeets), firstTokenAmount_);
                amountOutToken1 = swapsBeets.swapTokens(firstTokens_, splitStruct_.batchSwapStepFirstToken, limitsFirst_);
            }
        } else amountOutToken1 = firstTokenAmount_;

        if (tokenIn_ != secondTokenOut_) {
            if (providerSecond_ == 0) {
                _approve(tokenIn_, address(swapsUni), secondTokenAmount_);
                amountOutToken2 = swapsUni.swapTokens(tokenIn_, amount_, secondTokenOut_, uint256(limitsSecond_[0]));
            } else {
                _approve(tokenIn_, address(swapsBeets), secondTokenAmount_);
                amountOutToken2 = swapsBeets.swapTokens(secondTokens_, splitStruct_.batchSwapStepSecondToken, limitsSecond_);
            }
        } else amountOutToken2 = secondTokenAmount_;

        increaseBalance(user_, firstTokenOut_, amountOutToken1);
        increaseBalance(user_, secondTokenOut_, amountOutToken2);

        decreaseBalance(user_, tokenIn_, amount_);

        emit Split(firstTokenOut_, amountOutToken1, secondTokenOut_, amountOutToken2);
    }

    /**
    * @notice Function used to deposit tokens on a lpPool and get lptoken
    * @param user Address of the user.
    * @param lpToken Address of the lpToken
    * @param token0 Address of the first token that is going to be deposited
    * @param token1 Address of the second token that is going to be deposited
    * @param amount0 Amount of token0
    * @param amount1 Amount of token1
    * @param amountOutMin0 Minimum amount of token0
    * @param amountOutMin0 Minimum amount of token1
    */
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
        IUniswapV2Router02 router = swapsUni.getRouter(token0, token1);

        if (lpToken != IUniswapV2Factory(IUniswapV2Router02(router).factory()).getPair(token0, token1)) revert  Nodes__DepositOnLPInvalidLPToken();
        if (amount0 > getBalance(user, IERC20(token0))) revert Nodes__DepositOnLPInsufficientT0Funds();
        if (amount1 > getBalance(user, IERC20(token1))) revert Nodes__DepositOnLPInsufficientT1Funds();

        _approve(token0, address(farmsUni), amount0);
        _approve(token1, address(farmsUni), amount1);
        (uint256 amount0f, uint256 amount1f, uint256 lpRes) = farmsUni.addLiquidity(router, token0, token1, amount0, amount1, amountOutMin0, amountOutMin1);
        userLp[lpToken][user] += lpRes;

        decreaseBalance(user, address(token0), amount0f);
        decreaseBalance(user, address(token1), amount1f);

        return lpRes;
    }

    /**
    * @notice Function used to withdraw tokens from a LPfarm
    * @param _arguments Information needed to complete farm deposit
    * @param amount Amount of LPTokens desired to withdraw
    */
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
        _approve(args.lpToken, address(farmsUni), amount);
        amountTokenDesired = farmsUni.withdrawLpAndSwap(address(swapsUni), args, amount);
        increaseBalance(user, args.tokenDesired, amountTokenDesired);
    }

    /**
    * @notice Function used to deposit tokens on a farm
    * @param _arguments Information needed to complete farm deposit
    * @param auxStack Contains information of the amounts that are going to be deposited 
    */
    function depositOnFarmTokens(
        address user,
        string[] memory _arguments,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint256[] memory result) {
        _doft memory args_;
        args_.lpToken = StringUtils.parseAddr(_arguments[1]);
        args_.tortleVault = StringUtils.parseAddr(_arguments[2]);
        args_.token0 = StringUtils.parseAddr(_arguments[3]);
        args_.token1 = StringUtils.parseAddr(_arguments[4]);
        args_.amount0 = StringUtils.safeParseInt(_arguments[5]);
        args_.amount1 = StringUtils.safeParseInt(_arguments[6]);
        result = new uint256[](2);
        if (auxStack.length > 0) {
            args_.amount0 = auxStack[auxStack.length - 2];
            args_.amount1 = auxStack[auxStack.length - 1];
            result[0] = 2;
        }

        if (args_.amount0 > getBalance(user, IERC20(args_.token0))) revert Nodes__DepositOnFarmTokensInsufficientT0Funds();
        if (args_.amount1 > getBalance(user, IERC20(args_.token1))) revert Nodes__DepositOnFarmTokensInsufficientT1Funds();

        IUniswapV2Router02 router = ISwapsUni(address(swapsUni)).getRouter(args_.token0, args_.token1);
        _approve(args_.token0, address(farmsUni), args_.amount0);
        _approve(args_.token1, address(farmsUni), args_.amount1);
        (uint256 amount0f, uint256 amount1f, uint256 lpBal) = farmsUni.addLiquidity(router, args_.token0, args_.token1, args_.amount0, args_.amount1, 0, 0);
        
        _approve(args_.lpToken, args_.tortleVault, lpBal);
        uint256 ttAmount = ITortleVault(args_.tortleVault).deposit(user, lpBal);
        userTt[args_.tortleVault][user] += ttAmount;
        
        decreaseBalance(user, address(args_.token0), amount0f);
        decreaseBalance(user, address(args_.token1), amount1f);
        
        result[1] = ttAmount;
    }

    /**
    * @notice Function used to withdraw tokens from a farm
    * @param _arguments Information needed to complete farm deposit
    * @param amount Amount of tokens desired to withdraw
    */
    function withdrawFromFarm(
        address user,
        string[] memory _arguments,
        uint256 amount
    ) external nonReentrant onlyOwner returns (uint256 rewardAmount, uint256 amountTokenDesired) {
        _wffot memory args;
        args.lpToken = StringUtils.parseAddr(_arguments[1]);
        args.tortleVault = StringUtils.parseAddr(_arguments[2]);
        args.token0 = StringUtils.parseAddr(_arguments[3]);
        args.token1 = StringUtils.parseAddr(_arguments[4]);
        args.tokenDesired = StringUtils.parseAddr(_arguments[5]);
        args.amountTokenDesiredMin = StringUtils.safeParseInt(_arguments[6]);

        if (amount > userTt[args.tortleVault][user]) revert Nodes__WithdrawFromFarmInsufficientFunds();

        (uint256 rewardAmount_, uint256 amountLp) = ITortleVault(args.tortleVault).withdraw(user, amount);
        rewardAmount = rewardAmount_;
        userTt[args.tortleVault][user] -= amount;
        
        _approve(args.lpToken, address(farmsUni), amountLp);
        amountTokenDesired = farmsUni.withdrawLpAndSwap(address(swapsUni), args, amountLp);
        increaseBalance(user, args.tokenDesired, amountTokenDesired);
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
    ) public nonReentrant onlyOwner returns (uint256) {
        if (_tokens.length != _amounts.length) revert Nodes__InvalidArrayLength();

        uint256 amount;
        for (uint256 _i = 0; _i < _tokens.length; _i++) {
            address tokenInput = address(_tokens[_i]);
            uint256 amountInput = _amounts[_i];
            uint256 userBalance = getBalance(_user, IERC20(tokenInput));
            if (userBalance < amountInput) revert Nodes__InsufficientBalance();

            uint256 _amountOut;
            if (tokenInput != _tokenOutput) {
                _approve(tokenInput, address(swapsUni), amountInput);
                _amountOut = swapsUni.swapTokens(tokenInput, amountInput, _tokenOutput, _amountOutMin);

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
    ) public nonReentrant onlyOwner returns (uint256) {
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
            } else _tokenAddress.safeTransfer(msg.sender, _amounts[_i]);
            
            decreaseBalance(msg.sender, address(_tokenAddress), _amounts[_i]);

            emit RecoverAll(address(_tokenAddress), _amounts[_i]);
        }
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
    * @notice Function that allows you to see the balance you have in the contract of a specific token.
    * @param _user Address of the user who will deposit the tokens.
    * @param _token Contract of the token from which the balance is to be obtained.
    */
    function getBalance(address _user, IERC20 _token) public view returns (uint256) {
        return balance[_user].get(address(_token));
    }

    /**
     * @notice Increase balance of a token for a user
     * @param _user Address of the user that is wanted to increase its balance of a token
     * @param _token Address of the token that is wanted to be increased
     * @param _amount Amount of the token that is wanted to be increased
     */
    function increaseBalance(
        address _user,
        address _token,
        uint256 _amount
    ) private {
        uint256 _userBalance = getBalance(_user, IERC20(_token));
        _userBalance += _amount;
        balance[_user].set(address(_token), _userBalance);
    }

    /**
     * @notice Decrease balance of a token for a user
     * @param _user Address of the user that is wanted to decrease its balance of a token
     * @param _token Address of the token that is wanted to be decreased
     * @param _amount Amount of the token that is wanted to be decreased
     */
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
