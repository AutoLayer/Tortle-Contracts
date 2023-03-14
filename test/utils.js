const { BigNumber } = require('ethers')

const TEST_AMOUNT = "10000000000000000000" // 10 Ether
const WFTM = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
const USDC = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
const BOO = "0x841fad6eae12c286d1fd18d1d525dffa75c7effe"
const BEETS = "0xf24bcf4d1e507740041c9cfd2dddb29585adce1e"
const DEUS = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44"
const DAI = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"

const WFTMDEUSLp = "0xaF918eF5b9f33231764A5557881E6D3e5277d456"
const WFTMDEUStortleVault = "0x4FD27cFB53eDa8C1CEF352f8adE693AeAf9ea4D8"

const WFTMDAILp = "0xe120ffBDA0d14f3Bb6d6053E90E63c572A66a428"
const WFTMDAItortleVault = "0x3B5a65E1De232f0f06da8622D7FfAa30eA42F00f"

const BN = (n) => { return BigNumber.from(n) }

const getEvent = (receipt, eventName) => { return receipt.events?.find(x => x.event == eventName) }

module.exports = {
  TEST_AMOUNT,
  WFTM,
  USDC,
  BOO,
  BEETS,
  DEUS,
  DAI,
  WFTMDEUSLp,
  WFTMDEUStortleVault,
  WFTMDAILp,
  WFTMDAItortleVault,
  BN,
  getEvent
}
