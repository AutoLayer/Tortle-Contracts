const { ethers, upgrades } = require('hardhat')
const fs = require('fs-extra')
require('dotenv').config()
const addresses = require('../../contractsAddresses.json')

const deployFirstTypePerpetual = async () => {

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]

    const wftm = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
    const mummyFinance = "0x2d270f66fee6ac9e27ff6551af5a8cfb5c8a7493"
    const routerContract = "0x41cD8CaFc24A771031B9eB9C57cFC94D86045eB6"

    let numContracts = 2
    let contractsAddresses = []
    for (let i = 0; i < numContracts; i++) {
        // FirstTypePerp Contract
        const FirstTypePerpetual = await (
            await (await hre.ethers.getContractFactory('FirstTypePerpetual')).connect(deployer).deploy(deployer.getAddress(), mummyFinance, routerContract, wftm)
        ).deployed()

        console.log("Set", addresses.SelectPerpRoute)
        const tx0 = await FirstTypePerpetual.setSelectPerpRoute(addresses.SelectPerpRoute)
        await tx0.wait(2)
        console.log("Here")
        const tx1 = await FirstTypePerpetual.setNodes(addresses.ProxyNodes)
        contractsAddresses.push(FirstTypePerpetual.address)
        await tx1.wait(2)
    }


    const data = JSON.stringify(contractsAddresses)
    fs.writeFile(process.env.PERPS_PATH ? process.env.PERPS_PATH : '/tmp/FirstTypePerpetualAddresses.json', data, (err) => {
        if (err) throw err
    })
    console.log('JSON data is saved.')

}

deployFirstTypePerpetual()
