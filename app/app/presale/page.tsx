"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider,  Idl, Program } from '@coral-xyz/anchor'
// @ts-ignore - local IDL json
import idl from '@/app/lib/idl/nft_marketplace.json'
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'



// Program constants
const PROGRAM_ID = new PublicKey("8KzE3LCicxv13iJx2v2V4VQQNWt4QHuvfuH8jxYnkGQ1")

const getProgram = (
  connection: any,
  walletCtx: { publicKey: PublicKey | null; signTransaction?: any; signAllTransactions?: any },
) => {
  const wallet = {
    publicKey: walletCtx.publicKey,
    signTransaction: walletCtx.signTransaction,
    signAllTransactions: walletCtx.signAllTransactions || (async (txs: any[]) => {
      if (!walletCtx.signTransaction) throw new Error('signTransaction is not available')
      const signed: any[] = []
      for (const tx of txs) signed.push(await walletCtx.signTransaction(tx))
      return signed
    }),
  } as any
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new Program(idl as Idl, PROGRAM_ID, provider)
}

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
  targetLamports: number
  startTs: number
  endTs: number
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
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet()
  const { connection } = useConnection()
  
  // State management
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const [currentStep, setCurrentStep] = React.useState(2)
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

  const getPresalePDA = () => {
    return PublicKey.findProgramAddressSync([Buffer.from("presale")], PROGRAM_ID)[0]
  }

  const getContributionPDA = (presale: PublicKey, contributor: PublicKey) => {
    return PublicKey.findProgramAddressSync([Buffer.from("contrib"), presale.toBuffer(), contributor.toBuffer()], PROGRAM_ID)[0]
  }

  // Backward compatibility helpers
  const getDonationConfigPDA = () => getPresalePDA()

  // Fetch donor list from transaction history
  const fetchDonors = async () => {
    if (!connection) return
    try {
      setLoadingDonors(true)
      const presalePDA = getPresalePDA()
      const accounts = await connection.getProgramAccounts(PROGRAM_ID)
      const disc = Buffer.from([81, 178, 219, 211, 44, 158, 224, 47]) // PresaleContribution discriminator
      const list: Donor[] = []
      for (const acc of accounts) {
        const data = acc.account.data
        if (data.length < 8 + 32 + 32 + 8) continue
        if (!data.subarray(0, 8).equals(disc)) continue
        const presaleKey = new PublicKey(data.subarray(8, 40))
        if (!presaleKey.equals(presalePDA)) continue
        const contributor = new PublicKey(data.subarray(40, 72))
        const amount = Number(data.readBigUInt64LE(72))
        list.push({ address: contributor.toString(), amount, timestamp: Date.now(), txSignature: '' })
      }
      // Sort by amount desc
      list.sort((a, b) => b.amount - a.amount)
      setDonors(list)
    } catch (error) {
      console.error('Error fetching contributors:', error)
      setDonors([])
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

  // Fetch donation configuration (read Presale account without Anchor)
  const fetchDonationConfig = async () => {
    if (!connection) return
    try {
      const presalePDA = getPresalePDA()
      const account = await connection.getAccountInfo(presalePDA)
      if (!account) {
        setDonationConfig(null)
        return
      }
      const data = account.data
      if (!data || data.length < 8 + 32 + 8 + 8 + 8 + 8 + 1 + 1) {
        setDonationConfig(null)
        return
      }
      const admin = new PublicKey(data.subarray(8, 40))
      const startTs = Number(data.readBigInt64LE(40))
      const endTs = Number(data.readBigInt64LE(48))
      const totalCollected = Number(data.readBigUInt64LE(56))
      const targetLamports = Number(data.readBigUInt64LE(64))
      const isActive = data[72] === 1
      const bump = data[73]
      setDonationConfig({ admin, totalCollected, targetLamports, startTs, endTs, isActive, bump })
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
      setStatus('Initializing presale...')

      const presalePDA = getPresalePDA()
      const initDisc = Buffer.from([9, 174, 12, 126, 150, 119, 68, 100])
      const ix = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: presalePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: initDisc,
      } as any

      const tx = new Transaction().add(ix)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(sig, 'confirmed')
      setStatus('Presale initialized successfully!')
      
      fetchDonationConfig()
      
    } catch (error: any) {
      console.error('Error initializing presale:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }


  // Access check disabled: presale is open to all
  const checkAccessNFT = async () => {
    setCurrentStep(2)
  }

  // Check donation status
  const checkDonationStatus = async () => {
    if (!publicKey) return
    
    // Check localStorage for donation status
    const donationKey = `donated_${publicKey.toString()}`
    const hasDonatedBefore = localStorage.getItem(donationKey) === 'true'
    setHasDonated(hasDonatedBefore)
  }

  // Access pass minting is not part of the current on-chain program.
  // Proceed directly to the donation step without sending a program instruction.
  const mintPresaleNFT = async () => {
    if (!publicKey) {
      setStatus('Please connect your wallet')
      return
    }
    setHasAccessNFT(true)
    setCurrentStep(2)
    setStatus('Proceeding to presale contribution...')
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
      const presalePDA = getPresalePDA()
      const contributionPDA = getContributionPDA(presalePDA, publicKey)
      const contribDisc = Buffer.from([248, 72, 28, 96, 70, 166, 8, 117])
      const amtBuf = Buffer.alloc(8)
      amtBuf.writeBigUInt64LE(BigInt(amount), 0)
      const ix = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: presalePDA, isSigner: false, isWritable: true },
          { pubkey: contributionPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([contribDisc, amtBuf]),
      } as any

      const tx = new Transaction().add(ix)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(sig, 'confirmed')
      
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
                <h3 className="text-lg font-semibold mb-1">Presale Contributors</h3>
                <p className="text-neutral-600 text-sm">View all contributors and manage presale</p>
              </div>
              <Button
                onClick={() => {
                  setShowDonorModal(true)
                  fetchDonors()
                }}
                disabled={loadingDonors}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {loadingDonors ? 'Loading...' : 'View Contributors'}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setStatus('Withdrawing...')
                    const presalePDA = getPresalePDA()
                    const disc = Buffer.from([54, 154, 35, 93, 29, 58, 10, 208]) // end_presale
                    const ix = {
                      programId: PROGRAM_ID,
                      keys: [
                        { pubkey: presalePDA, isSigner: false, isWritable: true },
                        { pubkey: publicKey!, isSigner: true, isWritable: true },
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                      ],
                      data: disc,
                    } as any
                    const tx = new Transaction().add(ix)
                    const { blockhash } = await connection.getLatestBlockhash()
                    tx.recentBlockhash = blockhash
                    tx.feePayer = publicKey!
                    const signed = await signTransaction!(tx)
                    const sig = await connection.sendRawTransaction(signed.serialize())
                    await connection.confirmTransaction(sig, 'confirmed')
                    setStatus('Withdraw completed')
                    fetchDonationConfig()
                  } catch (e: any) {
                    setStatus(`Withdraw failed: ${e.message}`)
                  }
                }}
                className="bg-black text-white hover:bg-black/80 ml-2"
              >
                Withdraw to admin
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
                  <h2 className="text-xl font-semibold lowercase">presale contributors</h2>
                  <button
                    onClick={() => setShowDonorModal(false)}
                    className="text-neutral-500 hover:text-neutral-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-neutral-600 text-sm mt-1">
                  Total contributors: {donors.length} • Total raised: {(donationConfig?.totalCollected || 0) / LAMPORTS_PER_SOL} SOL
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
                    <p className="text-neutral-500">No contributions found yet</p>
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

        {/* Step 1 removed: no access pass gating */}



        {/* Step 2: Waiting for donation config */}
        {currentStep === 2 && !donationConfig && (
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
      {currentStep === 2 && donationConfig && (
        <div className="bg-transparent shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold lowercase mb-6 text-center">join presale</h2>
          </div>
          {/* Presale progress */}
          <div className="px-4 sm:px-6 lg:px-8 text-center mb-8 w-full">
            <div className="bg-neutral-50 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                <span>{(donationConfig.totalCollected / LAMPORTS_PER_SOL).toFixed(2)} SOL raised</span>
                <span>target: {(donationConfig.targetLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
                {(() => {
                  const pct = Math.min(
                    (donationConfig.totalCollected / Math.max(donationConfig.targetLamports, 1)) * 100,
                    100,
                  )
                  return (
                    <div className="bg-black h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  )
                })()}
              </div>
              <div className="text-center text-xs text-neutral-500">
                {(() => {
                  const now = Math.floor(Date.now() / 1000)
                  const remaining = Math.max(0, donationConfig.endTs - now)
                  const hrs = Math.floor(remaining / 3600)
                  const mins = Math.floor((remaining % 3600) / 60)
                  return <span>time left: {hrs}h {mins}m</span>
                })()}
              </div>
            </div>
          </div>

          {/* Contribution controls always visible; CTA is "join presale" */}
          <>

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
                  {/* Selected amount vs target bar */}
                  <div className="w-full bg-neutral-200 rounded-full h-1 mt-3">
                    {donationConfig && (() => {
                      const selLamports = Math.floor(donationAmount[0] * LAMPORTS_PER_SOL)
                      const pctSel = Math.min((selLamports / Math.max(donationConfig.targetLamports, 1)) * 100, 100)
                      return (
                        <div className="bg-black h-1 rounded-full" style={{ width: `${pctSel}%` }} />
                      )
                    })()}
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
                       'join presale'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
        </div>
      )}
    </main>
  )
}
