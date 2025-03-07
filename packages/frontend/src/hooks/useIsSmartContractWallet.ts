import { useEffect, useState } from 'react'
import { useWeb3Context } from '#contexts/Web3Context.js'

export default function useIsSmartContractWallet() {
  const { provider, address } = useWeb3Context()
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false)

  useEffect(() => {
    const checkAddress = async () => {
      if (!provider || !address) return

      const code = await provider.getCode(address.address)
      setIsSmartContractWallet(code !== '0x')
    }

    checkAddress()
  }, [provider, address])

  return {
    isSmartContractWallet,
  }
}
