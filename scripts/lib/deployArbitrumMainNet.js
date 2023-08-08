const hre = require('hardhat')
const fs = require('fs')
const { sushiSwapRouter, camelotRouter, WETH_ARB, USDT_ARB }  = require('../../config')

const deployArbitrumMainNet = async ({ noWait = false, deployer = undefined } = {}) => {
  if (deployer === undefined) {
    const accounts = await hre.ethers.getSigners()
    deployer = accounts[0]
  }

  const dojos = process.env.DOJOS_ADDRESS
  const treasury = process.env.TREASURY_ADDRESS
  const devFund = process.env.DEV_FUND_ADDRESS

  const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'

  // GMX
  const GMX = "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868"
  const routerContract = "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064"
  const weth = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"

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
    await (await hre.ethers.getContractFactory('SwapsUni')).connect(deployer).deploy(deployer.getAddress(), USDT_ARB, WETH_ARB, [sushiSwapRouter/*, camelotRouter*/])
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

  // FirstTypePerp Contract
  const FirstTypePerpetual = await (
    await (await hre.ethers.getContractFactory('FirstTypePerpetual')).connect(deployer).deploy(deployer.getAddress(), GMX, routerContract, weth, /*'0x53b9ad09b82a313ec07040f6d8cb07bb6fd6e7ce'*/)
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


  // SelectPerpRoute Contract
  const SelectPerpRoute = await (
    await (await hre.ethers.getContractFactory('SelectPerpRoute')).connect(deployer).deploy(deployer.getAddress())
  ).deployed()


  const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [await deployer.getAddress(), SwapsUni.address, SelectSwapRoute.address, SelectLPRoute.address, SelectNestedRoute.address, SelectPerpRoute.address, Batch.address, dojos, treasury, devFund, WETH_ARB, USDT_ARB], { deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall'] })
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
  const txSetContract6 = await SelectPerpRoute.setNodes(ProxyNodes.address)
  if (!noWait) await txSetContract6.wait(6)
  const txSetContract7 = await FirstTypePerpetual.setSelectPerpRoute(SelectPerpRoute.address)
  if (!noWait) await txSetContract7.wait(6)
  const txSetContract8 = await FirstTypePerpetual.setNodes(ProxyNodes.address)
  if (!noWait) await txSetContract8.wait(6)

  const contractsAddresses = {
    "ProxyNodes": ProxyNodes.address,
    "Nodes": Nodes.address,
    "SwapsUni": SwapsUni.address,
    "SwapBeets": SwapBeets.address,
    "DepositsBeets": DepositsBeets.address,
    "SelectSwapRoute": SelectSwapRoute.address,
    "SelectLPRoute": SelectLPRoute.address,
    "SelectNestedRoute": SelectNestedRoute.address,
    "SelectPerpRoute": SelectPerpRoute.address,
    "FirstTypeNestedStrategies": FirstTypeNestedStrategies.address,
    "FirstTypePerpetual": FirstTypePerpetual.address,
    "FarmsUni": FarmsUni.address,
    "Batch": Batch.address,
    "StringUtils": StringUtils.address,
    "AddressToUintIterableMap": AddressToUintIterableMap.address
  }

  const data = JSON.stringify(contractsAddresses)
  fs.writeFile(process.env.ARBITRUM_CONTRACTS_PATH ? process.env.ARBITRUM_CONTRACTS_PATH : '/tmp/contractsAddressesArbitrum.json', data, (err) => {
    if (err) throw err

    console.log('JSON data is saved.')
  })

  return contractsAddresses
}

module.exports = { deployArbitrumMainNet }