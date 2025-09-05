'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  TransactionInstruction, 
  Keypair,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  MINT_SIZE, 
  getMinimumBalanceForRentExemptMint 
} from '@solana/spl-token'

// Updated Program ID
const PROGRAM_ID = new PublicKey('12LJUQx5mfVfqACGgEac65Xe6PMGnYm5rdaRRcU4HE7V')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

// Compute instruction discriminators at runtime to avoid drift
async function instructionDiscriminator(name: string): Promise<Uint8Array> {
  const preimage = new TextEncoder().encode(`global:${name}`)
  const hash = await crypto.subtle.digest('SHA-256', preimage)
  return new Uint8Array(hash).slice(0, 8)
}

// Account discriminators for parsing
const MARKETPLACE_ACCOUNT_DISCRIMINATOR = [70, 222, 41, 62, 78, 3, 32, 174] // Marketplace
const COLLECTION_ACCOUNT_DISCRIMINATOR = [243, 209, 195, 150, 192, 176, 151, 165] // NFTCollection
// NftType account discriminator is not hardcoded; parse heuristically

interface Marketplace {
  admin: PublicKey
  fee_bps: number
  total_collections: number
  bump: number
}

interface NFTCollection {
  admin: PublicKey
  name: string
  symbol: string
  uri: string
  royalty: number
  mint: PublicKey
  is_active: boolean
  bump: number
  pda?: PublicKey
}

interface NFTItemType {
  collection: PublicKey
  name: string
  uri: string
  price: number
  max_supply: number
  current_supply: number
  bump: number
}

