const { ethers } = require('hardhat')
const { getEvent } = require('./utils')

const splitFunction = async (deployer, userAddress, inputToken, amountIn, outputToken1, outputToken2) => {
    const args = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
        [userAddress, [inputToken, outputToken1], [inputToken, outputToken2], amountIn, [5000, 0, 0], [0, 0]]
    )
    const tx = await nodes.connect(deployer).split(args, [], [])
    const receipt = await tx.wait()
    const splitEvent = getEvent(receipt, "Split")
    const amountOutToken1 = splitEvent.args.amountOutToken1.toString()
    const amountOutToken2 = splitEvent.args.amountOutToken2.toString()

    return [amountOutToken1, amountOutToken2]
}

module.exports = {
    splitFunction
}