"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Keypair,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { cn } from "@/lib/utils"

// Program constants
const PROGRAM_ID = new PublicKey("8KzE3LCicxv13iJx2v2V4VQQNWt4QHuvfuH8jxYnkGQ1")

interface PresaleConfig {
  presaleMint: PublicKey
  price: number
  isActive: boolean
  totalMinted: number
  maxSupply: number
  bump: number
}

interface MarketplaceData {
  admin: PublicKey
  feeBps: number
  bump: number
}

interface DonationConfig {
  admin: PublicKey
  totalCollected: number
  isActive: boolean
  bump: number
}

interface Donor {
  address: string
  amount: number
  timestamp: number
  txSignature: string
}

export default function PresalePage() {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  
  // State management
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const [currentStep, setCurrentStep] = React.useState(1) // 1: Mint NFT, 2: Donate
  const [hasAccessNFT, setHasAccessNFT] = React.useState<boolean | null>(null)
  const [presaleConfig, setPresaleConfig] = React.useState<PresaleConfig | null>(null)
  const [marketplace, setMarketplace] = React.useState<MarketplaceData | null>(null)
  const [donationConfig, setDonationConfig] = React.useState<DonationConfig | null>(null)
  
  // Donation states
  const [donationAmount, setDonationAmount] = React.useState([0.1])
  const [hasDonated, setHasDonated] = React.useState(false)

  // Donor list states
  const [showDonorModal, setShowDonorModal] = React.useState(false)
  const [donors, setDonors] = React.useState<Donor[]>([])
  const [loadingDonors, setLoadingDonors] = React.useState(false)

  // Helper functions
  const getMarketplacePDA = () => {
    return PublicKey.findProgramAddressSync([Buffer.from("marketplace")], PROGRAM_ID)[0]
  }

  const getPresaleConfigPDA = () => {
    return PublicKey.findProgramAddressSync([Buffer.from("presale_config")], PROGRAM_ID)[0]
  }

  const getDonationConfigPDA = () => {
    return PublicKey.findProgramAddressSync([Buffer.from("donation_config")], PROGRAM_ID)[0]
  }

  // Fetch donor list from transaction history
  const fetchDonors = async () => {
    if (!connection || !donationConfig) return
    
    try {
      setLoadingDonors(true)
      console.log('Fetching donation transactions...')
      
      const donationConfigPDA = getDonationConfigPDA()
      
      // Get all signatures for the donation config account
      const signatures = await connection.getSignaturesForAddress(
        donationConfigPDA,
        { limit: 100 } // Get last 100 transactions
      )
      
      console.log('Found signatures:', signatures.length)
      
      const donorList: Donor[] = []
      
      for (const sigInfo of signatures) {
        try {
          // Get transaction details
          const tx = await connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          })
          
          if (!tx || !tx.meta || tx.meta.err) continue
          
          // Check if this is a donation transaction
          const message = tx.transaction.message
          const accountKeys = message.getAccountKeys()
          
          // Look for our program in the instructions
          const programInstructions = message.compiledInstructions.filter(
            instruction => accountKeys.get(instruction.programIdIndex)?.equals(PROGRAM_ID)
          )
          
          if (programInstructions.length === 0) continue
          
          // Check instruction data for donate discriminator
          for (const instruction of programInstructions) {
            const data = Buffer.from(instruction.data)
            const discriminator = data.slice(0, 8)
            const donateDiscriminator = Buffer.from([121, 186, 218, 211, 73, 70, 196, 180])
            
            if (discriminator.equals(donateDiscriminator)) {
              // This is a donation transaction
              const amount = data.readBigUInt64LE(8) // Amount starts at byte 8
              
              // Find the donor (signer) address
              const signerIndex = instruction.accountKeyIndexes.find((accountIndex: number) => {
                return message.isAccountSigner(accountIndex)
              })
              
              if (signerIndex !== undefined) {
                const donorAddress = accountKeys.get(signerIndex)
                
                if (donorAddress) {
                  donorList.push({
                    address: donorAddress.toString(),
                    amount: Number(amount),
                    timestamp: (tx.blockTime || 0) * 1000,
                    txSignature: sigInfo.signature
                  })
                  
                  console.log('Found donation:', {
                    donor: donorAddress.toString().slice(0, 8) + '...',
                    amount: Number(amount) / LAMPORTS_PER_SOL,
                    signature: sigInfo.signature.slice(0, 8) + '...'
                  })
                }
              }
            }
          }
        } catch (txError) {
          console.warn('Error processing transaction:', sigInfo.signature, txError)
        }
      }
      
      // Sort by timestamp (newest first)
      donorList.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log('Total donors found:', donorList.length)
      setDonors(donorList)
      
    } catch (error) {
      console.error('Error fetching donors:', error)
      setStatus('Error fetching donor list')
    } finally {
      setLoadingDonors(false)
    }
  }

  // Fetch marketplace data
  const fetchMarketplace = async () => {
    if (!connection) return
    
    try {
      const marketplacePDA = getMarketplacePDA()
      const account = await connection.getAccountInfo(marketplacePDA)
      
      if (account) {
        console.log('Marketplace found')
        const data = account.data
        const admin = new PublicKey(data.slice(8, 40))
        const feeBps = data.readUInt16LE(40)
        const bump = data[42]
        
        setMarketplace({ admin, feeBps, bump })
      } else {
        console.log('Marketplace not found')
        setMarketplace(null)
      }
    } catch (error) {
      console.error('Error fetching marketplace:', error)
    }
  }

  // Fetch donation configuration
  const fetchDonationConfig = async () => {
    if (!connection) return
    
    try {
      const donationConfigPDA = getDonationConfigPDA()
      console.log('Fetching donation config:', donationConfigPDA.toString())
      
      const account = await connection.getAccountInfo(donationConfigPDA)
      
      if (account) {
        console.log('Donation config found, data length:', account.data.length)
        
        const data = account.data
        const admin = new PublicKey(data.slice(8, 40))
        const totalCollected = data.readBigUInt64LE(40)
        const isActive = data[48] === 1
        const bump = data[49]
        
        console.log('Donation config:', {
          admin: admin.toString(),
          totalCollected: Number(totalCollected),
          isActive,
          bump
        })
        
        setDonationConfig({
          admin,
          totalCollected: Number(totalCollected),
          isActive,
          bump
        })
        
      } else {
        console.log('Donation config not found')
        setDonationConfig(null)
      }
    } catch (error) {
      console.error('Error fetching donation config:', error)
      setDonationConfig(null)
    }
  }

  // Initialize donation system (admin only)
  const initializeDonation = async () => {
    if (!publicKey || !signTransaction || !marketplace) {
      setStatus('Please connect wallet and ensure marketplace is initialized')
      return
    }

    try {
      setLoading(true)
      setStatus('Initializing donation system...')

      const marketplacePDA = getMarketplacePDA()
      const donationConfigPDA = getDonationConfigPDA()

      const initDonationInstruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: marketplacePDA, isSigner: false, isWritable: false },
          { pubkey: donationConfigPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([126, 69, 140, 217, 145, 65, 209, 132]), // initialize_donation discriminator from IDL
      }

      const transaction = new Transaction().add(initDonationInstruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log('Donation system initialized!')
      setStatus('Donation system initialized successfully!')
      
      fetchDonationConfig()
      
    } catch (error: any) {
      console.error('Error initializing donation:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Fetch presale configuration
  const fetchPresaleConfig = async () => {
    try {
      const presaleConfigPDA = getPresaleConfigPDA()
      console.log('Fetching presale config:', presaleConfigPDA.toString())
      
      const account = await connection.getAccountInfo(presaleConfigPDA)
      
      if (account) {
        console.log('Presale config found, data length:', account.data.length)
        
        const data = account.data
        const presaleMint = new PublicKey(data.slice(8, 40))
        const price = data.readBigUInt64LE(40)
        const isActive = data[48] === 1
        const totalMinted = data.readBigUInt64LE(49)
        const maxSupply = data.readBigUInt64LE(57)
        const bump = data[65]
        
        setPresaleConfig({
          presaleMint,
          price: Number(price),
          isActive,
          totalMinted: Number(totalMinted),
          maxSupply: Number(maxSupply),
          bump
        })
        
      } else {
        console.log('Presale config not found')
        setPresaleConfig(null)
      }
    } catch (error) {
      console.error('Error fetching presale config:', error)
      setPresaleConfig(null)
    }
  }

  // Check for access NFT
  const checkAccessNFT = async () => {
    if (!publicKey || !connection) return
    
    try {
      setHasAccessNFT(null)
      console.log('Checking for Access Pass...')
      
      // Check localStorage first for quick access
      const savedAccessNFTs = JSON.parse(localStorage.getItem('presaleNFTs') || '[]')
      const hasStoredAccess = savedAccessNFTs.some((nft: any) => 
        nft.owner === publicKey.toString() && nft.name === "mini&mega Access Pass"
      )
      
      if (hasStoredAccess) {
        setHasAccessNFT(true)
        setCurrentStep(2) // Move to donation step
        return
      }

      // Check on-chain token accounts
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      })

      let foundAccessNFT = false

      for (const tokenAccount of tokenAccounts.value) {
        try {
          const accountData = await connection.getParsedAccountInfo(tokenAccount.pubkey)
          const parsedData = accountData.value?.data as any
          
          if (parsedData?.parsed?.info?.tokenAmount?.decimals === 0 && 
              parsedData?.parsed?.info?.tokenAmount?.uiAmount > 0) {
            
            const mintAddress = parsedData.parsed.info.mint
            console.log('Found NFT with mint:', mintAddress)
            
            try {
              const metadataPDA = await PublicKey.findProgramAddress(
                [
                  Buffer.from('metadata'),
                  new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
                  new PublicKey(mintAddress).toBuffer(),
                ],
                new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
              )

              const metadataAccount = await connection.getAccountInfo(metadataPDA[0])
              if (metadataAccount) {
                const data = metadataAccount.data.toString()
                if (data.includes('mini&mega Access Pass') || data.includes('GFAP')) {
                  console.log('Access NFT found!')
                  
                  // Save to localStorage
                  const nftData = {
                    mint: mintAddress,
                    owner: publicKey.toString(),
                    name: "mini&mega Access Pass",
                    symbol: "GFAP"
                  }
                  
                  const existingNFTs = JSON.parse(localStorage.getItem('presaleNFTs') || '[]')
                  const nftExists = existingNFTs.some((nft: any) => nft.mint === mintAddress)
                  
                  if (!nftExists) {
                    existingNFTs.push(nftData)
                    localStorage.setItem('presaleNFTs', JSON.stringify(existingNFTs))
                  }
                  
                  foundAccessNFT = true
                  setCurrentStep(2) // Move to donation step
                  break
                }
              }
            } catch (error) {
              console.log('Error checking metadata for mint:', mintAddress)
            }
          }
        } catch (accountError) {
          console.error('Error parsing token account:', accountError)
        }
      }
      
      setHasAccessNFT(foundAccessNFT)
      
    } catch (error) {
      console.error('Error checking access NFT:', error)
      setHasAccessNFT(false)
    }
  }

  // Check donation status
  const checkDonationStatus = async () => {
    if (!publicKey) return
    
    // Check localStorage for donation status
    const donationKey = `donated_${publicKey.toString()}`
    const hasDonatedBefore = localStorage.getItem(donationKey) === 'true'
    setHasDonated(hasDonatedBefore)
  }

  // Mint presale NFT
  const mintPresaleNFT = async () => {
    if (!publicKey || !signTransaction || !presaleConfig) {
      setStatus('Please connect your wallet and wait for presale to load')
      return
    }

    try {
      setLoading(true)
      setStatus('Minting Access Pass...')

      const marketplacePDA = getMarketplacePDA()
      const presaleConfigPDA = getPresaleConfigPDA()
      const nftMint = Keypair.generate()
      
      const buyerTokenAccount = await getAssociatedTokenAddress(
        nftMint.publicKey,
        publicKey
      )

      const metadataPDA = await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          nftMint.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )

      const mintPresaleInstruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: marketplacePDA, isSigner: false, isWritable: false },
          { pubkey: presaleConfigPDA, isSigner: false, isWritable: true },
          { pubkey: marketplace?.admin || publicKey, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint.publicKey, isSigner: true, isWritable: true },
          { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: metadataPDA[0], isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'), isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([201, 197, 156, 166, 208, 236, 41, 144]), // mint_presale_nft discriminator
      }

      const transaction = new Transaction().add(mintPresaleInstruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      transaction.partialSign(nftMint)
      const signedTx = await signTransaction(transaction)
      
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log('Access Pass minted successfully!')
      setStatus('Access Pass minted! Moving to donation step...')
      
      // Save mint info to localStorage
      const savedNFTs = JSON.parse(localStorage.getItem('presaleNFTs') || '[]')
      savedNFTs.push({
        name: 'mini&mega Access Pass',
        symbol: 'GFAP',
        mint: nftMint.publicKey.toString(),
        owner: publicKey.toString(),
        timestamp: Date.now()
      })
      localStorage.setItem('presaleNFTs', JSON.stringify(savedNFTs))
      
      setHasAccessNFT(true)
      setCurrentStep(2)
      
      // Recheck config
      setTimeout(() => {
        fetchPresaleConfig()
      }, 2000)
      
    } catch (error: any) {
      console.error('Error minting presale NFT:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Make donation using contract
  const makeDonation = async () => {
    if (!publicKey || !signTransaction || !connection || !donationConfig) {
      setStatus('Please connect wallet and ensure donation system is initialized')
      return
    }
    
    try {
      setLoading(true)
      setStatus('Making donation...')
      
      const amount = Math.floor(donationAmount[0] * LAMPORTS_PER_SOL)
      const donationConfigPDA = getDonationConfigPDA()
      
      // Encode donation amount as 8-byte little endian
      const amountBuffer = Buffer.alloc(8)
      amountBuffer.writeBigUInt64LE(BigInt(amount), 0)
      
      const donateInstruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: donationConfigPDA, isSigner: false, isWritable: true },
          { pubkey: donationConfig.admin, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([121, 186, 218, 211, 73, 70, 196, 180]), // donate discriminator from IDL
          amountBuffer
        ]),
      }

      const transaction = new Transaction().add(donateInstruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      setStatus(`Donated ${donationAmount[0]} SOL successfully! You can now access the marketplace.`)
      
      // Mark as donated
      const donationKey = `donated_${publicKey.toString()}`
      localStorage.setItem(donationKey, 'true')
      setHasDonated(true)
      
      // Refresh donation config to get updated stats
      setTimeout(() => {
        fetchDonationConfig()
      }, 2000)
      
    } catch (error: any) {
      console.error('Error making donation:', error)
      setStatus(`Error making donation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Initialize on wallet connection
  React.useEffect(() => {
    if (connected && publicKey) {
      fetchMarketplace()
      fetchPresaleConfig()
      fetchDonationConfig()
      checkAccessNFT()
      checkDonationStatus()
    }
  }, [connected, publicKey])

  // Check if user is admin
  const isAdmin = marketplace && publicKey && marketplace.admin.equals(publicKey)

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // If not connected, show connect message
  if (!connected) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight lowercase mb-4">
            mini mega presale
          </h1>
          <p className="text-neutral-600 mb-8">
            Connect your wallet to get started
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight lowercase mb-4">
          
          </h1>
         
        </div>

        {/* Admin Controls */}
        {isAdmin && !donationConfig && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Admin Setup Required</h3>
              <p className="text-neutral-600 mb-4">Initialize the donation system to enable support functionality.</p>
              <Button
                onClick={initializeDonation}
                disabled={loading}
                className="bg-yellow-600 text-white hover:bg-yellow-700"
              >
                {loading ? 'Initializing...' : 'Initialize Donation System'}
              </Button>
            </div>
          </div>
        )}

        {/* Admin Donor List */}
        {isAdmin && donationConfig && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Donor Management</h3>
                <p className="text-neutral-600 text-sm">View all supporters who made donations</p>
              </div>
              <Button
                onClick={() => {
                  setShowDonorModal(true)
                  fetchDonors()
                }}
                disabled={loadingDonors}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {loadingDonors ? 'Loading...' : 'View Donors'}
              </Button>
            </div>
          </div>
        )}

        {/* Donor List Modal */}
        {showDonorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold lowercase">donation supporters</h2>
                  <button
                    onClick={() => setShowDonorModal(false)}
                    className="text-neutral-500 hover:text-neutral-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-neutral-600 text-sm mt-1">
                  Total donors: {donors.length} • Total raised: {(donationConfig?.totalCollected || 0) / LAMPORTS_PER_SOL} SOL
                </p>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                {loadingDonors ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl mb-4">Loading</div>
                    <p className="text-neutral-500">Loading donation history...</p>
                  </div>
                ) : donors.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl mb-4">Empty</div>
                    <p className="text-neutral-500">No donations found yet</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="space-y-3">
                      {donors.map((donor, index) => (
                        <div key={index} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {index + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-mono text-sm font-semibold">
                                    {donor.address.slice(0, 8)}...{donor.address.slice(-8)}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {formatDate(donor.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                {(donor.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL
                              </p>
                              <a
                                href={`https://explorer.solana.com/tx/${donor.txSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-700"
                              >
                                View TX
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {status && (
          <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <div className="text-sm text-center text-neutral-600">
              {status}
            </div>
          </div>
        )}

        {/* Step 1: Mint Access Pass */}
        {currentStep === 1 && (
          <div className="p-6">
            
            
            {hasAccessNFT === null && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">Checking</div>
                <p className="text-neutral-500 lowercase">checking for existing access pass...</p>
              </div>
            )}

            {hasAccessNFT === false && presaleConfig && (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: 'linear-gradient(45deg,rgba(255, 255, 255, 0.31),rgba(4, 15, 34, 0))',
                    borderRadius: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                    margin: '0 auto 20px'
                  }}>
                    <img src="/stylized-town-hall-isometric.png" alt="" style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }} />
                  </div>
                  <h3 className="text-lg font-semibold lowercase mb-2">mini&mega access pass</h3>
                  <p className="text-sm text-neutral-600">your key to exclusive features</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span>price:</span>
                    <span className="font-semibold">{(presaleConfig.price / LAMPORTS_PER_SOL).toFixed(3)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>minted:</span>
                    <span>{presaleConfig.totalMinted} / {presaleConfig.maxSupply}</span>
                  </div>
                 
                </div>

             

                <Button
                  onClick={mintPresaleNFT}
                  disabled={loading || !presaleConfig.isActive || presaleConfig.totalMinted >= presaleConfig.maxSupply}
                  className="w-full bg-black text-white hover:bg-black/90 py-3 lowercase"
                >
                  {loading ? 'minting...' : 
                   !presaleConfig.isActive ? 'presale inactive' :
                   presaleConfig.totalMinted >= presaleConfig.maxSupply ? 'sold out' :
                   `mint access pass (${(presaleConfig.price / LAMPORTS_PER_SOL).toFixed(3)} sol)`}
                </Button>
              </div>
            )}
          </div>
        )}



        {/* Step 2: Waiting for donation config */}
        {currentStep === 2 && hasAccessNFT && !donationConfig && (
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">Setup</div>
              <h3 className="text-lg font-semibold lowercase mb-2">setting up donation system...</h3>
              <p className="text-neutral-600 mb-6">Please wait while the admin initializes the donation system.</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Support Project - FULL WIDTH OUTSIDE CONTAINER */}
      {currentStep === 2 && hasAccessNFT && donationConfig && (
        <div className="bg-transparent shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold lowercase mb-6 text-center">join presale</h2>
          </div>
          
          {!hasDonated ? (
            <>
              {/* Real Donation Progress */}
              <div className="px-4 sm:px-6 lg:px-8 text-center mb-8 w-full">
                <div className="bg-neutral-50 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
                  <div className="flex justify-between text-sm text-neutral-600 mb-2">
                    <span>{(donationConfig.totalCollected / LAMPORTS_PER_SOL).toFixed(1)} SOL raised</span>
                    <span>∞ SOL goal</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-black h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((donationConfig.totalCollected / LAMPORTS_PER_SOL / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-center text-xs text-neutral-500">
                    
                  </div>
                </div>
              </div>

              <div className="w-full space-y-6">
                <div className="px-4 sm:px-6 lg:px-8 text-center">
                  <div className="text-4xl font-bold mb-2">
                    {donationAmount[0].toFixed(2)} <span className="text-lg font-normal text-neutral-600">SOL</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    help us build the future of mini&mega
                  </div>
                </div>

                {/* Full-width slider section - TRULY FULL WIDTH */}
                <div className="w-full space-y-4">
                  <div className="w-full">
                    <Slider
                      value={donationAmount}
                      onValueChange={setDonationAmount}
                      max={1000}
                      min={0.1}
                      step={0.1}
                      className="w-full [&_[role=slider]]:w-6 [&_[role=slider]]:h-6 [&_[role=slider]]:rounded-none [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-black [&_[data-slot=slider-track]]:h-[0.05rem] [&_[data-slot=slider-range]]:h-[0.05rem]"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>0.1 SOL</span>
                    <span>1000 SOL</span>
                  </div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8">
                  <div className="max-w-lg mx-auto">
                    <Button 
                      className="w-full bg-black text-white hover:bg-black/90 lowercase"
                      onClick={makeDonation}
                      disabled={loading || !donationConfig.isActive}
                    >
                      {loading ? 'processing...' : 
                       !donationConfig.isActive ? 'donations inactive' :
                       'support project'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">Success</div>
              <h3 className="text-lg font-semibold lowercase mb-2">thank you for your support!</h3>
              <p className="text-neutral-600 mb-6">you've completed the presale process and can now access the marketplace.</p>
              <Button
                onClick={() => window.location.href = '/app/marketplace'}
                className="bg-black text-white hover:bg-black/90 lowercase"
              >
                enter marketplace
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
