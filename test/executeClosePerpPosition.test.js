const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { impersonateAccount } = require('@nomicfoundation/hardhat-network-helpers')
const { ethers } = require('hardhat')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM } = require('../config')
const { deployerAddress, javiAddress, nodeContractAddress } = require('../config')

describe('Execute Close Perpetual Position', function () {
    let deployer
    let nodes
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Open Perpetual Position with FTM', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT) // 40 FTM

       tx = await nodes.connect(deployer).executeClosePerpPosition('0xc0190c13c2b919c1a4fb55473bedebee082d31af', '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', amountWithoutFeeInWei, '0')
       receipt = await tx.wait()
    })
})