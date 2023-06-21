const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault, WETH_ARB, SUSHI_ARB, WETHSUSHILp, WETHSUSHITortleVault } = require('../config')
const { splitFunction } = require('./functions')

describe('Deposit On Farm', function () {
    let network
    let deployer
    let nodes
    let weth
    let token0
    let token1
    let lp
    let tortleVault
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Deposit on spooky farm', async () => {
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
                token1 = SUSHI_ARB
                lp = WETHSUSHILp
                tortleVault = WETHSUSHITortleVault
                break
        
            default:
                break
        }

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const [amountOutToken1, amountOutToken2] = await splitFunction(deployer, userAddress, weth, amountWithoutFeeInWei, token0, token1)

        const provider = 0
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, lp, tortleVault, [token0, token1], amountOutToken1, amountOutToken2, [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent = getEvent(receipt, "DepositOnFarm")

        // assert.equal(depositOnFarmEvent.args.ttAmount.toString(), '339603668395867400', 'TT amount is not correct.')
        // assert.equal(depositOnFarmEvent.args.lpBalance.toString(), '343668445926858085', 'LP amount is not correct.')
    })
})