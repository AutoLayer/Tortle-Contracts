const { BigNumber } = require('ethers')

const TEST_AMOUNT = "10000000000000000000" // 10 Ether
const WFTM = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
const USDC = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
const BOO = "0x841fad6eae12c286d1fd18d1d525dffa75c7effe"

const BN = (n) => { return BigNumber.from(n) }

const getEvent = (receipt, eventName) => { return receipt.events?.find(x => x.event == eventName) }

module.exports = {
  TEST_AMOUNT,
  WFTM,
  USDC,
  BOO,
  BN,
  getEvent
}
