// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/proxy/utils/Initializable.sol';

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/lib/contracts/libraries/Babylonian.sol';
import './lib/AddressToUintIterableMap.sol';
import './lib/StringUtils.sol';
import './interfaces/ITortleVault.sol';
import './Nodes_.sol';
import './Batch.sol';

contract Nodes is Initializable, ReentrancyGuard {
    using AddressToUintIterableMap for AddressToUintIterableMap.Map;

    address public owner;
    IUniswapV2Router02 router; // Router.
    address private FTM;
    Nodes_ public nodes_;
    Batch private batch;
    uint256 public constant minimumAmount = 1000;

    mapping(address => mapping(address => uint256)) public userLp;
    mapping(address => mapping(address => uint256)) public userTt;

    mapping(address => AddressToUintIterableMap.Map) private balance;

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

    event AddFunds(address tokenInput, uint256 amount);
    event Swap(address tokenInput, uint256 amountIn, address tokenOutput, uint256 amountOut);
    event Split(uint256 amountOutToken1, uint256 amountOutToken2);
    event Liquidate(address tokenOutput, uint256 amountOut);
    event SendToWallet(address tokenOutput, uint256 amountOut);
    event RecoverAll(address tokenOut, uint256 amountOut);

    function initializeConstructor(
        address _owner,
        Nodes_ _nodes_,
        Batch _batch,
        address _router
    ) public initializer {
        owner = _owner;
        nodes_ = _nodes_;
        batch = _batch;
        router = IUniswapV2Router02(_router); // TestNet
        FTM = router.WETH();
    }

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(batch), 'You must be the owner.');
        _;
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
        IERC20 _token,
        uint256 _amount
    ) public nonReentrant returns (uint256 amount) {
        require(_amount > 0, 'Insufficient Balance.');

        uint256 balanceBefore = _token.balanceOf(address(this));
        _token.transferFrom(_user, address(this), _amount); // Send tokens from investor account to contract account.
        uint256 balanceAfter = _token.balanceOf(address(this));
        require(balanceAfter > balanceBefore, 'Transfer Error'); // Checks that the balance of the contract has increased.

        setBalances(_user, address(_token), _amount);

        emit AddFunds(address(_token), _amount);
        return _amount;
    }

    /**
     * @notice Function that allows to add funds to the contract to execute the recipes.
     * @param _user Address of the user who will deposit the tokens.
     */
    function addFundsForFTM(address _user) public payable nonReentrant returns (address token, uint256 amount) {
        require(msg.value > 0, 'Insufficient Balance.');

        setBalances(_user, FTM, msg.value);

        emit AddFunds(FTM, msg.value);
        return (FTM, msg.value);
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
     * @param _splitStruct Struct: user, token, amount, firstToken, secondToken, percentageFirstToken, amountOutMinFirst, amountOutMinSecond.
     */
    function split(SplitStruct memory _splitStruct)
        public
        nonReentrant
        onlyOwner
        returns (uint256 amountOutToken1, uint256 amountOutToken2)
    {
        address user = _splitStruct.user;
        address token = _splitStruct.token;
        uint256 amount = _splitStruct.amount;
        address firstToken = _splitStruct.firstToken;
        address secondToken = _splitStruct.secondToken;
        uint256 percentageFirstToken = _splitStruct.percentageFirstToken;
        uint256 _amountOutMinFirst = _splitStruct.amountOutMinFirst;
        uint256 _amountOutMinSecond = _splitStruct.amountOutMinSecond;

        uint256 _userBalance = getBalance(user, IERC20(token));
        require(amount <= _userBalance, 'Insufficient Balance.');

        if (token == FTM) {
            payable(address(nodes_)).transfer(amount);
        } else {
            IERC20(token).transfer(address(nodes_), amount);
        }

        (uint256 _amountOutToken1, uint256 _amountOutToken2) = nodes_.split(
            token,
            amount,
            firstToken,
            secondToken,
            percentageFirstToken,
            _amountOutMinFirst,
            _amountOutMinSecond
        );

        setBalances(user, firstToken, _amountOutToken1);
        setBalances(user, secondToken, _amountOutToken2);

        decreaseBalance(user, token, amount);

        emit Split(_amountOutToken1, _amountOutToken2);
        return (_amountOutToken1, _amountOutToken2);
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
        IERC20 _token,
        uint256 _amount,
        address _newToken,
        uint256 _amountOutMin
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        uint256 _userBalance = getBalance(_user, _token);
        require(_amount <= _userBalance, 'Insufficient Balance.');

        if (address(_token) == FTM) {
            payable(address(nodes_)).transfer(_amount);
        } else {
            _token.transfer(address(nodes_), _amount);
        }

        uint256 _amountOut = nodes_.swapTokens(_token, _amount, _newToken, _amountOutMin);

        setBalances(_user, _newToken, _amountOut);

        decreaseBalance(_user, address(_token), _amount);

        emit Swap(address(_token), _amount, _newToken, _amountOut);
        return _amountOut;
    }

    /**
     * @notice Function that allows to liquidate all tokens in your account by swapping them to a specific token.
     * @param _user Address of the user whose tokens are to be liquidated.
     * @param _tokens Array of tokens input.
     * @param _amounts Array of amounts.
     * @param _tokenOutput Address of the token to which all tokens are to be swapped.
     */
    function liquidate(
        address _user,
        IERC20[] memory _tokens,
        uint256[] memory _amounts,
        address _tokenOutput
    ) public nonReentrant onlyOwner returns (uint256 amountOut) {
        uint256 amount;
        for (uint256 _i = 0; _i < _tokens.length; _i++) {
            address tokenInput = address(_tokens[_i]);
            uint256 amountInput = _amounts[_i];
            uint256 userBalance = getBalance(_user, IERC20(tokenInput));
            require(userBalance >= amountInput, 'Insufficient Balance.');

            uint256 _amountOut;
            if (tokenInput != _tokenOutput) {
                IERC20(tokenInput).approve(address(router), amountInput);

                uint256[] memory amountsOut;
                if (tokenInput == FTM) {
                    address[] memory path = new address[](2);
                    path[0] = FTM;
                    path[1] = _tokenOutput;

                    amountsOut = router.swapExactETHForTokens{value: amountInput}(0, path, address(this), block.timestamp);

                    _amountOut = amountsOut[amountsOut.length - 1];
                } else if (_tokenOutput == FTM) {
                    address[] memory path = new address[](2);
                    path[0] = tokenInput;
                    path[1] = FTM;

                    amountsOut = router.swapExactTokensForETH(amountInput, 0, path, address(this), block.timestamp);

                    _amountOut = amountsOut[amountsOut.length - 1];
                } else {
                    address[] memory path = new address[](3);
                    path[0] = tokenInput;
                    path[1] = FTM;
                    path[2] = _tokenOutput;

                    amountsOut = router.swapExactTokensForTokens(amountInput, 0, path, address(this), block.timestamp);

                    _amountOut = amountsOut[amountsOut.length - 1];
                }

                if (_tokenOutput == FTM) {
                    payable(_user).transfer(_amountOut);
                } else {
                    IERC20(_tokenOutput).transfer(_user, _amountOut);
                }

                amount += _amountOut;
            } else {
                if (_tokenOutput == FTM) {
                    payable(_user).transfer(amountInput);
                } else {
                    IERC20(_tokenOutput).transfer(_user, amountInput);
                }

                amount += amountInput;
            }

            decreaseBalance(_user, tokenInput, amountInput);
        }

        emit Liquidate(_tokenOutput, amount);
        return amount;
    }

    function depositOnLp(
        address user,
        address lpToken,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant onlyOwner {
        require(amount0 <= getBalance(user, IERC20(token0)), 'DepositOnLp: Insufficient token0 funds.');
        require(amount1 <= getBalance(user, IERC20(token1)), 'DepositOnLp: Insufficient token1 funds.');
        (uint256 amount0f, uint256 amount1f, uint256 lpBal) = _addLiquidity(token0, token1, amount0, amount1);
        userLp[lpToken][user] += lpBal;
        decreaseBalance(user, address(token0), amount0f);
        decreaseBalance(user, address(token1), amount1f);
    }


    function depositOnFarmLp(
        address user,
        string[] memory _arguments,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint8) {
        address lpToken = StringUtils.parseAddr(_arguments[1]);
        address tortleVault = StringUtils.parseAddr(_arguments[2]);
        uint256 amount = StringUtils.safeParseInt(_arguments[3]);
        require(amount <= getBalance(user, IERC20(lpToken)), 'depositOnFarmLp: Insufficient lpToken funds.');
        _approve(lpToken, tortleVault, amount);
        uint256 ttShares = ITortleVault(tortleVault).deposit(amount);
        userTt[tortleVault][user] += ttShares;
        decreaseBalance(user, address(lpToken), amount);
    }

    struct _dofot {
        address lpToken;
        address tortleVault;
        address token;
        uint256 amount;
        uint256 amountOutMin;
    }

    function depositOnFarmOneToken(
        address user,
        string[] memory _arguments,
        uint256[] memory auxStack
    ) external nonReentrant onlyOwner returns (uint8) {
        _dofot memory args;
        args.lpToken = StringUtils.parseAddr(_arguments[1]);
        args.tortleVault = StringUtils.parseAddr(_arguments[2]);
        args.token = StringUtils.parseAddr(_arguments[3]);
        args.amount = StringUtils.safeParseInt(_arguments[4]);
        args.amountOutMin = StringUtils.safeParseInt(_arguments[5]);
        require(args.amount >= minimumAmount, 'Tortle: Insignificant input amount');
        require(args.amount <= getBalance(user, IERC20(args.token)), 'depositOnFarmOneToken: Insufficient token funds.');

        (uint256 reserveA, uint256 reserveB, ) = IUniswapV2Pair(args.lpToken).getReserves();
        require(reserveA > minimumAmount && reserveB > minimumAmount, 'Tortle: Liquidity lp reserves too low');

        address[] memory path = new address[](2);
        path[0] = args.token;

        uint256 swapAmountIn;
        if (IUniswapV2Pair(args.lpToken).token0() == args.token) {
            path[1] = IUniswapV2Pair(args.lpToken).token1();
            swapAmountIn = _getSwapAmount(args.amount, reserveA, reserveB);
        } else {
            path[1] = IUniswapV2Pair(args.lpToken).token0();
            swapAmountIn = _getSwapAmount(args.amount, reserveB, reserveA);
        }

        _approve(path[0], address(router), swapAmountIn + args.amount);
        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            swapAmountIn,
            args.amountOutMin,
            path,
            address(this),
            block.timestamp
        );
        _approve(path[1], address(router), swapedAmounts[1]);
        (uint256 amount0f, uint256 amount1f, uint256 lpBal) = router.addLiquidity(
            path[0],
            path[1],
            args.amount - swapedAmounts[0],
            swapedAmounts[1],
            1,
            1,
            address(this),
            block.timestamp
        );

        // this approve could be made once if we always trust and allow our own vaults (which is the actual case)
        _approve(args.lpToken, args.tortleVault, lpBal);

        userTt[args.tortleVault][user] += ITortleVault(args.tortleVault).deposit(lpBal);
        decreaseBalance(user, path[0], swapedAmounts[0] + amount0f);
        setBalances(user, path[1], swapedAmounts[1] - amount1f);
    }

    function depositOnFarmTokens(address user, string[] memory _arguments)
        internal
    {
        address lpToken = StringUtils.parseAddr(_arguments[1]);
        address tortleVault = StringUtils.parseAddr(_arguments[2]);
        address token0 = StringUtils.parseAddr(_arguments[3]);
        address token1 = StringUtils.parseAddr(_arguments[4]);
        uint256 amount0 = StringUtils.safeParseInt(_arguments[5]);
        uint256 amount1 = StringUtils.safeParseInt(_arguments[6]);
        require(
            amount0 <= getBalance(user, IERC20(token0)),
            "DepositOnLp: Insufficient token0 funds."
        );
        require(
            amount1 <= getBalance(user, IERC20(token1)),
            "DepositOnLp: Insufficient token1 funds."
        );
        uint256 lpBal = _addLiquidity(token0, token1, amount0, amount1);
        _approve(lpToken, tortleVault, lpBal);
        uint256 ttShares = ITortleVault(tortleVault).deposit(lpBal);
        userTt[tortleVault][user] += ttShares;
    }

    function _addLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    )
        internal
        returns (
            uint256 amount0f,
            uint256 amount1f,
            uint256 lpBal
        )
    {
        _approve(token0, address(router), amount0);
        _approve(token1, address(router), amount1);
        (amount0f, amount1f, lpBal) = router.addLiquidity(token0, token1, amount0, amount1, 0, 0, address(this), block.timestamp);
    }

    function _approve(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).approve(spender, 0);
        IERC20(token).approve(spender, amount);
    }

    function _getSwapAmount(
        uint256 investmentA,
        uint256 reserveA,
        uint256 reserveB
    ) private view returns (uint256 swapAmount) {
        uint256 halfInvestment = investmentA / 2;
        uint256 nominator = router.getAmountOut(halfInvestment, reserveA, reserveB);
        uint256 denominator = router.quote(halfInvestment, reserveA + halfInvestment, reserveB - nominator);
        swapAmount = investmentA - (Babylonian.sqrt((halfInvestment * halfInvestment * nominator) / denominator));
    }

    function setBalances(
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
        require(_userBalance >= _amount, 'Insufficient Balance.');

        _userBalance -= _amount;
        balance[_user].set(address(_token), _userBalance);
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
        require(_userBalance >= _amount, 'Insufficient balance.');

        if (address(_token) == FTM) {
            payable(_user).transfer(_amount);
        } else {
            _token.transfer(_user, _amount);
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
        require(_tokens.length > 0, 'Enter some address.');

        for (uint256 _i = 0; _i < _tokens.length; _i++) {
            IERC20 _tokenAddress = _tokens[_i];

            for (uint256 _x = 0; _x < balance[msg.sender].size(); _x++) {
                address _tokenUserAddress = balance[msg.sender].getKeyAtIndex(_x);

                if (address(_tokenAddress) == _tokenUserAddress) {
                    uint256 _userBalance = getBalance(msg.sender, _tokenAddress);
                    require(_userBalance >= _amounts[_i], 'Insufficient balance.');

                    if (address(_tokenAddress) == FTM) {
                        payable(msg.sender).transfer(_amounts[_i]);
                    } else {
                        _tokenAddress.transfer(msg.sender, _amounts[_i]);
                    }

                    decreaseBalance(msg.sender, address(_tokenAddress), _amounts[_i]);

                    emit RecoverAll(address(_tokenAddress), _amounts[_i]);
                }
            }
        }
    }

    receive() external payable {}
}
