import { HardhatRuntimeEnvironment } from "hardhat/types"
import { HardhatUserConfig, task } from "hardhat/config"

const functions = () => {
    hre.ethers.getSigners
}