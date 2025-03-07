import Network from '#models/Network.js'
import React, { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react'
import Token from '#models/Token.js'
import Transaction from '#models/Transaction.js'
import logger from '#logger/index.js'
import { BigNumber, utils } from 'ethers'
import { L1_NETWORK } from '#utils/constants.js'
import { ERC20Mintable__factory } from '@hop-protocol/sdk/contracts'
import { formatError } from '#utils/format.js'
import { getTokenDecimals } from '#utils/tokens.js'
import { l1Network } from '#config/networks.js'
import { toTokenDisplay } from '#utils/index.js'
import { useApp } from '#contexts/AppContext/index.js'
import { useWeb3Context } from '#contexts/Web3Context.js'

type FaucetContextProps = {
  mintToken: (tokenSymbol: string) => void
  mintAmount: string
  setMintAmount: (amount: string) => void
  isMinting: boolean
  tokens: Token[]
  error: string
  setError: (error: string) => void
  success: string
  setSuccess: (error: string) => void
  selectedNetwork: Network
}

const FaucetContext = createContext<FaucetContextProps>({
  mintToken: (tokenSymbol: string) => {},
  mintAmount: '',
  setMintAmount: (amount: string) => {},
  isMinting: false,
  tokens: [],
  error: '',
  setError: (error: string) => {},
  success: '',
  setSuccess: (error: string) => {},
  selectedNetwork: l1Network,
})

const FaucetContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mintAmount, setMintAmount] = useState<string>('')
  const [isMinting, setMinting] = useState<boolean>(false)
  const { selectedBridge, txHistory, tokens } = useApp()
  const selectedNetwork = l1Network
  const { checkConnectedNetworkId, address, provider } = useWeb3Context()
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    setError('')
    setSuccess('')
  }, [selectedBridge])

  const mintToken = async (tokenSymbol: string) => {
    try {
      setError('')
      setSuccess('')
      if (!selectedNetwork?.networkId) return
      const networkId = Number(selectedNetwork.networkId)
      const isNetworkConnected = await checkConnectedNetworkId(networkId)
      if (!isNetworkConnected) {
        throw new Error('wrong network connected')
      }

      if (!tokenSymbol) return

      let address = ''
      if (tokenSymbol === 'HOP') {
        address = '0x38aF6928BF1Fd6B3c768752e716C49eb8206e20c' // token/faucet contract
      }
      if (tokenSymbol === 'USDT') {
        address = '0xfad6367E97217cC51b4cd838Cc086831f81d38C2' // token/faucet contract
      }
      if (tokenSymbol === 'DAI') {
        address = '0xb93cba7013f4557cDFB590fD152d24Ef4063485f' // token/faucet contract
      }
      if (tokenSymbol === 'UNI') {
        address = '0x41E5E6045f91B61AACC99edca0967D518fB44CFB' // token/faucet contract
      }
      if (!address) {
        return
      }

      if (!provider) {
        return
      }

      const signer = provider?.getSigner()
      if (!signer) {
        return
      }

      setMinting(true)
      const recipient = await signer.getAddress()
      const tokenDecimals = getTokenDecimals(tokenSymbol)
      const parsedAmount = utils.parseUnits(mintAmount, tokenDecimals)
      const contract = ERC20Mintable__factory.connect(address, signer)

      const txOptions: any = {}
      if (['USDT', 'DAI', 'UNI', 'HOP'].includes(tokenSymbol)) {
        const oneEth = utils.parseEther('1')
        const tokenRates = {
          USDT: BigNumber.from('2000000000'),
          DAI: BigNumber.from('2000000000000000000000'),
          UNI: BigNumber.from('378071833650000000000'),
          HOP: BigNumber.from('10000000000000000000000'),
        }
        const msgValue = parsedAmount.mul(oneEth).div(tokenRates[tokenSymbol])
        txOptions.value = msgValue

        const balance = await signer.getBalance()
        if (balance.lt(msgValue)) {
          throw new Error(`Insufficient balance: ${toTokenDisplay(balance, 18, 'ETH', 4)}. Need ${toTokenDisplay(msgValue, 18, 'ETH', 4)} to mint ${tokenSymbol}`)
        }
      }
      const tx = await contract?.mint(recipient, parsedAmount, txOptions)
      logger.debug('mint:', tx?.hash)

      txHistory?.addTransaction(
        new Transaction({
          hash: tx?.hash,
          networkName: L1_NETWORK,
        })
      )
      await tx?.wait()
      setSuccess(`Successfully minted ${mintAmount} ${tokenSymbol}`)
    } catch (err) {
      setError(formatError(err, selectedNetwork))
      logger.error(err)
    }
    setMinting(false)
  }

  return (
    <FaucetContext.Provider
      value={{
        mintToken,
        mintAmount,
        setMintAmount,
        isMinting,
        selectedNetwork,
        tokens,
        error,
        setError,
        success,
        setSuccess
      }}
    >
      {children}
    </FaucetContext.Provider>
  )
}

export const useFaucet = () => useContext(FaucetContext)

export default FaucetContextProvider
