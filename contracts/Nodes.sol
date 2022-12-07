// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/Babylonian.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import './lib/AddressToUintIterableMap.sol';
import './interfaces/ITortleVault.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IWETH.sol';
import './SwapsUni.sol';
import './SwapsBeets.sol';
import './DepositsBeets.sol';
import './farms/FarmsUni.sol';
import './Batch.sol';

error Nodes__InsufficientBalance();
error Nodes__EmptyArray();
error Nodes__InvalidArrayLength();
error Nodes__TransferFailed();
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

    address public owner;
    address public tortleDojos;
    address public tortleTreasury;
    address public tortleDevFund;
    SwapsUni public swapsUni;
    SwapsBeets public swapsBeets;
    DepositsBeets public depositsBeets;
    FarmsUni public farmsUni;
    Batch private batch;
    address private WFTM;
    address public usdc;

    uint8 public constant TOTAL_FEE = 150; //1.50%
    uint8 public constant DOJOS_FEE = 50; //0.50%
    uint8 public constant TREASURY_FEE = 70; //0.70%
    uint8 public constant DEV_FUND_FEE = 30; //0.30%

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
        require(msg.sender == owner || msg.sender == address(batch) || msg.sender == address(this), 'You must be the owner.');
        _;
    }

    function initializeConstructor(
        address _owner,
        SwapsUni _swapsUni,
        SwapsBeets _swapsBeets,
        DepositsBeets _depositsBeets,
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
        depositsBeets = _depositsBeets;
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

    function setDepositsBeets(DepositsBeets depositsBeets_) public onlyOwner {
        depositsBeets = depositsBeets_;
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
        IERC20(_token).safeTransferFrom(_user, address(this), _amount);
        uint256 balanceAfter = IERC20(_token).balanceOf(address(this));
        if (balanceAfter <= balanceBefore) revert Nodes__TransferFailed();

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
     * @param amountOutMin_ Minimum amounts you want to use.
     * @param batchSwapStep_ Array of structs required by beets provider.
     */
    function swapTokens(
        address user_,
        uint8 provider_,
        IAsset[] memory tokens_,
        uint256 amount_,
        uint256 amountOutMin_,
        BatchSwapStep[] memory batchSwapStep_
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        address tokenIn_ = address(tokens_[0]);
        address tokenOut_ = address(tokens_[tokens_.length - 1]);

        uint256 _userBalance = getBalance(user_, IERC20(tokenIn_));
        if (amount_ > _userBalance) revert Nodes__InsufficientBalance();

        if (tokenIn_ != tokenOut_) {
            if (provider_ == 0) {
                _approve(tokenIn_, address(swapsUni), amount_);
                amountOut = swapsUni.swapTokens(tokenIn_, amount_, tokenOut_, amountOutMin_);
            } else {
                _approve(tokenIn_, address(swapsBeets), amount_);
                batchSwapStep_[0].amount = amount_;
                amountOut = swapsBeets.swapTokens(tokens_, batchSwapStep_);
            }

            increaseBalance(user_, tokenOut_, amountOut);

            decreaseBalance(user_, tokenIn_, amount_);
        } else amountOut = amount_;

        emit Swap(tokenIn_, amount_, tokenOut_, amountOut);
    }

    /**
    * @notice Function that divides the token you send into two tokens according to the percentage you select.
    * @param args_ user, firstTokens, secondTokens, amount, percentageFirstToken, amountOutMinFirst_, amountOutMinSecond_, providers, batchSwapStepFirstToken, batchSwapStepSecondToken.
    */
    function split(
        bytes calldata args_,
        BatchSwapStep[] memory batchSwapStepFirstToken_,
        BatchSwapStep[] memory batchSwapStepSecondToken_
    ) public onlyOwner returns (uint256[] memory amountOutTokens) {
        (address user_, 
        IAsset[] memory firstTokens_, 
        IAsset[] memory secondTokens_, 
        uint256 amount_,
        uint256[] memory percentageAndAmountsOutMin_,
        uint8[] memory providers_
        ) = abi.decode(args_, (address, IAsset[], IAsset[], uint256, uint256[], uint8[]));

        amountOutTokens = new uint256[](2);

        if (amount_ > getBalance(user_, IERC20(address(firstTokens_[0])))) revert Nodes__InsufficientBalance();

        uint256 firstTokenAmount_ = mulScale(amount_, percentageAndAmountsOutMin_[0], 10000);
        
        if (address(firstTokens_[0]) != address(firstTokens_[firstTokens_.length - 1])) {
            amountOutTokens[0] = swapTokens(user_, providers_[0], firstTokens_, firstTokenAmount_, percentageAndAmountsOutMin_[1], batchSwapStepFirstToken_);
        } else amountOutTokens[0] = firstTokenAmount_;

        if (address(secondTokens_[0]) != address(secondTokens_[secondTokens_.length - 1])) {
            amountOutTokens[1] = swapTokens(user_, providers_[1], secondTokens_, (amount_ - firstTokenAmount_), percentageAndAmountsOutMin_[2], batchSwapStepSecondToken_);
        } else amountOutTokens[1] = (amount_ - firstTokenAmount_);

        emit Split(address(firstTokens_[firstTokens_.length - 1]), amountOutTokens[0], address(secondTokens_[secondTokens_.length - 1]), amountOutTokens[1]);
    }

    /**
    * @notice Function used to deposit tokens on a lpPool and get lptoken
    * @param user_ Address of the user.
    * @param poolId_ Beets pool id.
    * @param lpToken_ Address of the lpToken.
    * @param tokens_ Addresses of tokens that are going to be deposited.
    * @param amounts_ Amounts of tokens.
    * @param amountOutMin0_ Minimum amount of token0.
    * @param amountOutMin0_ Minimum amount of token1.
    */
    function depositOnLp(
        address user_,
        bytes32 poolId_,
        address lpToken_,
        address[] memory tokens_,
        uint256[] memory amounts_,
        uint256 amountOutMin0_,
        uint256 amountOutMin1_
    ) external nonReentrant onlyOwner returns (uint256) {
        if(lpToken_ != address(0)) {
            IUniswapV2Router02 router = swapsUni.getRouter(tokens_[0], tokens_[1]);

            if (lpToken_ != IUniswapV2Factory(IUniswapV2Router02(router).factory()).getPair(tokens_[0], tokens_[1])) revert  Nodes__DepositOnLPInvalidLPToken();
            if (amounts_[0] > getBalance(user_, IERC20(tokens_[0]))) revert Nodes__DepositOnLPInsufficientT0Funds();
            if (amounts_[1] > getBalance(user_, IERC20(tokens_[1]))) revert Nodes__DepositOnLPInsufficientT1Funds();

            _approve(tokens_[0], address(farmsUni), amounts_[0]);
            _approve(tokens_[1], address(farmsUni), amounts_[1]);
            (uint256 amount0f, uint256 amount1f, uint256 lpRes) = farmsUni.addLiquidity(router, tokens_[0], tokens_[1], amounts_[0], amounts_[1], amountOutMin0_, amountOutMin1_);
            userLp[lpToken_][user_] += lpRes;

            decreaseBalance(user_, tokens_[0], amount0f);
            decreaseBalance(user_, tokens_[1], amount1f);

            return lpRes;
        } else {
            if (amounts_[0] > getBalance(user_, IERC20(tokens_[0]))) revert Nodes__DepositOnLPInsufficientT0Funds();

            _approve(tokens_[0], address(depositsBeets), amounts_[0]);
            (address bptAddress_, uint256 bptAmount_) = depositsBeets.joinPool(poolId_, tokens_, amounts_);

            decreaseBalance(user_, tokens_[0], amounts_[0]);
            increaseBalance(user_, bptAddress_, bptAmount_);

            return bptAmount_;
        }
    }

    /**
    * @notice Function used to withdraw tokens from a LPfarm
    * @param user_ Address of the user.
    * @param poolId_ Beets pool id.
    * @param lpToken_ Address of the lpToken.
    * @param tokens_ Addresses of tokens that are going to be deposited.
    * @param amountsOutMin_ Minimum amounts to be withdrawed.
    * @param amount_ Amount of LPTokens desired to withdraw.
    */
    function withdrawFromLp(
        address user_,
        bytes32 poolId_,
        address lpToken_,
        address[] memory tokens_,
        uint256[] memory amountsOutMin_,
        uint256 amount_
    ) external nonReentrant onlyOwner returns (uint256 amountTokenDesired) {
        if(lpToken_ != address(0)) {
            if (amount_ > userLp[lpToken_][user_]) revert Nodes__WithdrawFromLPInsufficientFunds();

            _approve(lpToken_, address(farmsUni), amount_);
            amountTokenDesired = farmsUni.withdrawLpAndSwap(address(swapsUni), lpToken_, tokens_, amountsOutMin_[0], amount_);

            userLp[lpToken_][user_] -= amount_;
            increaseBalance(user_, tokens_[1], amountTokenDesired);
        } else {
            address bptToken_ = depositsBeets.getBptAddress(poolId_);
            if (amount_ > getBalance(user_, IERC20(bptToken_))) revert Nodes__WithdrawFromLPInsufficientFunds();
            
            _approve(bptToken_, address(depositsBeets), amount_);
            amountTokenDesired = depositsBeets.exitPool(poolId_, tokens_, amountsOutMin_, amount_);

            decreaseBalance(user_, bptToken_, amount_);
            increaseBalance(user_, tokens_[0], amountTokenDesired);
        }
    }

    /**
    * @notice Function used to deposit tokens on a farm
    * @param user Address of the user.
    * @param lpToken_ Address of the LP Token.
    * @param tortleVault_ Address of the tortle vault where we are going to deposit.
    * @param tokens_ Addresses of tokens that are going to be deposited.
    * @param amount0_ Amount of token 0.
    * @param amount1_ Amount of token 1.
    * @param auxStack Contains information of the amounts that are going to be deposited.
    */
    function depositOnFarmTokens(
        address user,
        address lpToken_,
        address tortleVault_,
        address[] memory tokens_,
        uint256 amount0_,
        uint256 amount1_,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint256[] memory result) {
        result = new uint256[](2);
        if (auxStack.length > 0) {
            amount0_ = auxStack[auxStack.length - 2];
            amount1_ = auxStack[auxStack.length - 1];
            result[0] = 2;
        }

        if (amount0_ > getBalance(user, IERC20(tokens_[0]))) revert Nodes__DepositOnFarmTokensInsufficientT0Funds();
        if (amount1_ > getBalance(user, IERC20(tokens_[1]))) revert Nodes__DepositOnFarmTokensInsufficientT1Funds();

        IUniswapV2Router02 router = ISwapsUni(address(swapsUni)).getRouter(tokens_[0], tokens_[1]);
        _approve(tokens_[0], address(farmsUni), amount0_);
        _approve(tokens_[1], address(farmsUni), amount1_);
        (uint256 amount0f, uint256 amount1f, uint256 lpBal) = farmsUni.addLiquidity(router, tokens_[0], tokens_[1], amount0_, amount1_, 0, 0);
        
        _approve(lpToken_, tortleVault_, lpBal);
        uint256 ttAmount = ITortleVault(tortleVault_).deposit(user, lpBal);
        userTt[tortleVault_][user] += ttAmount;
        
        decreaseBalance(user, tokens_[0], amount0f);
        decreaseBalance(user, tokens_[1], amount1f);
        
        result[1] = ttAmount;
    }

    /**
    * @notice Function used to withdraw tokens from a farm
    * @param user Address of the user.
    * @param lpToken_ Address of the LP Token.
    * @param tortleVault_ Address of the tortle vault where we are going to deposit.
    * @param tokens_ Addresses of tokens that are going to be deposited.
    * @param amountOutMin_ Minimum amount to be withdrawed.
    * @param amount Amount of tokens desired to withdraw.
    */
    function withdrawFromFarm(
        address user,
        address lpToken_,
        address tortleVault_,
        address[] memory tokens_,
        uint256 amountOutMin_,
        uint256 amount
    ) external nonReentrant onlyOwner returns (uint256 rewardAmount, uint256 amountTokenDesired) {
        if (amount > userTt[tortleVault_][user]) revert Nodes__WithdrawFromFarmInsufficientFunds();

        (uint256 rewardAmount_, uint256 amountLp) = ITortleVault(tortleVault_).withdraw(user, amount);
        rewardAmount = rewardAmount_;
        userTt[tortleVault_][user] -= amount;
        
        _approve(lpToken_, address(farmsUni), amountLp);
        amountTokenDesired = farmsUni.withdrawLpAndSwap(address(swapsUni), lpToken_, tokens_, amountOutMin_, amountLp);
        increaseBalance(user, tokens_[3], amountTokenDesired);
    }

    /**
     * @notice Function that allows to liquidate all tokens in your account by swapping them to a specific token.
     * @param user_ Address of the user whose tokens are to be liquidated.
     * @param tokens_ Array of tokens input.
     * @param amount_ Array of amounts.
     * @param amountOutMin_ Minimum amount you wish to receive.
     */
    function liquidate(
        address user_,
        uint8 provider_,
        IAsset[] memory tokens_,
        uint256 amount_,
        uint256 amountOutMin_,
        BatchSwapStep[] memory batchSwapStep_
    ) public nonReentrant onlyOwner returns (uint256) {

        uint256 userBalance = getBalance(user_, IERC20(address(tokens_[0])));
        if (userBalance < amount_) revert Nodes__InsufficientBalance();

        uint256 amountOut_;
        if (address(tokens_[0]) != address(tokens_[tokens_.length - 1])) {
            amountOut_ = swapTokens(user_, provider_, tokens_, amount_, amountOutMin_, batchSwapStep_);
        } else amountOut_ = amount_;


        // decreaseBalance(user_, tokens_[0], amount_);

        if(address(tokens_[tokens_.length - 1]) == WFTM) {
            IWETH(WFTM).withdraw(amountOut_);
            payable(user_).transfer(amountOut_);
        } else {
            IERC20(address(tokens_[tokens_.length - 1])).safeTransfer(user_, amountOut_); 
        }
        

        emit Liquidate(address(tokens_[tokens_.length - 1]), amountOut_);
        return amountOut_;
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
