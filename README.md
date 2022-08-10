Tortle Ninja Contracts
==============================

<div id="top"></div>



<br />
<div align="center">
  <a href="https://www.tortle.ninja/">
    <img src="./_readme/logo.png" >
  </a>
  <h3 align="center">Smart contracts</h3>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">Overview</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#Docs">Docs</a></li>
  </ol>
</details>
<br>

## Overview

Smart contract environment for helping the develop, testing, and the deployment of the tortle ninja contracts 

<br>

## Getting Started

### Prerequisites

- Install node:
  ```sh
  sudo apt install nodejs
  ```
  or install from official site https://nodejs.org/en/ 



### Installation

- Install project dependencies
  
  ```sh
  npm install
  ```



### Config

- The following env vars are required:
  
  `PRIVATE_KEY`: A wallet private key to use as the main server wallet.
  `VAULTS_PATH`: It is the path where you want to save the json file with the related information to the vaults that you have just created.
  `CONTRACTS_PATH`: It is the path where you want to save the json file with the related information to the contracts that you have just created.

<p align="right">(<a href="#top">back to top</a>)</p>


## Usage

- To run blockchain hardhat node 
  ```sh
    npx hardhat node
  ```
- To deploy the contracts on mainnet
  ```sh
    npm start start
  ```

- To deploy the contracts on testnet
  ```sh
    npm start startTestnet
  ```

- To deploy the vaults contracts on mainnet
  ```sh
    npm start createVaults
  ```

- To run the tests
  ```sh
    npx hardhat test
  ```


<p align="right">(<a href="#top">back to top</a>)</p>


## Project structure


  The small resume of the most important folders and files in the project

    .
    ├── artifacts                     # All the compiled contracts, including library contracts
    │
    ├── cache                         # Saves compiled info, to avoid recompiling without changes.
    │
    ├── contracts                     # Tortle contracts and other stuff needed for testing and deploying
    │   │
    │   └──_contracts                 # Non tortle contracts that we need for tests or deploys
    │   │     
    │   └── interfaces                # Solidity Interfaces, including tortle interfaces 
    │   │     
    │   └── lib                       # Solidity libraries
    │   
    ├── node_modules
    │   
    ├── test                          # All the test must be in this folder
    │             
    └── ...

## Docs

### Introduction

This doc has the objective of training the tortle ninja team in the fundamentals of the most important contracts with which the tortle ninja contracts interact.

### Liquidity Fund:
  The liquidity pool concept as we know it today was created by Uniswap. All contracts that do swaps use the uniswap code behind, in tortle we use spookyswap, although we will integrate more in the future.
  Two important concepts:
  - Liquidity provider -> provides liquidity.
  - User -> Make trades
  
  1. Liquidity provider first deposits 100 USD and 100 Tortles into a newly created pool. The liquidity contract will generate 100 LP Tokens, which will represent the total pool. The price in said pool is 1 Tortle / 1USD due to the reserves of each token.
   

  2. User enters a pool with 10 usdc to spend, and wants to buy tortle tokens, when making the exchange, in the pool there will now be 110 usdc left, and, 90.3 tortle the user will receive, instead of the 10 tortle, only 9.7 turtle

  The value of the lp token has been slightly maintained, since if the price of 1/1 were maintained, the total in usd would be 100.3, compared to the previous 100, the price has also been maintained. When the price of a token increases or decreases, what we know as an immediate loss occurs, since the value of the tokens separately could exceed the value of the LP.

### Farming
  What we know as farms, are a creation of Sushiswap, creators of the masterChef contract, which is the code base of all the farm contracts that we know. At tortle we use Spookyswap's masterChef for farming, we have integrated SpiritSwap, but it's stopped at the moment.

  As explained above, liquidity providers receive LP when they deposit into a liquidity pool. There are certain protocols that allow us to deposit our LP into your contract, although it will only be LP from pools that the protocol deems interesting.

  The user earns X amount of the token of said protocol for having their LP in the contract (this amount is proportional to the total LP), for example, spookyswap generates a certain amount of boo per second that is distributed according to the interest that the protocol has in encouraging one pool or another, this incentive is measured in 'allocPoint' and is relative. The spiritswap contract and the original generate tokens per block instead of per second.

  To receive the rewards (in this case, boo) we must interact with the contract, and pay the network fee

### Auto compound
  - In the liquidity pool, what is earned in commissions remains in the value of the fund, therefore it is something like an 'automatic self-compound'.
  
  - In the farms, the user who owns the LP has said LP in the masterChef contract and this gives him another token. Ex:
  
  1. Spookyswap pool partners with tortle to encourage liquidity, and we have a pool of usdc + tortle
  2. User liquidity provider deposited their LP in masterchef in order to receive their reward
  3. The reward is in boo and is received in the masterchef contract
  
  In order to self-compose, you will have to do several things and spend fees.

  4. Withdrawal of boo reward 1º Fee
  5. Exchange boo for usdc 2º Fee
  6. Exchange boo for tortle 3º Rate
  7. Deposit in the liquidity pool to obtain LP in exchange 4º Fee
  8. Deposit LP in the masterChef contract (to increase the lp and receive more % of the generated boo) 5º Fee
  
  As we can see, the most common case of autocompound, that of farming, there is a total of 5 Fee payments in the process, so many times it will not even be profitable to do autocompound, in addition to the human work of doing all of those.

### Auto compound with TORTLE
  With Tortle, we can make this process much easier and cheaper, using the TortleVault+TortleStrategy, to do this we have relied on yearn and beefy, in addition to the advantages of the tortle protocol.

  In this case, instead of each user interacting with the liquidity pool and with the masterchef contract (as we have seen, 5 FEE without contracting the Approvs), the user interacts only with our recipe.

  Our contract offers the 3 deposit options in a pool, so it is much cheaper than doing all the operations separately:
  - Deposit 1 of the 2 pool tokens
  - Deposit of the 2 tokens
  - Deposit of the Lp token if the case arises.

  In addition to saving fee over here. The best part comes when we get to the autocomposite itself. How does it work?

  Recipe -> TortleVault+TortleStrategy -> Farm

When a user wants to enter a farm, the recipe uses any of the above methods and deposits the LP in the farm through the specific vault.

In this case, the owner of the LP is not the user, but the vault, therefore, all the Boo that arrive there belong to all the users, so to autocompose if for example there are 100,000 users, those 100,000 transactions are now only one, and also the entire transformation (the 5 fee steps that we have seen before, are equivalent to 500,000 transactions if they were done separately)

But, With this method in tortle we have that only 1 is done, so autocompose becomes so cheap that it isnt necessary any specific strategy, more than someone willing to pay the fee. For now on the develop environment the vaults are almost decentralized, but everybody can interact with the vaults. For now the fees aren't paid in tortle, but maybe we put some fee here (always on the benefits!)


And, the user could have one token that is not on the pool, but with the Add funds node in the UI, connecting it to the pool, Tortle will make the deposit under the hood. We can even make that the user withdraw some tokens from the pool when some condition is met and autocompose this tokens another pool, The only thing to do put the Nodes in the correct order on the TortleUI.

The Strategy hasn't receive any fee, since the tortle team has made it. So it is more cheaper than every other pprotocol out there