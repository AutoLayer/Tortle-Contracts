const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault, WETH_ARB, MAGIC_ARB, WETHMAGICLp, WETHMAGICTortleVault } = require('../config')
const { splitFunction } = require('./functions')

describe('Withdraw From Farm', function () {
    let network
    let deployer
    let nodes
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer

        switch (network) {
            case 'Fantom':
                weth = WFTM
                token0 = WFTM
                token1 = DEUS
                lp = WFTMDEUSLp
                tortleVault = WFTMDEUStortleVault
                break

            case 'Arbitrum':
                weth = WETH_ARB
                token0 = WETH_ARB
                token1 = MAGIC_ARB
                lp = WETHMAGICLp
                tortleVault = WETHMAGICTortleVault
                break
        
            default:
                break
        }
    })

    it('Withdraw from Spooky Farm', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const [amountOutToken1, amountOutToken2] = await splitFunction(nodes, deployer, userAddress, weth, amountWithoutFeeInWei, token0, token1)

        const provider = 0
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, lp, tortleVault, [token0, token1], amountOutToken1, amountOutToken2, [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent = getEvent(receipt, "DepositOnFarm").args

        const ttAmount = depositOnFarmEvent.ttAmount.toString()
        tx = await nodes.connect(deployer).withdrawFromFarm(userAddress, lp, tortleVault, [token0, token1, token1], 0, ttAmount, provider)
        receipt = await tx.wait()
        const withdrawFromFarmEvent = getEvent(receipt, "WithdrawFromFarm")
    })
})