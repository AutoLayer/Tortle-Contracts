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
  const usdc = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
  const weth = "0x74b23882a30290451a17c44f4f05243b6b58c76d"

  const StringUtils = await (await (await hre.ethers.getContractFactory('StringUtils')).connect(deployer).deploy()).deployed()
  const AddressToUintIterableMap = await (
    await (await hre.ethers.getContractFactory('AddressToUintIterableMap')).connect(deployer).deploy()
  ).deployed()

  // Nodes Contract
  const Nodes = await ethers.getContractFactory('Nodes', {
    libraries: {
      StringUtils: StringUtils.address,
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

  // Nodes_ Contract
  const Nodes_ = await (
    await (await hre.ethers.getContractFactory('Nodes_')).connect(deployer).deploy(deployer.getAddress(), usdc, weth, [uniswapRouter])
  ).deployed()

  const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [Batch.address, Nodes_.address, Batch.address, dojos, treasury, devFund, usdc, uniswapRouter], { deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall'] })
  await ProxyNodes.deployed()
  await Batch.setNodeContract(ProxyNodes.address)

  const contractsAddresses = {
    "ProxyNodes": ProxyNodes.address,
    "Nodes": Nodes.address,
    "Nodes_": Nodes_.address,
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