const hre = require('hardhat')
const fs = require('fs-extra')

const deployBatch = async () => {
  const addresses = await fs.readJSON('./addresses.json')

  const accounts = await hre.ethers.getSigners()
  const deployer = accounts[0]

  const uniswapRouter = await hre.ethers.getContractAt('UniswapV2Router02', addresses.contracts.UniswapV2Router02)

  const StringUtils = await (await (await hre.ethers.getContractFactory('StringUtils')).connect(deployer).deploy()).deployed()
  const AddressToUintIterableMap = await (
    await (await hre.ethers.getContractFactory('AddressToUintIterableMap')).connect(deployer).deploy()
  ).deployed()
  const Nodes = await (
    await (
      await hre.ethers.getContractFactory('Nodes', {
        libraries: {
          StringUtils: StringUtils.address,
          AddressToUintIterableMap: AddressToUintIterableMap.address,
        },
      })
    )
      .connect(deployer)
      .deploy()
  ).deployed()
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
  const Nodes_ = await (
    await (await hre.ethers.getContractFactory('Nodes_')).connect(deployer).deploy(Nodes.address, uniswapRouter.address)
  ).deployed()
  await Batch.setNodeContract(Nodes.address)
  await Nodes.initializeConstructor(Batch.address, Nodes_.address, Batch.address, uniswapRouter.address)
  console.log('Nodes:', await Nodes.address)
  console.log('Nodes_:', await Nodes_.address)
  console.log('Batch:', await Batch.address)
}

deployBatch()
