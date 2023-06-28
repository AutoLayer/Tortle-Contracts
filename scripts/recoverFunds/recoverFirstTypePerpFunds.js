const { ethers } = require('hardhat')
const recoverData = require('./recoverData.json')
const { nodesFantomDevAddress, chemaAddress, WFTM, firstTypePerpetualAddress, deployerAddress } = require('../../config')

const recoverFirstTypePerpContractFunds = async () => {
    const nodesContract = await ethers.getContractAt('Nodes', nodesFantomDevAddress)

    const user = chemaAddress
    const token = WFTM
    const userAmount = '32000000000000000000' // 32 WFTM

    const owner = await nodesContract.owner()
    const executeClosePerp = await nodesContract.executeClosePerpPosition(user, firstTypePerpetualAddress, token, userAmount, '0')
    await executeClosePerp.wait(6)

    userAmount = await nodesContract.getBalance(user, token)
    const sendToWallet = await nodesContract.sendToWallet(user, [token], userAmount, 0, userAmount, 0, [])
    await sendToWallet.wait(6)

    console.log('SendToWallet done!')
}

console.log('Successful')

recoverFirstTypePerpContractFunds()