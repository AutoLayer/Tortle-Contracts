const { ethers } = require('hardhat')
const nodesOldABI = require('./nodesOldABI.json')

const info= async () => {
    const vaultAddress = "0x94563A86339252A5d2148d33ce30812aFe583c19"
    const userAddress = "0xEA1D4A8Be3B2C60c20180Dcdc7c5286c00a53d2E"
    const nodes = await ethers.getContractAt(nodesOldABI, "0xEDC8736B9686808964C289E03fFab8aa24c7eb56")
    const info = await nodes.userTt(vaultAddress, userAddress)
    const ttEtherAmount = ethers.utils.formatEther(info.toString())
    console.log(ttEtherAmount)
}
info()