const { ethers } = require('hardhat')
const recoverData = require('./recoverData.json')
const nodesOldABI = require('./nodesOldABI.json')

const recover = async () => {
    for(let index = 0; index < recoverData.length; index++) {
        const user = recoverData[index].user
        const lpToken = recoverData[index].lpToken
        const tortleVault = recoverData[index].tortleVault
        const token0 = recoverData[index].token0
        const token1 = recoverData[index].token1
        const tokenDesired = recoverData[index].tokenDesired
        const amountTokenDesiredMin = recoverData[index].amountTokenDesiredMin
        const amount = recoverData[index].amount

        const nodesContract = await ethers.getContractAt(nodesOldABI, "0xEDC8736B9686808964C289E03fFab8aa24c7eb56")

        const args_ = [lpToken, tortleVault, token0, token1, tokenDesired, amountTokenDesiredMin]

        // const balanceBefore = await nodesContract.getBalance(user, tokenDesired)
        await nodesContract.withdrawFromFarm(user, args_, amount)
        // const balanceAfter = await nodesContract.getBalance(user, tokenDesired)
        // const amountDesired = balanceAfter - balanceBefore
        // await nodesContract.sendToWallet(user, tokenDesired, amountDesired)
    }
}

recover()