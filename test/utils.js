const { BigNumber } = require('ethers')

const BN = (n) => { return BigNumber.from(n) }

const getEvent = (receipt, eventName) => { return receipt.events?.find(x => x.event == eventName) }

module.exports = {
  BN,
  getEvent
}
