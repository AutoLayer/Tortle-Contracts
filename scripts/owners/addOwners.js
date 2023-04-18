const { ethers } = require('hardhat')
require('dotenv').config()
const fs = require('fs')
const contractAddressesPath = process.env.CONTRACTS_PATH ? process.env.CONTRACTS_PATH : '/tmp/contractsAddresses.json'
const contractAddressesRaw = fs.readFileSync(contractAddressesPath)
const contractAddresses = JSON.parse(contractAddressesRaw)
const addOwnersList = require('./addOrRemoveOwnersList.json')

const addOwners = async () => {
    const batchContract = await ethers.getContractAt('Batch', contractAddresses.Batch)

    await batchContract.addOwners(addOwnersList)
    console.log('addOwners completed')
}

addOwners()