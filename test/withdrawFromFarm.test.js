const { ethers } = require('hardhat')
const { deployerAddress, nodeContractAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault, userAddress } = require('../config')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')

describe('Withdraw From Farm', function () {
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

    it('Withdraw from Spooky Farm', async () => {
        const userTT = await nodes.getBalance(userAddress, WFTMDEUStortleVault)
        const provider = 0
        tx = await nodes.connect(deployer).withdrawFromFarm(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS, DEUS], 0, userTT.toString(), provider)
        receipt = await tx.wait()
        console.log("Withdraw receipt", receipt)
    })
})