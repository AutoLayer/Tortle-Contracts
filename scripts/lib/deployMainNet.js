const hre = require('hardhat')
const fs = require('fs')

const deployMainNet = async ({ noWait = false, deployer = undefined } = {}) => {
  if (deployer === undefined) {
    const accounts = await hre.ethers.getSigners()
    deployer = accounts[0]
  }

  const dojos = process.env.DOJOS_ADDRESS
  const treasury = process.env.TREASURY_ADDRESS
  const devFund = process.env.DEV_FUND_ADDRESS

  const uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29"
  const wftm = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
  const usdc = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
  const weth = "0x74b23882a30290451a17c44f4f05243b6b58c76d"

  const beetsVault = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce"
  const mummyFinance = "0x2d270f66fee6ac9e27ff6551af5a8cfb5c8a7493"

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

  // SelectPerpRoute Contract
  const SelectPerpRoute = await (
    await (await hre.ethers.getContractFactory('SelectPerpRoute')).connect(deployer).deploy(deployer.getAddress(), mummyFinance)
  ).deployed()

  const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [await deployer.getAddress(), SwapsUni.address, SelectSwapRoute.address, SelectLPRoute.address, SelectNestedRoute.address, SelectPerpRoute.address,Batch.address, dojos, treasury, devFund, wftm, usdc], { deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall'] })
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