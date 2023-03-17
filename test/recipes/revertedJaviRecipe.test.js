const { ethers } = require('hardhat')
const { deployerAddress, javiAddress, nodeContractAddress } = require('../../config')
const { impersonateAccount } = require('@nomicfoundation/hardhat-network-helpers')

describe('Withdraw From 4 Farms', function () {
    let deployer
    let nodes
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        await impersonateAccount(deployerAddress)
        deployer = await ethers.getSigner(deployerAddress)
        nodes = await ethers.getContractAt('Nodes', nodeContractAddress)
    })

    it('Withdraw from Spooky Farm', async () => { // blockNumber: 57695098

        let balanceBeforeWithdraw
        let balanceAfterWithdraw

        let withdrawFarmCodedData
        let withdrawFarmDecodedData
        let withdrawedAmount

        // -------------- USDC-WFTM --------------
        withdrawFarmCodedData = '0x0000000000000000000000002b4c76d0dc16be1c31d4c1dc53bf9b45987fc75c000000000000000000000000b27c9a32a6fa59bcb73d2098a29c4cf9b0af124700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000168a43cb2a000000000000000000000000000000000000000000000000000000000000000300000000000000000000000004068da6c83afcfa0e13ba15a6696662335d5b7500000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c8300000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83'
        withdrawFarmDecodedData = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address[]', 'uint256', 'uint256'], withdrawFarmCodedData)

        balanceBeforeWithdraw = await nodes.connect(deployer).getBalance(javiAddress, withdrawFarmDecodedData[2][2])
        tx = await nodes.connect(deployer).withdrawFromFarm(javiAddress, withdrawFarmDecodedData[0], withdrawFarmDecodedData[1], [withdrawFarmDecodedData[2][0], withdrawFarmDecodedData[2][1], withdrawFarmDecodedData[2][2]], withdrawFarmDecodedData[3].toString(), withdrawFarmDecodedData[4].toString())
        receipt = await tx.wait()
        // console.log("Withdraw receipt", receipt)
        balanceAfterWithdraw = await nodes.connect(deployer).getBalance(javiAddress, withdrawFarmDecodedData[2][2])
        withdrawedAmount = balanceAfterWithdraw - balanceBeforeWithdraw

        // -------------- WFTM-DAI --------------
        withdrawFarmCodedData = '0x000000000000000000000000e120ffbda0d14f3bb6d6053e90e63c572a66a4280000000000000000000000003b5a65e1de232f0f06da8622d7ffaa30ea42f00f00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000001a6ab9cd8a86ffa000000000000000000000000000000000000000000000000000000000000000300000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c830000000000000000000000008d11ec38a3eb5e956b052f67da8bdc9bef8abf3e0000000000000000000000008d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'
        withdrawFarmDecodedData = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address[]', 'uint256', 'uint256'], withdrawFarmCodedData)
        tx = await nodes.connect(deployer).withdrawFromFarm(javiAddress, withdrawFarmDecodedData[0], withdrawFarmDecodedData[1], [withdrawFarmDecodedData[2][0], withdrawFarmDecodedData[2][1], withdrawFarmDecodedData[2][2]], withdrawFarmDecodedData[3].toString(), withdrawFarmDecodedData[4].toString())
        receipt = await tx.wait()
        // console.log("Withdraw receipt", receipt)

        // -------------- WFTM-DEUS --------------
        withdrawFarmCodedData = '0x000000000000000000000000af918ef5b9f33231764a5557881e6d3e5277d4560000000000000000000000004fd27cfb53eda8c1cef352f8ade693aeaf9ea4d800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000044cb8c948a7545000000000000000000000000000000000000000000000000000000000000000300000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83000000000000000000000000de5ed76e7c05ec5e4572cfc88d1acea165109e44000000000000000000000000de5ed76e7c05ec5e4572cfc88d1acea165109e44'
        withdrawFarmDecodedData = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address[]', 'uint256', 'uint256'], withdrawFarmCodedData)
        tx = await nodes.connect(deployer).withdrawFromFarm(javiAddress, withdrawFarmDecodedData[0], withdrawFarmDecodedData[1], [withdrawFarmDecodedData[2][0], withdrawFarmDecodedData[2][1], withdrawFarmDecodedData[2][2]], withdrawFarmDecodedData[3].toString(), withdrawFarmDecodedData[4].toString())
        receipt = await tx.wait()
        // console.log("Withdraw receipt", receipt)

        // -------------- FUST-WFTM --------------
        withdrawFarmCodedData = '0x0000000000000000000000005965e53aa80a0bcf1cd6dbdd72e6a9b2aa047410000000000000000000000000ab0c61bce31c20905082dc50c03cf1cf097d9a4800000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000001ab4839f9a0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000049d68029688eabf473097a2fc38ef61633a3c7a00000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c8300000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83'
        withdrawFarmDecodedData = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'address[]', 'uint256', 'uint256'], withdrawFarmCodedData)
        tx = await nodes.connect(deployer).withdrawFromFarm(javiAddress, withdrawFarmDecodedData[0], withdrawFarmDecodedData[1], [withdrawFarmDecodedData[2][0], withdrawFarmDecodedData[2][1], withdrawFarmDecodedData[2][2]], withdrawFarmDecodedData[3].toString(), withdrawFarmDecodedData[4].toString())
        receipt = await tx.wait()
        // console.log("Withdraw receipt", receipt)
    })
})