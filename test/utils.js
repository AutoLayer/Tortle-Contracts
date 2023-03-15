const { BigNumber } = require('ethers')

const TEST_AMOUNT = "10000000000000000000" // 10 Ether

const BN = (n) => { return BigNumber.from(n) }

const getEvent = (receipt, eventName) => { return receipt.events?.find(x => x.event == eventName) }

module.exports = {
  TEST_AMOUNT,
  BN,
  getEvent
}
