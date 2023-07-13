require('dotenv').config()
const { deployMainNet } = require('./lib/deployMainNet')
const { deployArbitrumMainNet } = require('./lib/deployArbitrumMainNet')

switch (process.env.NETWORK) {
    case 'Fantom':
        deployMainNet()
        break

    case 'Arbitrum':
        deployArbitrumMainNet()
        break

    default:
        break
}
