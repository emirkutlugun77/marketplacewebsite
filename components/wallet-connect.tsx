"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { clusterApiUrl } from '@solana/web3.js'

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css'

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  // Use devnet for development, mainnet-beta for production
  const network = WalletAdapterNetwork.Devnet
  const endpoint = React.useMemo(() => clusterApiUrl(network), [network])
  
  const wallets = React.useMemo(
    () => {
      const walletList = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ]
      
      // Filter out duplicates based on adapter name
      const uniqueWallets = walletList.filter((wallet, index, self) => 
        index === self.findIndex(w => w.name === wallet.name)
      )
      
      return uniqueWallets
    },
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          console.error('Wallet provider error:', error)
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

function WalletConnectInner() {
  const { connected, publicKey, disconnect, connecting, wallet } = useWallet()

  // Handle connection errors
  React.useEffect(() => {
    if (wallet) {
      const handleError = (error: any) => {
        console.error('Wallet adapter error:', error)
      }

      wallet.adapter.on('error', handleError)
      
      // Cleanup listener on unmount or wallet change
      return () => {
        try {
          wallet.adapter.off('error', handleError)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [wallet])

  // Register user on backend when wallet connects
  React.useEffect(() => {
    const address = publicKey?.toString()
    if (!connected || !address) return
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: address }),
    }).catch(() => {})
  }, [connected, publicKey])

  if (connecting) {
    return (
      <Button
        variant="outline"
        className="h-10 px-4 text-sm border-black text-black bg-transparent"
        disabled
      >
        Connecting...
      </Button>
    )
  }

  if (connected && publicKey) {
    const address = publicKey.toString()
    const short = `${address.slice(0, 4)}...${address.slice(-4)}`
    
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm text-neutral-700">{short}</span>
        <Button
          variant="outline"
          className="h-10 px-4 text-sm border-black text-black hover:bg-black/5 bg-transparent"
          onClick={async () => {
            try {
              await disconnect()
            } catch (error) {
              console.error('Disconnect error:', error)
            }
          }}
          disabled={connecting}
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <WalletMultiButton 
      className="!bg-transparent !border !border-black !text-black hover:!bg-black/5 !h-10 !px-4 !text-sm !rounded-md"
    />
  )
}

// Dynamic import to prevent SSR hydration issues
const DynamicWalletConnect = dynamic(
  () => Promise.resolve(() => (
    <WalletContextProvider>
      <WalletConnectInner />
    </WalletContextProvider>
  )),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        className="h-10 px-4 text-sm border-black text-black bg-transparent"
        disabled
      >
        Loading...
      </Button>
    ),
  }
)

export default function WalletConnect() {
  return <DynamicWalletConnect />
}
