const { ethers } = require('hardhat')
const { BigNumber } = require('ethers')

const TEST_AMOUNT = "18880699806375671828" // 50 Ether
const FEE_AMOUNT = 0.005 // 0.50%

const BN = (n) => { return BigNumber.from(n) }

const getEvent = (receipt, eventName) => { return receipt.events?.find(x => x.event == eventName) }

const calculateAmountWithoutFees = (amount) => {
  const amountInEthers = ethers.utils.formatEther(amount)
  const amountWithoutFeeInEthers = amountInEthers - (amountInEthers * FEE_AMOUNT)

  return ethers.utils.parseEther(amountWithoutFeeInEthers.toString())
}

const WEI = (etherAmount) => {
  return ethers.utils.parseUnits(etherAmount.toString(), "ether")
}

module.exports = {
  TEST_AMOUNT,
  FEE_AMOUNT,
  BN,
  WEI,
  getEvent,
  calculateAmountWithoutFees
}
