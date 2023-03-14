const { ethers } = require('hardhat')
const { WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault } = require('./utils')
const { userWithFarmBug } = require('../config')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')

describe('Withdraw Spooky', function () {
    const deployerAddress = "0x1a84F1f9CE6f4bF0FD2b1B4689Db53776e64bF1c"
    let deployer
    let nodes
    let tx
    let receipt
    const nodeContractAddress = "0x21057479F447BE533d86854612e3D92de89c9E70"
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