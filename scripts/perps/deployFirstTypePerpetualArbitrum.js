const { ethers, upgrades } = require('hardhat')
const fs = require('fs-extra')
require('dotenv').config()
const addresses = require('../../contractArbitrumAddresses.json')

const deployFirstTypePerpetual = async () => {

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]

    const GMX = "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868"
    const routerContract = "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064"
    const weth = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"

    let numContracts = 10
    let contractsAddresses = []
    for (let i = 0; i < numContracts; i++) {
        // FirstTypePerp Contract
        const FirstTypePerpetual = await (
            await (await hre.ethers.getContractFactory('FirstTypePerpetual')).connect(deployer).deploy(deployer.getAddress(), GMX, routerContract, weth)
        ).deployed()

        const tx0 = await FirstTypePerpetual.setSelectPerpRoute(addresses.SelectPerpRoute)
        await tx0.wait(2)
        const tx1 = await FirstTypePerpetual.setNodes(addresses.ProxyNodes)
        contractsAddresses.push(FirstTypePerpetual.address)
        await tx1.wait(2)
        console.log("Deployed: ", FirstTypePerpetual.address)
    }


    const data = JSON.stringify(contractsAddresses)
    fs.writeFile(process.env.PERPS_PATH ? process.env.PERPS_PATH : '/tmp/FirstTypeArbitrumPerpetualAddresses.json', data, (err) => {
        if (err) throw err
    })
    console.log('JSON data is saved.')

}

deployFirstTypePerpetual()
