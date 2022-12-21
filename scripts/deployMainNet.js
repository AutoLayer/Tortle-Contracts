const hre = require('hardhat')
const fs = require('fs')
require('dotenv').config()

const deployMainNet = async () => {
  const accounts = await hre.ethers.getSigners()
  const deployer = accounts[0]
  const dojos = process.env.DOJOS_ADDRESS
  const treasury = process.env.TREASURY_ADDRESS
  const devFund = process.env.DEV_FUND_ADDRESS

  const uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29"
  const wftm = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
  const usdc = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
  const weth = "0x74b23882a30290451a17c44f4f05243b6b58c76d"

  const beetsVault = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce"

  const StringUtils = await (await (await hre.ethers.getContractFactory('StringUtils')).connect(deployer).deploy()).deployed()
  const AddressToUintIterableMap = await (
    await (await hre.ethers.getContractFactory('AddressToUintIterableMap')).connect(deployer).deploy()
  ).deployed()

  // Nodes Contract
  const Nodes = await ethers.getContractFactory('Nodes', {
    libraries: {
      AddressToUintIterableMap: AddressToUintIterableMap.address,
    },
  })

  // Batch Contract
  const Batch = await (
    await (
      await hre.ethers.getContractFactory('Batch', {
        libraries: {
          StringUtils: StringUtils.address,
        },
      })
    )
      .connect(deployer)
      .deploy(deployer.getAddress())
  ).deployed()

  // SwapsUni Contract
  const SwapsUni = await (
    await (await hre.ethers.getContractFactory('SwapsUni')).connect(deployer).deploy(deployer.getAddress(), usdc, weth, [uniswapRouter])
  ).deployed()

  // SwapsBeets Contract
  const SwapBeets = await (
    await (await hre.ethers.getContractFactory('SwapsBeets')).connect(deployer).deploy(deployer.getAddress(), beetsVault, wftm)
  ).deployed()

  // DepositsBeets Contract
  const DepositsBeets = await (
    await (await hre.ethers.getContractFactory('DepositsBeets')).connect(deployer).deploy(deployer.getAddress(), beetsVault)
  ).deployed()

  // NestedStrategies Contract
  const NestedStrategies = await (
    await (await hre.ethers.getContractFactory('NestedStrategies')).connect(deployer).deploy()
  ).deployed()

  // FarmsUni Contract
  const FarmsUni = await (
    await (await hre.ethers.getContractFactory('FarmsUni')).connect(deployer).deploy(deployer.getAddress())
  ).deployed()

  const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [Batch.address, SwapsUni.address, SwapBeets.address, DepositsBeets.address, NestedStrategies.address, FarmsUni.address, Batch.address, dojos, treasury, devFund, wftm, usdc], { deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall'] })
  await ProxyNodes.deployed()
  const txSetNodesBatch = await Batch.setNodeContract(ProxyNodes.address)
  await txSetNodesBatch.wait(6)
  await FarmsUni.setNodeContract(ProxyNodes.address)

  const contractsAddresses = {
    "ProxyNodes": ProxyNodes.address,
    "Nodes": Nodes.address,
    "SwapsUni": SwapsUni.address,
    "SwapBeets": SwapBeets.address,
    "DepositsBeets": DepositsBeets.address,
    "NestedStrategies": NestedStrategies.address,
    "FarmsUni": FarmsUni.address,
    "Batch": Batch.address,
    "StringUtils": StringUtils.address,
    "AddressToUintIterableMap": AddressToUintIterableMap.address
  }

  const data = JSON.stringify(contractsAddresses)
  fs.writeFile(process.env.CONTRACTS_PATH ? process.env.CONTRACTS_PATH : '/tmp/contractsAddresses.json', data, (err) => {
    if (err) throw err

    console.log('JSON data is saved.')
  })
}

deployMainNet()