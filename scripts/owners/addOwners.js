const { ethers } = require('hardhat')
const contractAddresses = require('../../contractsAddresses.json')
const addOwnersList = require('./addOrRemoveOwnersList.json')

const addOwners = async () => {
    const batchContract = await ethers.getContractAt('Batch', contractAddresses.Batch)

    await batchContract.addOwners(addOwnersList)
    console.log('addOwners completed')
}

addOwners()