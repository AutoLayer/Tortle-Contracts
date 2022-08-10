const hre = require('hardhat')
const fs = require('fs')
require('dotenv').config()

const deployMainNet = async () => {
    const accounts = await hre.ethers.getSigners()
    const deployer = accounts[0]

    const uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29"

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
    await (await hre.ethers.getContractFactory('Nodes_')).connect(deployer).deploy(deployer.getAddress(), [uniswapRouter])
    ).deployed()

    const ProxyNodes = await hre.upgrades.deployProxy(Nodes, [Batch.address, Nodes_.address, Batch.address, uniswapRouter], {deployer, initializer: 'initializeConstructor', unsafeAllow: ['external-library-linking', 'delegatecall']})
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