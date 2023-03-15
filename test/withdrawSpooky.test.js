const { ethers } = require('hardhat')
const { deployerAddress, userWithFarmBug, nodeContractAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault } = require('../config')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')

describe('Withdraw Spooky', function () {
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
        const userTT = await nodes.userTt(WFTMDEUStortleVault, userWithFarmBug)
        tx = await nodes.connect(deployer).withdrawFromFarm(userWithFarmBug, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS, DEUS], 0, userTT.toString())
        receipt = await tx.wait()
        console.log("Withdraw receipt", receipt)
    })
})