export default function MarketplacePage() {
  const { publicKey, connected, signTransaction } = useWallet()
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null)
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [itemTypesByCollection, setItemTypesByCollection] = useState<Record<string, NFTItemType[]>>({})
  const [activeTab, setActiveTab] = useState<'marketplace' | 'inventory' | 'admin'>('marketplace')
  const [pinataJWT, setPinataJWT] = useState('')
  const [pinName, setPinName] = useState('')
  const [pinSymbol, setPinSymbol] = useState('')
  const [pinDescription, setPinDescription] = useState('')
  const [pinExternalUrl, setPinExternalUrl] = useState('')
  const [pinAttributes, setPinAttributes] = useState('[]')
  const [pinImageFile, setPinImageFile] = useState<File | null>(null)
  // Admin: item type form fields
  const [itemTypeName, setItemTypeName] = useState('')
  const [itemTypeSymbol, setItemTypeSymbol] = useState('')
  const [itemTypePrice, setItemTypePrice] = useState('0.1')
  const [itemTypeMaxSupply, setItemTypeMaxSupply] = useState('1000')
  // Admin: item type modal & pinata
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [typeImageFile, setTypeImageFile] = useState<File | null>(null)
  const [typeDescription, setTypeDescription] = useState('')
  const [typeAttributes, setTypeAttributes] = useState<{trait_type:string; value:string}[]>([])
  const [pinApiKey, setPinApiKey] = useState('d24e9fb3ee90ae7a492e')
  const [pinApiSecret, setPinApiSecret] = useState('85fd7ed50fb600505bc45f626a176ff410f828c6fe0a6ed6ed10903886a99c4d')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Hydration guard
  const [isMounted, setIsMounted] = useState(false)

  // Form states
  const [collectionName, setCollectionName] = useState('')
  const [collectionSymbol, setCollectionSymbol] = useState('')
  const [collectionUri, setCollectionUri] = useState('')
  const [royalty, setRoyalty] = useState('500') // 5% in basis points

  // Mint form states
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null)
  const [selectedAdminCollection, setSelectedAdminCollection] = useState<NFTCollection | null>(null)
  const [selectedTypeName, setSelectedTypeName] = useState('')
  const [myMints, setMyMints] = useState<{ mint: PublicKey; metadata?: any; name?: string; image?: string; collectionName?: string }[]>([])
  // Preloaded type images for marketplace grid
  const [typeImages, setTypeImages] = useState<Record<string, string>>({})
  const [typeCategories, setTypeCategories] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState<'troop' | 'building' | 'utility' | null>(null)

  // Inventory cache helpers
  const inventoryCacheKey = React.useMemo(() => (publicKey ? `inventory:${publicKey.toBase58()}` : null), [publicKey?.toBase58()])
  const loadInventoryFromCache = React.useCallback(() => {
    try {
      if (!inventoryCacheKey) return
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(inventoryCacheKey) : null
      if (!raw) return
      const arr = JSON.parse(raw) as { mint: string; metadata?: any; name?: string; image?: string; collectionName?: string }[]
      const items = arr.map(it => ({
        mint: new PublicKey(it.mint),
        metadata: it.metadata,
        name: it.name,
        image: it.image,
        collectionName: it.collectionName,
      }))
      setMyMints(items)
    } catch {}
  }, [inventoryCacheKey])
  const saveInventoryToCache = React.useCallback((items: { mint: PublicKey; metadata?: any; name?: string; image?: string; collectionName?: string }[]) => {
    try {
      if (!inventoryCacheKey) return
      const serializable = items.map(it => ({
        mint: it.mint.toBase58(),
        metadata: it.metadata,
        name: it.name,
        image: it.image,
        collectionName: it.collectionName,
      }))
      if (typeof window !== 'undefined') window.localStorage.setItem(inventoryCacheKey, JSON.stringify(serializable))
    } catch {}
  }, [inventoryCacheKey])

  // On wallet connect, load cached inventory immediately, then refresh in background
  useEffect(() => {
    loadInventoryFromCache()
    if (publicKey) {
      // background refresh
      fetchMyNfts()
    }
  }, [publicKey, loadInventoryFromCache])

  // Utility: parse on-chain + off-chain data for a single mint and push to state/cache
  const addMintToInventory = React.useCallback(async (mint: PublicKey) => {
    try {
      const [metadataPDA] = getMetadataPDA(mint)
      const metadataAccount = await connection.getAccountInfo(metadataPDA)
      if (!metadataAccount) return
      const d = metadataAccount.data
      let off = 1; off += 32; off += 32
      const nameLen = d.readUInt32LE(off); off += 4
      const name = d.slice(off, off + nameLen).toString('utf8').replace(/\0+$/, ''); off += nameLen
      const symbolLen = d.readUInt32LE(off); off += 4
      off += symbolLen
      const uriLen = d.readUInt32LE(off); off += 4
      const uri = d.slice(off, off + uriLen).toString('utf8'); off += uriLen
      off += 2 // seller fee
      const hasCreators = d.readUInt8(off); off += 1
      if (hasCreators === 1) { const creatorsLen = d.readUInt32LE(off); off += 4; off += creatorsLen * (32 + 1 + 1) }
      off += 1; off += 1
      const hasEditionNonce = d.readUInt8(off); off += 1; if (hasEditionNonce === 1) off += 1
      const hasTokenStandard = d.readUInt8(off); off += 1; if (hasTokenStandard === 1) off += 1
      let collectionName: string | undefined
      const hasCollectionOpt = d.readUInt8(off); off += 1
      if (hasCollectionOpt === 1) { off += 1; const collectionMintBuf = d.slice(off, off + 32); off += 32; const collectionMint = new PublicKey(collectionMintBuf); const match = collections.find(c => c.mint.equals(collectionMint)); collectionName = match?.name }
      let metadataJson: any = null
      try { const res = await fetch(uri); if (res.ok) metadataJson = await res.json() } catch {}
      const newItem = { mint, metadata: metadataJson, name, image: metadataJson?.image || '/placeholder.svg', collectionName }
      setMyMints(prev => { const updated = [newItem, ...prev.filter(x => !x.mint.equals(mint))]; saveInventoryToCache(updated); return updated })
    } catch {}
  }, [collections, saveInventoryToCache])

  useEffect(() => {
    if (connected && publicKey) {
      fetchMarketplace()
      fetchCollections()
    }
  }, [connected, publicKey])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Preload images for target collection item types
  useEffect(() => {
    const TARGET_COLLECTION_MINT = new PublicKey('2xXLJU6hbKwTjvqkDsfv8rwFqSB7hRSqzyAvXDmgJi1r')
    const target = collections.find(c => c.mint.equals(TARGET_COLLECTION_MINT))
    if (!target) { setTypeImages({}); setTypeCategories({}); return }
    const types = itemTypesByCollection[collectionKey(target)] || []
    let cancelled = false
    ;(async () => {
      const entries: Record<string,string> = {}
      const catEntries: Record<string,string> = {}
      for (const t of types) {
        try {
          const res = await fetch(t.uri)
          if (res.ok) {
            const j = await res.json()
            if (!cancelled) {
              entries[t.name] = j.image || ''
              const attr = Array.isArray(j.attributes) ? j.attributes.find((a:any)=> (a.trait_type||'').toLowerCase()==='type') : null
              if (attr && typeof attr.value === 'string') catEntries[t.name] = attr.value.toLowerCase()
            }
          }
        } catch {}
      }
      if (!cancelled) { setTypeImages(entries); setTypeCategories(catEntries) }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(collections.map(c=>c.mint.toBase58())), JSON.stringify(itemTypesByCollection)])

  const getMarketplacePDA = () => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('marketplace')],
      PROGRAM_ID
    )
  }

  const getCollectionPDA = (collectionName: string) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('collection'), Buffer.from(collectionName)],
      PROGRAM_ID
    )
  }

  const getMetadataPDA = (mint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  }

  const getMasterEditionPDA = (mint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  }

  const getItemTypePDA = (collectionPda: PublicKey, itemTypeName: string) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('type'), collectionPda.toBuffer(), Buffer.from(itemTypeName)],
      PROGRAM_ID
    )
  }

  const collectionKey = (c: NFTCollection) => (c.pda ? c.pda.toString() : getCollectionPDA(c.name)[0].toString())

  const fetchMarketplace = async () => {
    try {
      const [marketplacePDA] = getMarketplacePDA()
      const accountInfo = await connection.getAccountInfo(marketplacePDA)
      
      if (accountInfo && accountInfo.data.length > 0) {
        const data = accountInfo.data
        
        // Parse marketplace data according to Rust struct
        let offset = 8 // Skip discriminator
        
        const admin = new PublicKey(data.slice(offset, offset + 32))
        offset += 32
        
        const fee_bps = data.readUInt16LE(offset)
        offset += 2
        
        const total_collections = Number(data.readBigUInt64LE(offset))
        offset += 8
        
        const bump = data.readUInt8(offset)
        
        setMarketplace({ admin, fee_bps, total_collections, bump })
        console.log('✅ Marketplace found:', { 
          admin: admin.toString(), 
          fee_bps, 
          total_collections, 
          bump 
        })
      } else {
        console.log('❌ Marketplace not found')
        setMarketplace(null)
      }
    } catch (error) {
      console.error('Error fetching marketplace:', error)
      setError('Failed to fetch marketplace')
    }
  }

  const fetchCollections = async () => {
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID)
      
      console.log('Total program accounts found:', accounts.length)
      
      const collectionsData: NFTCollection[] = []
      const itemTypesMap: Record<string, NFTItemType[]> = {}
      
      for (const account of accounts) {
        try {
          const data = account.account.data
          
          // Skip if too small
          if (data.length < 100) continue
          
          // Check for NFTCollection / NFTItemType account discriminator
          const accountDiscriminator = Array.from(data.slice(0, 8))
          const isCollection = JSON.stringify(accountDiscriminator) === JSON.stringify(COLLECTION_ACCOUNT_DISCRIMINATOR)
          
          if (!isCollection) {
            // Try to parse as NftType based on structure
            try {
              let offset = 8
              if (data.length < offset + 32) continue
              const collection = new PublicKey(data.slice(offset, offset + 32)); offset += 32
              if (data.length < offset + 4) continue
              const nameLen = data.readUInt32LE(offset); offset += 4
              if (nameLen === 0 || nameLen > 100 || data.length < offset + nameLen + 4) continue
              const name = data.slice(offset, offset + nameLen).toString('utf8'); offset += nameLen
              const uriLen = data.readUInt32LE(offset); offset += 4
              if (uriLen === 0 || uriLen > 500 || data.length < offset + uriLen + 8 + 8 + 8 + 1) continue
              const uri = data.slice(offset, offset + uriLen).toString('utf8'); offset += uriLen
              const price = Number(data.readBigUInt64LE(offset)); offset += 8
              const max_supply = Number(data.readBigUInt64LE(offset)); offset += 8
              const current_supply = Number(data.readBigUInt64LE(offset)); offset += 8
              const bump = data.readUInt8(offset)
              const key = collection.toString()
              if (!itemTypesMap[key]) itemTypesMap[key] = []
              itemTypesMap[key].push({ collection, name, uri, price, max_supply, current_supply, bump })
              continue
            } catch (_) {
              continue
            }
          }
          
          let offset = 8 // Skip discriminator

          // If we reach here, it is a Collection
          
          // Parse admin (Pubkey)
          const admin = new PublicKey(data.slice(offset, offset + 32))
          offset += 32
          
          // Parse name (String)
          if (data.length <= offset + 4) continue
          const nameLength = data.readUInt32LE(offset)
          offset += 4
          
          if (data.length < offset + nameLength || nameLength > 100) continue
          const name = data.slice(offset, offset + nameLength).toString('utf8')
          offset += nameLength
          
          // Parse symbol (String)  
          if (data.length <= offset + 4) continue
          const symbolLength = data.readUInt32LE(offset)
          offset += 4
          
          if (data.length < offset + symbolLength || symbolLength > 20) continue
          const symbol = data.slice(offset, offset + symbolLength).toString('utf8')
          offset += symbolLength
          
          // Parse uri (String)
          if (data.length <= offset + 4) continue
          const uriLength = data.readUInt32LE(offset)
          offset += 4
          
          if (data.length < offset + uriLength || uriLength > 500) continue
          const uri = data.slice(offset, offset + uriLength).toString('utf8')
          offset += uriLength
          
          // Ensure we have enough bytes for remaining fields (2+32+1+1 = 36 bytes)
          if (data.length < offset + 36) continue
          
          // Parse remaining numeric fields
          const royalty = data.readUInt16LE(offset)
          offset += 2
          
          const mint = new PublicKey(data.slice(offset, offset + 32))
          offset += 32
          
          const is_active = data.readUInt8(offset) === 1
          offset += 1
          
          const bump = data.readUInt8(offset)
          
          // Validate collection data
          if (name && name.length > 0 && symbol && symbol.length > 0 && 
              /^[\x20-\x7E]*$/.test(name) && /^[\x20-\x7E]*$/.test(symbol)) {
            
            const collectionObj: NFTCollection = {
              admin,
              name,
              symbol,
              uri,
              royalty,
              mint,
              is_active,
              bump,
              pda: account.pubkey
            }
            collectionsData.push(collectionObj)
            
            console.log('✅ Found collection:', { 
              name, 
              symbol, 
              royalty: royalty / 100 + '%',
              active: is_active
            })
          }
        } catch (parseError) {
          console.warn('Failed to parse account:', account.pubkey.toString(), parseError)
          continue
        }
      }
      
      setCollections(collectionsData)
      setItemTypesByCollection(itemTypesMap)
      console.log('Total collections found:', collectionsData.length)
    } catch (error) {
      console.error('Error fetching collections:', error)
      setError('Failed to fetch collections')
    }
  }

  const createItemType = async () => {
    if (!publicKey || !signTransaction) return
    if (!selectedAdminCollection) { setError('Select a collection for type'); return }
    if (!itemTypeName || !collectionUri || !itemTypePrice) { setError('Fill item type fields'); return }
    setLoading(true); setError(null); setSuccess(null)
    try {
      const [collectionPDA] = getCollectionPDA(selectedAdminCollection.name)
      const priceLamports = Math.floor(parseFloat(itemTypePrice) * LAMPORTS_PER_SOL)
      const nameBuf = Buffer.from(itemTypeName, 'utf8')
      const uriBuf = Buffer.from(collectionUri, 'utf8')
      const maxTypeSupply = BigInt(parseInt(itemTypeMaxSupply || '0'))
      const disc = await instructionDiscriminator('create_nft_type')
      const data = Buffer.concat([
        Buffer.from(disc),
        (()=>{const b=Buffer.alloc(4+nameBuf.length);b.writeUInt32LE(nameBuf.length,0);nameBuf.copy(b,4);return b})(),
        (()=>{const b=Buffer.alloc(4+uriBuf.length);b.writeUInt32LE(uriBuf.length,0);uriBuf.copy(b,4);return b})(),
        (()=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(priceLamports),0);return b})(),
        (()=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(maxTypeSupply,0);return b})(),
      ])
      const [typePDA] = getItemTypePDA(collectionPDA, itemTypeName)
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: collectionPDA, isSigner: false, isWritable: true },
          { pubkey: typePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      })
      const tx = new Transaction().add(ix)
      const { blockhash } = await connection.getLatestBlockhash(); tx.recentBlockhash = blockhash; tx.feePayer = publicKey
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(sig, 'confirmed')
      setSuccess('Item type created')
      setItemTypeName(''); setItemTypePrice('0.1'); setItemTypeMaxSupply('1000')
      await fetchCollections()
    } catch (e) {
      setError('Failed to create item type: ' + (e as Error).message)
    } finally { setLoading(false) }
  }

  const fetchMyNfts = async () => {
    if (!publicKey) return
    try {
      const resp = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
      const nfts: { mint: PublicKey; metadata?: any; name?: string; image?: string; collectionName?: string }[] = []
      
      for (const it of resp.value) {
        const info: any = it.account.data.parsed.info
        const amount = Number(info.tokenAmount.amount)
        const decimals = Number(info.tokenAmount.decimals)
        
        if (decimals === 0 && amount > 0) {
          const mint = new PublicKey(info.mint)
          
          try {
            // Get metadata PDA
            const [metadataPDA] = getMetadataPDA(mint)
            const metadataAccount = await connection.getAccountInfo(metadataPDA)
            
            if (metadataAccount) {
              // Parse metadata
              const d = metadataAccount.data
              let off = 1 // key
              off += 32 // update authority
              off += 32 // mint
              // name
              const nameLen = d.readUInt32LE(off); off += 4
              const name = d.slice(off, off + nameLen).toString('utf8'); off += nameLen
              // symbol
              const symbolLen = d.readUInt32LE(off); off += 4
              const _symbol = d.slice(off, off + symbolLen).toString('utf8'); off += symbolLen
              // uri
              const uriLen = d.readUInt32LE(off); off += 4
              const uri = d.slice(off, off + uriLen).toString('utf8'); off += uriLen
              // seller fee
              off += 2
              // creators option
              const hasCreators = d.readUInt8(off); off += 1
              if (hasCreators === 1) {
                const creatorsLen = d.readUInt32LE(off); off += 4
                // each creator: pubkey(32) + verified(1) + share(1)
                off += creatorsLen * (32 + 1 + 1)
              }
              // primary_sale_happened (bool)
              off += 1
              // is_mutable (bool)
              off += 1
              // edition_nonce: Option<u8>
              const hasEditionNonce = d.readUInt8(off); off += 1
              if (hasEditionNonce === 1) {
                off += 1 // skip nonce value
              }
              // token_standard: Option<u8>
              const hasTokenStandard = d.readUInt8(off); off += 1
              if (hasTokenStandard === 1) {
                off += 1 // skip token_standard value
              }
              // collection option (DataV2.collection)
              let belongsToOurCollection = false
              let matchedCollectionName: string | undefined
              const hasCollectionOpt = d.readUInt8(off); off += 1
              if (hasCollectionOpt === 1) {
                // Collection { verified: bool, key: Pubkey }
                const _verified = d.readUInt8(off); off += 1
                const collectionMintBuf = d.slice(off, off + 32); off += 32
                const collectionMint = new PublicKey(collectionMintBuf)
                for (const c of collections) {
                  if (c.mint.equals(collectionMint)) {
                    belongsToOurCollection = true
                    matchedCollectionName = c.name
                    break
                  }
                }
              }
              // uses: Option<Uses> (skip if present to avoid bounds issues)
              if (off < d.length) {
                const hasUses = d.readUInt8(off); off += 1
                if (hasUses === 1) {
                  // Uses { use_method: u8, remaining: u64, total: u64 }
                  off += 1 + 8 + 8
                }
              }
              
              // Fetch metadata JSON (best effort)
              let metadataJson = null
              try {
                const res = await fetch(uri)
                if (res.ok) {
                  metadataJson = await res.json()
                }
              } catch (e) {
                console.warn('Failed to fetch metadata JSON:', e)
              }
              
              // Only add NFTs that belong to our collections
              if (belongsToOurCollection) {
                nfts.push({ 
                  mint, 
                  metadata: metadataJson,
                  name: name.replace(/\0+$/, ''),
                  image: metadataJson?.image || '/placeholder.svg',
                  collectionName: matchedCollectionName,
                })
                console.log('✅ Found NFT from our collection:', {
                  mint: mint.toString(),
                  name: name,
                  collection: matchedCollectionName
                })
              } else {
                console.log('❌ NFT not from our collection:', {
                  mint: mint.toString(),
                  name: name
                })
              }
            } else {
              // No metadata found
            }
          } catch (e) {
            console.warn('Failed to parse metadata for mint:', mint.toString(), e)
          }
        }
      }
      
      setMyMints(nfts)
      saveInventoryToCache(nfts)
    } catch (e) {
      console.error(e)
    }
  }

  const initializeMarketplace = async () => {
    if (!publicKey || !signTransaction) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const [marketplacePDA] = getMarketplacePDA()
      
      // Create instruction data
      const disc = await instructionDiscriminator('initialize_marketplace')
      const instructionData = Buffer.concat([
        Buffer.from(disc),
        (() => {
          const buf = Buffer.alloc(2)
          buf.writeUInt16LE(500) // 5% fee
          return buf
        })()
      ])
      
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: marketplacePDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData
      })
      
      const transaction = new Transaction().add(instruction)
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      setSuccess('Marketplace initialized successfully!')
      console.log('Marketplace initialized:', signature)
      await fetchMarketplace()
    } catch (error) {
      console.error('Error initializing marketplace:', error)
      setError('Failed to initialize marketplace: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const createCollection = async () => {
    if (!publicKey || !signTransaction) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
             // Generate completely new mint keypair for each collection
       const mintKeypair = Keypair.generate()
       console.log('Generated mint keypair:', mintKeypair.publicKey.toString())
       
       // Use original collection name with random suffix
       const randomSuffix = Math.random().toString(36).substring(2, 15)
       const uniqueCollectionName = `${collectionName}_${randomSuffix}`
       console.log('Using collection name:', uniqueCollectionName)
      
      // Derive PDAs with unique collection name
      const [marketplacePDA] = getMarketplacePDA()
      const [collectionPDA] = getCollectionPDA(uniqueCollectionName) // Use unique name
      const [metadataPDA] = getMetadataPDA(mintKeypair.publicKey)
      const [masterEditionPDA] = getMasterEditionPDA(mintKeypair.publicKey)
      
      console.log('PDAs derived:', {
        marketplace: marketplacePDA.toString(),
        collection: collectionPDA.toString(),
        metadata: metadataPDA.toString(),
        masterEdition: masterEditionPDA.toString(),
        mint: mintKeypair.publicKey.toString()
      })
      
      // Check if collection PDA already exists
      const collectionAccountInfo = await connection.getAccountInfo(collectionPDA)
      if (collectionAccountInfo) {
        throw new Error(`Collection PDA already exists: ${collectionPDA.toString()}`)
      }
      
      // Check if mint already exists
      const mintAccountInfo = await connection.getAccountInfo(mintKeypair.publicKey)
      if (mintAccountInfo) {
        throw new Error(`Mint already exists: ${mintKeypair.publicKey.toString()}`)
      }
      
             // Create transaction
       const transaction = new Transaction()
       
       // Anchor will handle both mint creation and ATA creation
       // No need to manually create ATA
      
      // Calculate ATA address for admin
      const adminTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey, // mint
        publicKey, // owner
        false, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
      
      // 3. Create collection instruction data with unique name
      const nameBuffer = Buffer.from(uniqueCollectionName, 'utf8') // Use unique name
      const symbolBuffer = Buffer.from(collectionSymbol, 'utf8')
      const uriBuffer = Buffer.from(collectionUri, 'utf8')
      
      console.log('Instruction data sizes:', {
        name: nameBuffer.length,
        symbol: symbolBuffer.length, 
        uri: uriBuffer.length
      })
      
      // Use Anchor's instruction discriminator from IDL
      const disc2 = Buffer.from([39, 179, 4, 147, 128, 226, 252, 134])
      
      // Build instruction data - Anchor uses Borsh serialization
      const instructionData = Buffer.concat([
        disc2,
        // collection_name (String) - Borsh format: 4-byte length + data
        (() => {
          const buf = Buffer.alloc(4 + nameBuffer.length)
          buf.writeUInt32LE(nameBuffer.length, 0)
          nameBuffer.copy(buf, 4)
          return buf
        })(),
        // symbol (String)
        (() => {
          const buf = Buffer.alloc(4 + symbolBuffer.length)
          buf.writeUInt32LE(symbolBuffer.length, 0)
          symbolBuffer.copy(buf, 4)
          return buf
        })(),
        // uri (String)
        (() => {
          const buf = Buffer.alloc(4 + uriBuffer.length)
          buf.writeUInt32LE(uriBuffer.length, 0)
          uriBuffer.copy(buf, 4)
          return buf
        })(),
        // royalty (u16) - Borsh format: little-endian
        (() => {
          const buf = Buffer.alloc(2)
          buf.writeUInt16LE(parseInt(royalty), 0)
          return buf
        })()
      ])
      
             // 5. Add create collection instruction
      transaction.add(
        new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: marketplacePDA, isSigner: false, isWritable: true },
            { pubkey: collectionPDA, isSigner: false, isWritable: true },
            { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
            { pubkey: metadataPDA, isSigner: false, isWritable: true },
            { pubkey: masterEditionPDA, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          data: instructionData
        })
      )
      
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      // Sign with mint keypair
      transaction.partialSign(mintKeypair)
      
      // Sign with wallet
      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      setSuccess(`Collection "${uniqueCollectionName}" created successfully!`)
      console.log('Collection created:', signature, 'Name:', uniqueCollectionName)
      
      // Clear form
      setCollectionName('')
      setCollectionSymbol('')
      setCollectionUri('')
      setRoyalty('500')
      
      await fetchCollections()
    } catch (error) {
      console.error('Error creating collection:', error)
      setError('Failed to create collection: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const mintNFT = async (collection: NFTCollection, itemTypeName: string) => {
    if (!publicKey || !signTransaction || !selectedCollection) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Generate NFT mint keypair
      const nftMintKeypair = Keypair.generate()
      
      // Derive PDAs and accounts
      const [collectionPDA] = getCollectionPDA(collection.name)
      const [nftMetadataPDA] = getMetadataPDA(nftMintKeypair.publicKey)
      const buyerTokenAccount = await getAssociatedTokenAddress(nftMintKeypair.publicKey, publicKey)
      
      const transaction = new Transaction()
      
      // Program will create mint and ATA as needed
      // Build instruction data: only item_type_name per IDL
      const nameBuffer = Buffer.from(itemTypeName, 'utf8')
      const disc = await instructionDiscriminator('mint_nft_from_collection')
      const instructionData = Buffer.concat([
        Buffer.from(disc),
        (() => {
          const buf = Buffer.alloc(4 + nameBuffer.length)
          buf.writeUInt32LE(nameBuffer.length, 0)
          nameBuffer.copy(buf, 4)
          return buf
        })(),
      ])
      
      // 1. Add mint NFT instruction
      const [typePDA] = getItemTypePDA(collectionPDA, itemTypeName)
      transaction.add(
        new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: collectionPDA, isSigner: false, isWritable: true },
            { pubkey: typePDA, isSigner: false, isWritable: true },
            { pubkey: nftMintKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
            { pubkey: nftMetadataPDA, isSigner: false, isWritable: true },
            { pubkey: getMetadataPDA(collection.mint)[0], isSigner: false, isWritable: true },
            { pubkey: getMasterEditionPDA(collection.mint)[0], isSigner: false, isWritable: true },
            { pubkey: collection.mint, isSigner: false, isWritable: false },
            { pubkey: collection.admin, isSigner: true, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          data: instructionData
        })
      )
      
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      // Sign with NFT mint keypair
      transaction.partialSign(nftMintKeypair)
      
      // Sign with wallet
      const signedTransaction = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      setSuccess(`NFT minted successfully!`)
      console.log('NFT minted:', signature)
      
      // Close modal
      setSelectedCollection(null)
      
      await fetchCollections()
      // Add newly minted NFT to cache/inventory
      await addMintToInventory(nftMintKeypair.publicKey)
    } catch (error) {
      console.error('Error minting NFT:', error)
      setError('Failed to mint NFT: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = marketplace && publicKey && marketplace.admin.equals(publicKey)

  return (
    <div className="min-h-[100dvh] bg-white text-neutral-800">
      <div className="w-full">
        <div className="border-b border-black px-4 h-16 flex items-center justify-between">
          <h1 className="lowercase text-lg">nft marketplace</h1>
          {/* wallet button removed from marketplace header as requested */}
        </div>
        <div className="border-b border-black px-4 h-12 flex items-center gap-4 lowercase text-sm">
          <button onClick={() => setActiveTab('marketplace')} className={`underline-offset-4 ${activeTab==='marketplace'?'underline':''}`}>marketplace</button>
          <button onClick={() => setActiveTab('inventory')} className={`underline-offset-4 ${activeTab==='inventory'?'underline':''}`}>inventory</button>
          {isAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`underline-offset-4 ${activeTab==='admin'?'underline':''}`}>admin</button>
          )}
        </div>
        
        <div className="space-y-8">
            {/* Success/Error Messages */}
            {success && (<div className="px-4 py-2 text-green-700 text-sm">{success}</div>)}
            {error && (<div className="px-4 py-2 text-red-700 text-sm">{error}</div>)}
            
            {/* Admin Tab */}
            {isAdmin && activeTab==='admin' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Create NFT Collection</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Collection Name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="Collection Symbol"
                    value={collectionSymbol}
                    onChange={(e) => setCollectionSymbol(e.target.value)}
                    className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="Metadata URI"
                    value={collectionUri}
                    onChange={(e) => setCollectionUri(e.target.value)}
                    className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300"
                  />

                  <input
                    type="number"
                    placeholder="Royalty (basis points, e.g. 500 = 5%)"
                    value={royalty}
                    onChange={(e) => setRoyalty(e.target.value)}
                    className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300"
                  />
                </div>
                <button
                  onClick={createCollection}
                  disabled={loading || !marketplace || !collectionName || !collectionSymbol || !collectionUri || !royalty}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >
                  {loading ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            )}
 
            {/* Pinata Uploader - Admin only */}
            {isAdmin && activeTab==='admin' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Build metadata.json and upload to Pinata</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input type="password" placeholder="Pinata JWT" value={pinataJWT} onChange={e=>setPinataJWT(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <input type="text" placeholder="Name" value={pinName} onChange={e=>setPinName(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <input type="text" placeholder="Symbol" value={pinSymbol} onChange={e=>setPinSymbol(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <input type="text" placeholder="External URL (optional)" value={pinExternalUrl} onChange={e=>setPinExternalUrl(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <textarea placeholder="Description" value={pinDescription} onChange={e=>setPinDescription(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300 md:col-span-2" />
                  <textarea placeholder='Attributes JSON (e.g. [{"trait_type":"Level","value":"1"}] )' value={pinAttributes} onChange={e=>setPinAttributes(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300 md:col-span-2" />
                  <input type="file" accept="image/*" onChange={e=>setPinImageFile(e.target.files?.[0] ?? null)} className="md:col-span-2" />
                </div>
                <button
                  onClick={async()=>{
                    try{
                      if(!pinataJWT){ setError('Enter Pinata JWT'); return }
                      if(!pinImageFile){ setError('Select image'); return }
                      setLoading(true); setError(null); setSuccess(null)
                      // 1) Upload image
                      const fd = new FormData()
                      fd.append('file', pinImageFile)
                      const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                        method: 'POST', headers: { Authorization: `Bearer ${pinataJWT}` }, body: fd
                      })
                      if(!imgRes.ok) throw new Error('Image upload failed')
                      const imgJson = await imgRes.json()
                      const imageCid = imgJson.IpfsHash
                      const image = `ipfs://${imageCid}`
                      // 2) Upload metadata.json
                      const attributesParsed = JSON.parse(pinAttributes || '[]')
                      const metadata = { name: pinName, symbol: pinSymbol, description: pinDescription, image, external_url: pinExternalUrl || undefined, attributes: attributesParsed }
                      const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pinataJWT}` }, body: JSON.stringify(metadata)
                      })
                      if(!metaRes.ok) throw new Error('Metadata upload failed')
                      const metaJson = await metaRes.json()
                      const metaCid = metaJson.IpfsHash
                      const uri = `https://gateway.pinata.cloud/ipfs/${metaCid}`
                      setSuccess(`Uploaded. URI: ${uri}`)
                      setCollectionUri(uri)
                    }catch(e){ setError((e as Error).message) } finally { setLoading(false) }
                  }}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >Upload to Pinata</button>
              </div>
            )}
 
            {/* Marketplace (single collection types) */}
            {activeTab==='marketplace' && (
              <div>
                {/* Store-like bottom container with left sidebar (20%) and products (80%) */}
                <div className="grid grid-cols-1 md:grid-cols-[20%_80%] divide-y md:divide-y-0 md:divide-x divide-black border-b border-black">
                  {/* Sidebar filters */}
                  <div className="p-6 border-r border-black">
                    <div className="lowercase text-sm text-neutral-700 mb-3">filters</div>
                    <div className="space-y-3">
                      <div className="lowercase text-xs text-neutral-600">category</div>
                      <div className="flex flex-col gap-2 text-sm lowercase">
                        <label className="cursor-pointer">
                          <input type="radio" name="cat" className="mr-2" checked={selectedCategory===null} onChange={()=>setSelectedCategory(null)} /> all
                        </label>
                        <label className="cursor-pointer">
                          <input type="radio" name="cat" className="mr-2" checked={selectedCategory==='troop'} onChange={()=>setSelectedCategory('troop')} /> troop
                        </label>
                        <label className="cursor-pointer">
                          <input type="radio" name="cat" className="mr-2" checked={selectedCategory==='building'} onChange={()=>setSelectedCategory('building')} /> building
                        </label>
                        <label className="cursor-pointer">
                          <input type="radio" name="cat" className="mr-2" checked={selectedCategory==='utility'} onChange={()=>setSelectedCategory('utility')} /> utility
                        </label>
                      </div>
                      <button onClick={fetchCollections} disabled={loading} className="text-xs underline disabled:opacity-50">refresh</button>
                    </div>
                  </div>
                  {/* Items grid */}
                  <div className="p-6">
                  {(() => {
                    const TARGET_COLLECTION_MINT = new PublicKey('2xXLJU6hbKwTjvqkDsfv8rwFqSB7hRSqzyAvXDmgJi1r')
                    const target = collections.find(c => c.mint.equals(TARGET_COLLECTION_MINT))
                    if (!target) return <div className="text-sm text-neutral-600 lowercase">target collection not found</div>
                    let types = itemTypesByCollection[collectionKey(target)] || []
                    if (selectedCategory) {
                      types = types.filter(t => (typeCategories[t.name]||'') === selectedCategory)
                    }
                    return (
                      <div>
                        {types.length === 0 ? (
                          <div className="text-sm text-neutral-600 lowercase">no item types</div>
                        ) : (
                          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {types.map((it, i) => (
                              <li key={i} className="group border border-black rounded-sm overflow-hidden bg-white transition-all duration-300 ease-out hover:translate-x-2 hover:-translate-y-2 hover:shadow-[-8px_8px_25px_rgba(0,0,0,0.15)] relative">
                                <div className="absolute inset-0 hidden group-hover:flex items-end justify-end p-2">
                                  <button onClick={() => { setSelectedCollection(target); setSelectedTypeName(it.name) }} className="text-[11px] bg-black text-white px-2 py-1 rounded-sm">mint</button>
                                </div>
                                <div className="block w-full text-left">
                                  <div className="aspect-square w-full bg-white flex items-center justify-center">
                                   {typeImages[it.name] ? (
                                     <img src={typeImages[it.name]} alt={it.name} className="h-full w-full object-contain p-3 transition-shadow duration-300 ease-out group-hover:shadow-[0_0_36px_rgba(255,255,255,0.65),0_0_60px_rgba(255,235,0,0.35)]" />
                                   ) : (
                                     <div className="text-[11px] text-neutral-500">{it.name}</div>
                                   )}
                                  </div>
                                  <div className="px-3 py-2 border-t border-black">
                                    <div className="text-[12px] lowercase text-neutral-700">{it.name}</div>
                                  </div>
                                </div>
                               </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })()}
                  </div>
                </div>
              </div>
            )}
 
            {/* Mint NFT Modal */}
            {selectedCollection && activeTab==='marketplace' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-white/20">
                  <h2 className="text-2xl font-semibold mb-4">Mint NFT from {selectedCollection.name}</h2>
                  <div className="space-y-4 mb-4">
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-sm text-gray-300 mb-2">Selected Item Type:</p>
                      <div className="text-white">{selectedTypeName || '-'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mintNFT(selectedCollection, selectedTypeName)}
                      disabled={loading || !selectedTypeName}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {loading ? 'Minting...' : 'Mint'}
                    </button>
                    <button
                      onClick={() => { setSelectedCollection(null); setSelectedTypeName('') }}
                      disabled={loading}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-bold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
 
            {/* My NFTs Tab */}
            {activeTab==='inventory' && (
              <div className="grid grid-cols-1 md:grid-cols-[20%_80%] divide-y md:divide-y-0 md:divide-x divide-black border-b border-black">
                {/* Sidebar */}
                <div className="p-6 border-r border-black">
                  <div className="lowercase text-sm text-neutral-700 mb-3">inventory</div>
                  <div className="space-y-3">
                    <div className="lowercase text-xs text-neutral-600">collection</div>
                    <div className="text-[12px] lowercase text-neutral-800">target only</div>
                    <button onClick={fetchMyNfts} disabled={loading} className="text-xs underline disabled:opacity-50">refresh</button>
                  </div>
                </div>
                {/* Items grid */}
                <div className="p-6">
                  {myMints.filter(n=>{
                    const TARGET_COLLECTION_MINT = '2xXLJU6hbKwTjvqkDsfv8rwFqSB7hRSqzyAvXDmgJi1r'
                    return n.collectionName && collections.find(c=>c.mint.toBase58()===TARGET_COLLECTION_MINT && c.name===n.collectionName)
                  }).length === 0 ? (
                    <div className="text-sm text-neutral-600 lowercase">no items</div>
                  ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {myMints.filter(n=>{
                        const TARGET_COLLECTION_MINT = '2xXLJU6hbKwTjvqkDsfv8rwFqSB7hRSqzyAvXDmgJi1r'
                        return n.collectionName && collections.find(c=>c.mint.toBase58()===TARGET_COLLECTION_MINT && c.name===n.collectionName)
                      }).map((nft, i)=>(
                        <li key={i} className="group border border-black rounded-sm overflow-hidden bg-white transition-all duration-300 ease-out hover:translate-x-2 hover:-translate-y-2 hover:shadow-[-8px_8px_25px_rgba(0,0,0,0.15)]">
                          <a href={`/app/marketplace/nft/${nft.mint.toBase58()}`} className="block">
                            <div className="aspect-square w-full bg-white flex items-center justify-center">
                              {nft.image && nft.image !== '/placeholder.svg' ? (
                                <img src={nft.image} alt={nft.name || 'NFT'} className="h-full w-full object-contain p-3 transition-shadow duration-300 ease-out group-hover:shadow-[0_0_36px_rgba(255,255,255,0.65),0_0_60px_rgba(255,235,0,0.35)]" onError={(e)=>{(e.target as HTMLImageElement).src='/placeholder.svg'}} />
                              ) : (
                                <div className="text-[11px] text-neutral-500">{nft.name || 'nft'}</div>
                              )}
                            </div>
                            <div className="px-3 py-2 border-t border-black">
                              <div className="text-[12px] lowercase text-neutral-700">{nft.name || 'unknown nft'}</div>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
 
            {/* Admin: Select collection and create item type */}
            {isAdmin && activeTab==='admin' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Create Item Type for a Collection</h2>
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-300">Select Collection</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {collections.map((c, idx) => (
                      <button key={idx} onClick={()=>setSelectedAdminCollection(c)} className={`p-3 rounded border ${selectedAdminCollection?.name===c.name?'border-green-400 bg-green-500/10':'border-white/20 bg-white/5 hover:bg-white/10'}`}>
                        <div className="text-left">
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-xs text-gray-300">{c.symbol}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>setShowTypeModal(true)} disabled={!selectedAdminCollection} className="text-sm underline disabled:opacity-50">New Item Type</button>
                </div>

                {showTypeModal && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-sm w-full max-w-2xl border border-black overflow-hidden">
                      <div className="px-4 py-3 border-b border-black flex items-center justify-between">
                        <div className="lowercase text-sm">create item type</div>
                        <button onClick={()=>setShowTypeModal(false)} className="text-sm underline">close</button>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="lowercase text-xs text-neutral-600">pinata credentials</div>
                          <input type="password" placeholder="PINATA API KEY" value={pinApiKey} onChange={e=>setPinApiKey(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                          <input type="password" placeholder="PINATA API SECRET" value={pinApiSecret} onChange={e=>setPinApiSecret(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                          <div className="lowercase text-xs text-neutral-600">image</div>
                          <input type="file" accept="image/*" onChange={e=>setTypeImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
                          <div className="lowercase text-xs text-neutral-600">basic info</div>
                          <input type="text" placeholder="item type name" value={itemTypeName} onChange={e=>setItemTypeName(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                          <input type="text" placeholder="symbol" value={itemTypeSymbol} onChange={e=>setItemTypeSymbol(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                          <textarea placeholder="description" value={typeDescription} onChange={e=>setTypeDescription(e.target.value)} className="border border-black px-2 py-1 text-sm w-full h-20" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" step="0.01" placeholder="price (SOL)" value={itemTypePrice} onChange={e=>setItemTypePrice(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                            <input type="number" placeholder="max supply" value={itemTypeMaxSupply} onChange={e=>setItemTypeMaxSupply(e.target.value)} className="border border-black px-2 py-1 text-sm w-full" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="lowercase text-xs text-neutral-600">attributes</div>
                            <button onClick={()=>setTypeAttributes(prev=>[...prev,{trait_type:'',value:''}])} className="text-xs underline">add</button>
                          </div>
                          <div className="space-y-2 max-h-56 overflow-auto">
                            {typeAttributes.map((a, idx)=> (
                              <div key={idx} className="grid grid-cols-2 gap-2">
                                <input value={a.trait_type} onChange={e=>{
                                  const v=e.target.value; setTypeAttributes(prev=>prev.map((x,i)=>i===idx?{...x,trait_type:v}:x))
                                }} placeholder="trait" className="border border-black px-2 py-1 text-sm w-full" />
                                <input value={a.value} onChange={e=>{
                                  const v=e.target.value; setTypeAttributes(prev=>prev.map((x,i)=>i===idx?{...x,value:v}:x))
                                }} placeholder="value" className="border border-black px-2 py-1 text-sm w-full" />
                              </div>
                            ))}
                          </div>
                          <div className="pt-2">
                            <button
                              onClick={async()=>{
                                try{
                                  if(!selectedAdminCollection){ setError('select collection'); return }
                                  if(!pinApiKey || !pinApiSecret){ setError('enter pinata api key/secret'); return }
                                  if(!typeImageFile){ setError('select image'); return }
                                  if(!itemTypeName){ setError('enter item type name'); return }
                                  setLoading(true); setError(null); setSuccess(null)
                                  // 1) upload image
                                  const fd = new FormData()
                                  fd.append('file', typeImageFile)
                                  const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                                    method:'POST',
                                    headers:{ 'pinata_api_key': pinApiKey, 'pinata_secret_api_key': pinApiSecret },
                                    body: fd
                                  })
                                  if(!imgRes.ok) throw new Error('image upload failed')
                                  const imgJson = await imgRes.json()
                                  const imgCid = imgJson.IpfsHash
                                  const imageGateway = `https://gateway.pinata.cloud/ipfs/${imgCid}`
                                  // 2) upload metadata json (requested schema)
                                  const creatorAddr = selectedAdminCollection?.admin.toBase58() || ''
                                  const metadata = {
                                    name: itemTypeName,
                                    symbol: itemTypeSymbol,
                                    description: typeDescription,
                                    image: imageGateway,
                                    attributes: typeAttributes,
                                    properties: {
                                      files: [
                                        { uri: imageGateway, type: 'image/jpeg' }
                                      ],
                                      category: 'image',
                                      creators: [
                                        { address: creatorAddr, share: 100 }
                                      ]
                                    }
                                  }
                                  const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                                    method:'POST',
                                    headers:{ 'Content-Type':'application/json', 'pinata_api_key': pinApiKey, 'pinata_secret_api_key': pinApiSecret },
                                    body: JSON.stringify(metadata)
                                  })
                                  if(!metaRes.ok) throw new Error('metadata upload failed')
                                  const metaJson = await metaRes.json()
                                  const uri = `https://gateway.pinata.cloud/ipfs/${metaJson.IpfsHash}`
                                  setCollectionUri(uri)
                                  // 3) call on-chain createItemType
                                  await createItemType()
                                  setShowTypeModal(false)
                                }catch(e){ setError((e as Error).message) } finally { setLoading(false) }
                              }}
                              disabled={loading}
                              className="text-sm underline"
                            >upload & create</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
         
      </div>
    </div>
  )
}