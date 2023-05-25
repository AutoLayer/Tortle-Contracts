// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IFirstTypePerpetual.sol";
import "hardhat/console.sol";

contract SelectPerpRoute {
    using SafeERC20 for IERC20;

    address public owner;
    address private nodes;
    address firstTypePerpContract;

    modifier onlyAllowed() {
        require(msg.sender == owner || msg.sender == nodes, 'You must be the owner.');
        _;
    }

    constructor(address owner_, address firstTypePerpContract_) {
        owner = owner_;
        firstTypePerpContract = firstTypePerpContract_;
    }

    function setNodes(address nodes_) public onlyAllowed {
        nodes = nodes_;
    }

    /**
     * @notice Approve of a token
     * @param token_ Address of the token wanted to be approved
     * @param spender_ Address that is wanted to be approved to spend the token
     * @param amount_ Amount of the token that is wanted to be approved.
     */
    function _approve(address token_, address spender_, uint256 amount_) private {
        IERC20(token_).safeApprove(spender_, 0);
        IERC20(token_).safeApprove(spender_, amount_);
    }

    function openPerpPosition(
        bytes memory args_,
        uint256 amount_
    ) public onlyAllowed returns (bytes32 data, uint256 sizeDelta, uint256 acceptablePrice) {
        (,address indexToken_,,,,,,uint8 provider_) = abi.decode(args_, (address[], address, bool, uint256, uint256, uint256, uint256, uint8));

        if (provider_ == 0) {
            IERC20(indexToken_).safeTransferFrom(msg.sender, firstTypePerpContract, amount_);
            (data, sizeDelta, acceptablePrice) = IFirstTypePerpetual(firstTypePerpContract).openPerpPosition(args_, amount_);
        }
    }

    /**
     * @param provider_ Value: 0 - MummyFinance
    */
    function closePerpPosition(
        /*address user_,*/
        address[] memory path_,
        address indexToken_,
        uint256 collateralDelta_,
        uint256 sizeDelta_,
        bool isLong_,
        uint256 acceptablePrice_,
        uint256 amountOutMin_,
        uint8 provider_
    ) public onlyAllowed returns (bytes32 data) {
        if (provider_ == 0) {
            data = IFirstTypePerpetual(firstTypePerpContract).closePerpPosition(path_, indexToken_, collateralDelta_, sizeDelta_, isLong_, acceptablePrice_, amountOutMin_);
        }
    }

    function executeClosePerpPosition(address token_, uint256 amount_, uint8 provider_) public onlyAllowed {
        if (provider_ == 0) {
            IFirstTypePerpetual(firstTypePerpContract).executeClosePerpPosition(token_, amount_);
        }
    }
}