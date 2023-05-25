const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { ethers } = require('hardhat')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM } = require('../config')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')
const { deployerAddress } = require('../config')
const { deployMainNet } = require('../scripts/lib/deployMainnet')

describe('Open Perpetual Position', function () {
    let deployer
    let nodes
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        await impersonateAccount(deployerAddress)
        deployer = await ethers.getSigner(deployerAddress)

        const contractsAddresses = await deployMainNet({ noWait: true, deployer })
        nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)
        batch = await ethers.getContractAt('Batch', contractsAddresses.Batch)

        // await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

    })

    it('Open Perpetual Position with FTM', async () => {

        const function1 = {
            recipeId: '451',
            id: 'node_ebf4b8e6fb434eefbd87a7054619e825_1683103690601',
            functionName: 'addFundsForFTM((string,string,string,address,bytes,bool))',
            user: '0xc0190c13c2b919c1a4fb55473bedebee082d31af',
            arguments: '0x000000000000000000000000000000000000000000000000016345785d8a0000',
            hasNext: true
          }
        const function2 = {
            recipeId: '451',
            id: 'node_3031907f1cce45fda191c9568fdfa506_1683103690603',
            functionName: 'swapTokens((string,string,string,address,bytes,bool))',
            user: '0xc0190c13c2b919c1a4fb55473bedebee082d31af',
            arguments: '0x00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c8300000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            hasNext: true
          }
        const function3 = {
            recipeId: '451',
            id: 'node_3031907f1cce45fda191c9568fdfa506_1683103690603',
            functionName: 'openPerpPosition((string,string,string,address,bytes,bool))',
            user: '0xc0190c13c2b919c1a4fb55473bedebee082d31af',
            arguments: '0x00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c8300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a6f663059fd108c1f4600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83',
            hasNext: false
          }
        // tx = await nodes.connect(deployer).addFundsForFTM(function1)
        tx = await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: "50000000000000000000" })
        tx = await batch.connect(deployer).swapTokens(function2)
        tx = await batch.connect(deployer).openPerpPosition(function3)
    })
})