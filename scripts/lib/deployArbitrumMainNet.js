const hre = require('hardhat')
const fs = require('fs')
const { WETH_ARB, USDC_ARB }  = require('../../config')

const deployMainNet = async ({ noWait = false, deployer = undefined } = {}) => {
  if (deployer === undefined) {
    const accounts = await hre.ethers.getSigners()
    deployer = accounts[0]
  }

  const dojos = process.env.DOJOS_ADDRESS
  const treasury = process.env.TREASURY_ADDRESS
  const devFund = process.env.DEV_FUND_ADDRESS

  const sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
  const camelotRouter = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
  const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'

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
    await (await hre.ethers.getContractFactory('SwapsUni')).connect(deployer).deploy(deployer.getAddress(), USDC_ARB, WETH_ARB, [sushiSwapRouter, camelotRouter])
  ).deployed()

  // SwapsBeets Contract
  const SwapBeets = await (
    await (await hre.ethers.getContractFactory('SwapsBeets')).connect(deployer).deploy(deployer.getAddress(), balancerVault, WETH_ARB)
  ).deployed()

  // DepositsBeets Contract
  const DepositsBeets = await (
    await (await hre.ethers.getContractFactory('DepositsBeets')).connect(deployer).deploy(deployer.getAddress(), balancerVault)
  ).deployed()

  // FirstTypeNestedStrategies Contract
  const FirstTypeNestedStrategies = await (
    await (await hre.ethers.getContractFactory('FirstTypeNestedStrategies')).connect(deployer).deploy()
  ).deployed()

  // SelectNestedRoute Contract
  const SelectNestedRoute = await (
    await (await hre.ethers.getContractFactory('SelectNestedRoute')).connect(deployer).deploy(FirstTypeNestedStrategies.address)
  ).deployed()

  // SelectSwapRoute Contract
  const SelectSwapRoute = await (
    await (await hre.ethers.getContractFactory('SelectSwapRoute')).connect(deployer).deploy(SwapsUni.address, SwapBeets.address)
  ).deployed()


  // FarmsUni Contract
  const FarmsUni = await (
    await (await hre.ethers.getContractFactory('FarmsUni')).connect(deployer).deploy(deployer.getAddress())
  ).deployed()

  // SelectLPRoute Contract
  const SelectLPRoute = await (
    await (await hre.ethers.getContractFactory('SelectLPRoute')).connect(deployer).deploy(FarmsUni.address, SwapsUni.address, DepositsBeets.address)
  ).deployed()

  const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [await deployer.getAddress(), SwapsUni.address, SelectSwapRoute.address, SelectLPRoute.address, SelectNestedRoute.address, Batch.address, dojos, treasury, devFund, WETH_ARB, USDC_ARB], { deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall'] })
  await ProxyNodes.deployed()
  const txSetContract0 = await Batch.setNodeContract(ProxyNodes.address)
  if (!noWait) await txSetContract0.wait(6)
  const txSetContract1 = await FarmsUni.setNodeContract(ProxyNodes.address)
  if (!noWait) await txSetContract1.wait(6)
  const txSetContract2 = await FarmsUni.setSelectLPRouteContract(SelectLPRoute.address)
  if (!noWait) await txSetContract2.wait(6)
  const txSetContract3 = await SelectNestedRoute.setNodes(ProxyNodes.address)
  if (!noWait) await txSetContract3.wait(6)
  const txSetContract4 = await SelectLPRoute.setNodes(ProxyNodes.address)
  if (!noWait) await txSetContract4.wait(6)
  const txSetContract5 = await SelectSwapRoute.setNodes(ProxyNodes.address)
  if (!noWait) await txSetContract5.wait(6)

  const contractsAddresses = {
    "ProxyNodes": ProxyNodes.address,
    "Nodes": Nodes.address,
    "SwapsUni": SwapsUni.address,
    "SwapBeets": SwapBeets.address,
    "DepositsBeets": DepositsBeets.address,
    "SelectSwapRoute": SelectSwapRoute.address,
    "SelectLPRoute": SelectLPRoute.address,
    "SelectNestedRoute": SelectNestedRoute.address,
    "FirstTypeNestedStrategies": FirstTypeNestedStrategies.address,
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

  return contractsAddresses
}

module.exports = { deployMainNet }