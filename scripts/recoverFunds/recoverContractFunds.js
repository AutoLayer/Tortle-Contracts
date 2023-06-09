const { ethers } = require('hardhat')
const recoverData = require('./recoverData.json')
const { nodeContractAddress } = require('../../config')

const recoverContractFunds = async () => {
    const nodesContract = await ethers.getContractAt('Nodes', nodeContractAddress)

    for (let index = 0; index < recoverData.length; index++) {
        const user = recoverData[index].user
        const token = recoverData[index].token
        const userAmount = recoverData[index].amount
        // const amount = await nodesContract.getBalance(user, token)
        // console.log('Balance: ', amount.toString())

        const sendToWallet = await nodesContract.sendToWallet(user, [token], userAmount, 0, userAmount, 0, [])
        await sendToWallet.wait(6)

        console.log(`SendToWallet ${index} done!`)
    }
}

console.log('Successful')

recoverContractFunds()