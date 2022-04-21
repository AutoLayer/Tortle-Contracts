const { BigNumber } = require('ethers')

const STR = (x) => {
  return x.toString()
}
const WEI = (n) => {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}
const sqrt = (value) => {
  const bn = require('bignumber.js')
  return BigNumber.from(new bn(value.toString()).sqrt().toFixed().split('.')[0])
}

const BN = (n) => {
  return BigNumber.from(n)
}

module.exports = {
  STR,
  WEI,
  sqrt,
  BN,
}
