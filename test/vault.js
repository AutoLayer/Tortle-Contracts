const { expect, assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidity, beefIn, beefOut } = require('./helpers')
const { STR, WEI, sqrt, BN } = require('./utils')

const _erc20 = require('../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json')

describe('Lp, Farms and autocompound integration tests', function () {
  const percentDivisor = 10000
  const VaultDepositFEE = 10
  let accounts
  let deployer
  let wftm
  let dai
  let link
  let boo
  let uniswapFactory
  let uniswapRouter
  let masterChef
  let tortleTreasury
  let otherUser
  let otherUser2
  let TortleFarmingStrategy
  let TortleVault
  let TortleUniV2Zap
  let lpContract
  let tFarmStrategy

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    otherUser = accounts[1]
    otherUser2 = accounts[2]
    wftm = await (await (await hre.ethers.getContractFactory('WrappedFtm')).deploy()).deployed()
    dai = await (
      await (await hre.ethers.getContractFactory('WERC10')).deploy('Dai Stablecoin', 'DAI', 18, deployer.getAddress())
    ).deployed()
    link = await (
      await (await hre.ethers.getContractFactory('WERC10')).deploy('ChainLink', 'LINK', 18, deployer.getAddress())
    ).deployed()
    boo = await (await (await hre.ethers.getContractFactory('SpookyToken')).deploy()).deployed()
    uniswapFactory = await (
      await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
    ).deployed()
    uniswapRouter = await (
      await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory.address, wftm.address)
    ).deployed()
    masterChef = await (await (await hre.ethers.getContractFactory('MasterChef')).deploy(boo.address, 1)).deployed()
    tortleTreasury = await (await (await hre.ethers.getContractFactory('TortleTreasury')).deploy()).deployed()
    await boo.transferOwnership(masterChef.address)
    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')
    const _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')
    const _tortleUniV2Zap = await hre.ethers.getContractFactory('contracts/TortleUniV2Zap.sol:TortleUniV2Zap')
    const allocPoint = 2000
    const liquidity = 1000000
    await link.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
    await dai.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')

    await addLiquidity(uniswapRouter, [link.address, dai.address], [liquidity, liquidity], [0, 0], deployer.getAddress())

    const lpToken = await uniswapFactory.getPair(link.address, dai.address)
    await masterChef.add(allocPoint, lpToken)

    TortleVault = await (
      await _TortleVault.deploy(lpToken, 'LINK-DAI Spooky Vault', 'ttLINKDAI', VaultDepositFEE, WEI(9999999))
    ).deployed()
    TortleFarmingStrategy = await (
      await _TortleFarmingsStrategy.deploy(
        lpToken,
        0,
        TortleVault.address,
        tortleTreasury.address,
        uniswapRouter.address,
        masterChef.address,
        boo.address,
        wftm.address,
      )
    ).deployed()
    await TortleVault.initialize(TortleFarmingStrategy.address)
    TortleUniV2Zap = await (await _tortleUniV2Zap.deploy(uniswapRouter.address, wftm.address)).deployed()
    lpContract = await await hre.ethers.getContractAt(_erc20.abi, lpToken)
  })

  describe('Tortle Vault ', async () => {
    const lpAmountToDeposit = BN(4000)
    const lpAmountToDeposit2 = BN(500000)
    beforeEach(async () => {
      await lpContract.connect(deployer).transfer(otherUser.getAddress(), lpAmountToDeposit)
      await lpContract.connect(deployer).transfer(otherUser2.getAddress(), lpAmountToDeposit2)
      await lpContract.connect(otherUser).approve(TortleVault.address, lpAmountToDeposit)
      await lpContract.connect(otherUser2).approve(TortleVault.address, lpAmountToDeposit2)
      await TortleVault.connect(otherUser2).deposit(lpAmountToDeposit2)
      await TortleVault.connect(otherUser2).withdrawAll()
    })
    it('first deposit', async () => {
      const lpToken = lpContract.address
      const otherUser4 = accounts[3]
      const amount = 3000
      const _tVault = await hre.ethers.getContractFactory('TortleVault')
      const tVault = await (
        await _tVault.deploy(lpToken, 'LINK-DAI Spooky Vault', 'ttLINKDAI', VaultDepositFEE, WEI(9999999))
      ).deployed()
      const _tFarmStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')
      const boo2 = await (await (await hre.ethers.getContractFactory('SpookyToken')).deploy()).deployed()
      const mChef = await (await (await hre.ethers.getContractFactory('MasterChef')).deploy(boo2.address, 1)).deployed()
      await mChef.add(2000, lpToken)
      await boo2.transferOwnership(mChef.address)
      tFarmStrategy = await (
        await _tFarmStrategy.deploy(
          lpToken,
          0,
          tVault.address,
          tortleTreasury.address,
          uniswapRouter.address,
          mChef.address,
          boo.address,
          wftm.address,
        )
      ).deployed()
      await tVault.initialize(tFarmStrategy.address)
      await lpContract.connect(deployer).transfer(otherUser4.getAddress(), amount)
      await lpContract.connect(otherUser4).approve(tVault.address, amount)
      await tVault.connect(otherUser4).deposit(amount)
      const ttTokensExpected = 2997
      const ttBalanceUser = await tVault.balanceOf(otherUser4.getAddress())
      const bal = await lpContract.balanceOf(otherUser4.getAddress())
      let userInfo = await mChef.userInfo(0, tFarmStrategy.address)
      expect(ttBalanceUser).equal(ttTokensExpected)
      expect(userInfo.amount).equal(amount)
      await tVault.connect(otherUser4).withdrawAll()
    })
    describe('Deposit', async () => {
      const lpAmount = lpAmountToDeposit
      let balanceVaultStart
      let shares = 0
      beforeEach(async () => {
        balanceVaultStart = await TortleVault.balance()
        const totalSupply = await TortleVault.totalSupply()
        const ttBalanceUser = await TortleVault.balanceOf(otherUser.getAddress())
        if (totalSupply > 0) shares = ttBalanceUser.div(totalSupply)
        await TortleVault.connect(otherUser).deposit(lpAmount)
      })
      it('TT tokens are correct', async () => {
        const ttTokensExpected = 3996
        const ttBalanceUser = await TortleVault.balanceOf(otherUser.getAddress())
        expect(ttBalanceUser).equal(ttTokensExpected)
      })
      it('LP tokens are correct', async () => {
        const bal = await lpContract.balanceOf(otherUser.getAddress())
        let userInfo = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        expect(userInfo.amount).equal(lpAmount.add(balanceVaultStart))
      })
    })
    describe('Withdraw is correct', async () => {
      const lpAmount = 5000
      const lpExpected = 4993
      const leftTotalBalExpected = 5507
      let tortleShares
      let otherUser3

      beforeEach(async () => {
        otherUser3 = accounts[3]
        const otherUser10 = accounts[10]
        await lpContract.connect(deployer).transfer(otherUser10.getAddress(), lpAmount)
        await lpContract.connect(otherUser10).approve(TortleVault.address, lpAmount)
        await TortleVault.connect(otherUser10).deposit(lpAmount)
        await lpContract.connect(deployer).transfer(otherUser3.getAddress(), lpAmount)
        await lpContract.connect(otherUser3).approve(TortleVault.address, lpAmount)
        await TortleVault.connect(otherUser3).deposit(lpAmount)
        await TortleVault.connect(otherUser3).withdrawAll()
      })
      it('User receives the lpTokens in exchange for the tortle shares tokens ', async () => {
        const bal = await lpContract.balanceOf(otherUser3.getAddress())
        expect(bal).equal(lpExpected)
      })
      it('Vault total balance is correct ', async () => {
        const bal = await TortleVault.balance()
        expect(bal).equal(leftTotalBalExpected)
      })
    })
  })
  describe('TortleUniV2Zap', async () => {
    describe('Deposit', async () => {
      let userInfoInit
      beforeEach(async () => {
        await TortleVault.earn()
        await link.connect(deployer).transfer(otherUser.getAddress(), 100000)
        userInfoInit = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        const toBeefIn = BN(50000)
        await beefIn(TortleVault, link, TortleUniV2Zap, otherUser, toBeefIn)
      })
      it('Strategy has received the correct lpTokens', async () => {
        let userInfo = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        const lpExpected = BN(userInfoInit.amount).add(BN(24664))
        expect(userInfo.amount).equal(lpExpected)
      })
      it('Strategy receive the correct boo rewards', async () => {
        await masterChef.massUpdatePools()
        const pendingBooBefore = await masterChef.pendingBOO(0, TortleFarmingStrategy.address)
        const blockBefore = await hre.ethers.provider.getBlock('latest')
        await hre.network.provider.send('hardhat_mine', ['0x1000'])

        const blockAfter = await hre.ethers.provider.getBlock('latest')
        const elapsedSeconds = blockAfter.timestamp - blockBefore.timestamp

        pendingBoo = await masterChef.pendingBOO(0, TortleFarmingStrategy.address)
        const pendingBooExpected = BN(elapsedSeconds).add(BN(pendingBooBefore))
        expect(pendingBoo).equal(pendingBooExpected)
      })
    })
    describe('Withdraw', async () => {
      const lpToDeposit = BN(11000)
      const toBeefOut = BN(10000)
      beforeEach(async () => {
        await TortleVault.earn()
        await lpContract.connect(deployer).transfer(otherUser.getAddress(), lpToDeposit)
        await lpContract.connect(otherUser).approve(TortleVault.address, lpToDeposit)
        await TortleVault.connect(otherUser).deposit(lpToDeposit)
        await TortleVault.connect(otherUser).approve(TortleUniV2Zap.address, toBeefOut)
        await (await TortleUniV2Zap.connect(otherUser).beefOut(TortleVault.address, toBeefOut)).wait()
      })
      it('Tokens are correct', async () => {
        const linkBal = await link.balanceOf(otherUser.getAddress())
        const daiBal = await dai.balanceOf(otherUser.getAddress())
        expect(daiBal).equal(toBeefOut)
        expect(linkBal).equal(toBeefOut)
      })
      it('Vault total balance is correct ', async () => {
        const bal = await TortleVault.balance()
        expect(bal).equal(lpToDeposit.sub(toBeefOut))
      })
    })
  })
  describe('Batch Pools ', async () => {
    let tortleUser
    let Batch
    let Nodes
    const amount = '1000000'
    beforeEach(async () => {
      tortleUser = accounts[10]

      const StringUtils = await (await (await hre.ethers.getContractFactory('StringUtils')).deploy()).deployed()
      const AddressToUintIterableMap = await (
        await (await hre.ethers.getContractFactory('AddressToUintIterableMap')).deploy()
      ).deployed()

      Nodes = await (
        await (
          await hre.ethers.getContractFactory('Nodes', {
            libraries: {
              StringUtils: StringUtils.address,
              AddressToUintIterableMap: AddressToUintIterableMap.address,
            },
          })
        ).deploy()
      ).deployed()
      Batch = await (
        await (
          await hre.ethers.getContractFactory('Batch', {
            libraries: {
              StringUtils: StringUtils.address,
            },
          })
        ).deploy(deployer.getAddress())
      ).deployed()
      const Nodes_ = await (
        await (await hre.ethers.getContractFactory('Nodes_')).deploy(Nodes.address, uniswapRouter.address)
      ).deployed()
      await Batch.setNodeContract(Nodes.address)
      await Nodes.initializeConstructor(Batch.address, Nodes_.address, Batch.address, uniswapRouter.address)
      await link.connect(deployer).transfer(tortleUser.getAddress(), amount)
      await dai.connect(deployer).transfer(tortleUser.getAddress(), amount)
      await link.connect(tortleUser).approve(Nodes.address, '5000000000000000000000000000')
      await dai.connect(tortleUser).approve(Nodes.address, '5000000000000000000000000000')
      await lpContract.connect(tortleUser).approve(Nodes.address, '5000000000000000000000000000')

      await link.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
      await dai.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
    })
    describe('deposit on Lp', async () => {
      beforeEach(async () => {
        const _args1 = [link.address, amount]
        const _args2 = [dai.address, amount]
        const _args3 = [lpContract.address, link.address, dai.address, amount, amount]
        const addFundsForTokens1 = {
          id: 1,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args1,
          hasNext: true,
        }
        const addFundsForTokens2 = {
          id: 2,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args2,
          hasNext: true,
        }
        const depositOnLp = {
          id: 3,
          functionName: 'depositOnLp',
          user: tortleUser.getAddress(),
          arguments: _args3,
          hasNext: false,
        }
        await Batch.batchFunctions([addFundsForTokens1, addFundsForTokens2, depositOnLp])
      })
      it('Lp balance in contract is correct', async () => {
        const expectedBalance = 1000000
        const balance = await lpContract.balanceOf(Nodes.address)
        expect(balance).to.equal(expectedBalance)
      })
      it('User Tokens Balance is correct', async () => {
        const expectedBalance = 0
        const balance0 = await Nodes.getBalance(tortleUser.getAddress(), link.address)
        const balance1 = await Nodes.getBalance(tortleUser.getAddress(), dai.address)
        expect(balance0).to.equal(expectedBalance)
        expect(balance1).to.equal(expectedBalance)
      })
      it('User lp tracking is correct', async () => {
        const expectedBalance = 1000000
        const balance = await Nodes.userLp(lpContract.address, tortleUser.getAddress())
        expect(balance).to.equal(expectedBalance)
      })
    })
    describe('Deposit Lp to Farm', async () => {
      const lpAmount = '5000'
      beforeEach(async () => {
        await addLiquidity(uniswapRouter, [link.address, dai.address], [lpAmount, lpAmount], [0, 0], tortleUser.getAddress())
        const _args1 = [lpContract.address, lpAmount]
        const _args2 = ['depositOnFarmLp(address,string[],uint256[])', lpContract.address, TortleVault.address, lpAmount]
        const addFundsForTokens = {
          id: 1,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args1,
          hasNext: true,
        }
        const depositOnLp = {
          id: 2,
          functionName: 'depositOnFarm',
          user: tortleUser.getAddress(),
          arguments: _args2,
          hasNext: false,
        }
        await Batch.batchFunctions([addFundsForTokens, depositOnLp])
      })
      it('Lp balance is correct', async () => {
        const expectedBalance = 5000
        let userInfo = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        expect(userInfo.amount).equal(expectedBalance)
      })
      it('User Tt tracking is correct', async () => {
        const expectedBalance = 4995
        const balance = await Nodes.userTt(TortleVault.address, tortleUser.getAddress())
        expect(balance).to.equal(expectedBalance)
      })
    })
    describe('Deposit One Token to Farm', async () => {
      const amount = '4000'
      beforeEach(async () => {
        await addLiquidity(uniswapRouter, [link.address, dai.address], [amount, amount], [0, 0], tortleUser.getAddress())
        const _args1 = [link.address, amount]
        const _args2 = [
          'depositOnFarmOneToken(address,string[],uint256[])',
          lpContract.address,
          TortleVault.address,
          link.address,
          amount,
          0,
        ]
        const addFundsForTokens = {
          id: 1,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args1,
          hasNext: true,
        }
        const depositOnLp = {
          id: 2,
          functionName: 'depositOnFarm',
          user: tortleUser.getAddress(),
          arguments: _args2,
          hasNext: false,
        }
        await Batch.batchFunctions([addFundsForTokens, depositOnLp])
      })
      it('Lp balance is correct', async () => {
        const expectedBalance = 1995
        let userInfo = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        expect(userInfo.amount).equal(expectedBalance)
      })
      it('User Tt tracking is correct', async () => {
        const expectedBalance = 1993
        const balance = await Nodes.userTt(TortleVault.address, tortleUser.getAddress())
        expect(balance).to.equal(expectedBalance)
      })
    })
    describe('Deposit Tokens to Farm', async () => {
      const amount = '4000'
      beforeEach(async () => {
        await addLiquidity(uniswapRouter, [link.address, dai.address], [amount, amount], [0, 0], tortleUser.getAddress())

        const _args1 = [link.address, amount]
        const _args2 = [dai.address, amount]
        const _args3 = [
          'depositOnFarmTokens(address,string[],uint256[])',
          lpContract.address,
          TortleVault.address,
          link.address,
          dai.address,
          amount,
          amount,
        ]
        const addFundsForTokens1 = {
          id: 1,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args1,
          hasNext: true,
        }
        const addFundsForTokens2 = {
          id: 2,
          functionName: 'addFundsForTokens',
          user: tortleUser.getAddress(),
          arguments: _args2,
          hasNext: true,
        }
        const depositOnLp = {
          id: 3,
          functionName: 'depositOnFarm',
          user: tortleUser.getAddress(),
          arguments: _args3,
          hasNext: false,
        }
        await Batch.batchFunctions([addFundsForTokens1, addFundsForTokens2, depositOnLp])
      })
      it('Lp balance is correct', async () => {
        const expectedBalance = 4000
        let userInfo = await masterChef.userInfo(0, TortleFarmingStrategy.address)
        expect(userInfo.amount).equal(expectedBalance)
      })
      it('User Tt tracking is correct', async () => {
        const expectedBalance = 3996
        const balance = await Nodes.userTt(TortleVault.address, tortleUser.getAddress())
        expect(balance).to.equal(expectedBalance)
      })
    })
  })
})
