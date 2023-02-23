const { ethers } = require('hardhat')
const contractAddresses = require('../../contractsAddresses.json')
const removeOwnersList = require('./addOrRemoveOwnersList.json')

const removeOwners = async () => {
    const batchContract = await ethers.getContractAt('Batch', contractAddresses.Batch)

    await batchContract.removeOwners(removeOwnersList)
    console.log('removeOwners completed')
}

removeOwners()