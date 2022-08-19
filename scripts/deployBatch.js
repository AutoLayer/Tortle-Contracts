const { ethers, upgrades } = require('hardhat')
const fs = require('fs-extra')
require('dotenv').config()

const deployBatch = async () => {
  const addresses = await fs.readJSON('./addresses.json')

  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const dojos = process.env.DOJOS_ADDRESS
  const treasury = process.env.TREASURY_ADDRESS
  const devFund = process.env.DEV_FUND_ADDRESS

  const uniswapRouter = await ethers.getContractAt('UniswapV2Router02', addresses.contracts.UniswapV2Router02)
  const spookyRouter = await ethers.getContractAt('UniswapV2Router02', '0xa6AD18C2aC47803E193F75c3677b14BF19B94883')
  const usdc = '0xC0106d67E1BDCf167FC18d5B279B343703aa4922'
  
  const StringUtils = await (await (await ethers.getContractFactory('StringUtils')).connect(deployer).deploy()).deployed()
  const AddressToUintIterableMap = await (
    await (await ethers.getContractFactory('AddressToUintIterableMap')).connect(deployer).deploy()
  ).deployed()

  const Nodes = await ethers.getContractFactory('Nodes', {
        libraries: {
          StringUtils: StringUtils.address,
          AddressToUintIterableMap: AddressToUintIterableMap.address,
        },
      })
  
  const Batch = await (
    await (
      await ethers.getContractFactory('Batch', {
        libraries: {
          StringUtils: StringUtils.address,
        },
      })
    )
      .connect(deployer)
      .deploy(deployer.getAddress())
  ).deployed()

  const Nodes_ = await (
    await (await ethers.getContractFactory('Nodes_')).connect(deployer).deploy(deployer.getAddress(), [uniswapRouter.address, spookyRouter.address])
  ).deployed()

  const ProxyNodes = await upgrades.deployProxy(Nodes, [Batch.address, Nodes_.address, Batch.address, dojos, treasury, devFund, usdc, uniswapRouter.address], {deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall']})
  await ProxyNodes.deployed()
  await Batch.setNodeContract(ProxyNodes.address)

  console.log('Proxy Nodes:', ProxyNodes.address)
  console.log('Nodes:', Nodes.address)
  console.log('Nodes_:', Nodes_.address)
  console.log('Batch:', Batch.address)
  console.log('StringUtils:', StringUtils.address)
  console.log('AddressToUintIterableMap', AddressToUintIterableMap.address)
}

deployBatch()
