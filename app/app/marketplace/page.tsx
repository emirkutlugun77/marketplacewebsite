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
const PROGRAM_ID = new PublicKey('8KzE3LCicxv13iJx2v2V4VQQNWt4QHuvfuH8jxYnkGQ1')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

// Correct instruction discriminators from IDL
const MARKETPLACE_DISCRIMINATOR = [47, 81, 64, 0, 96, 56, 105, 7] // initialize_marketplace
const COLLECTION_DISCRIMINATOR = [39, 179, 4, 147, 128, 226, 252, 134] // create_nft_collection  
const CREATE_ITEM_TYPE_DISCRIMINATOR = [62, 86, 26, 185, 222, 101, 143, 142] // create_item_type
const MINT_NFT_DISCRIMINATOR = [157, 81, 72, 124, 57, 0, 110, 9] // mint_nft_from_collection

// Account discriminators for parsing
const MARKETPLACE_ACCOUNT_DISCRIMINATOR = [70, 222, 41, 62, 78, 3, 32, 174] // Marketplace
const COLLECTION_ACCOUNT_DISCRIMINATOR = [243, 209, 195, 150, 192, 176, 151, 165] // NFTCollection
const ITEM_TYPE_ACCOUNT_DISCRIMINATOR = [94, 244, 226, 71, 95, 247, 231, 48] // NFTItemType

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
  max_supply: number
  current_supply: number
  price: number
  royalty: number
  mint: PublicKey
  is_active: boolean
  bump: number
  pda?: PublicKey
}

interface NFTItemType {
  collection: PublicKey
  name: string
  symbol: string
  uri: string
  price: number
  is_active: boolean
  bump: number
}

export default function MarketplacePage() {
  const { publicKey, connected, signTransaction } = useWallet()
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null)
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [itemTypesByCollection, setItemTypesByCollection] = useState<Record<string, NFTItemType[]>>({})
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my' | 'admin'>('marketplace')
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Hydration guard
  const [isMounted, setIsMounted] = useState(false)

  // Form states
  const [collectionName, setCollectionName] = useState('')
  const [collectionSymbol, setCollectionSymbol] = useState('')
  const [collectionUri, setCollectionUri] = useState('')
  const [maxSupply, setMaxSupply] = useState('1000')
  const [collectionPrice, setCollectionPrice] = useState('0.1')
  const [royalty, setRoyalty] = useState('500') // 5% in basis points

  // Mint form states
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null)
  const [selectedAdminCollection, setSelectedAdminCollection] = useState<NFTCollection | null>(null)
  const [myMints, setMyMints] = useState<{ mint: PublicKey }[]>([])

  useEffect(() => {
    if (connected && publicKey) {
      fetchMarketplace()
      fetchCollections()
    }
  }, [connected, publicKey])

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
      [Buffer.from('item_type'), collectionPda.toBuffer(), Buffer.from(itemTypeName)],
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
          const isItemType = JSON.stringify(accountDiscriminator) === JSON.stringify(ITEM_TYPE_ACCOUNT_DISCRIMINATOR)
          
          if (!isCollection && !isItemType) continue
          
          let offset = 8 // Skip discriminator

          if (isItemType) {
            // Parse NFTItemType
            const collection = new PublicKey(data.slice(offset, offset + 32))
            offset += 32

            const nameLength = data.readUInt32LE(offset); offset += 4
            const name = data.slice(offset, offset + nameLength).toString('utf8'); offset += nameLength

            const symbolLength = data.readUInt32LE(offset); offset += 4
            const symbol = data.slice(offset, offset + symbolLength).toString('utf8'); offset += symbolLength

            const uriLength = data.readUInt32LE(offset); offset += 4
            const uri = data.slice(offset, offset + uriLength).toString('utf8'); offset += uriLength

            const price = Number(data.readBigUInt64LE(offset)); offset += 8
            const is_active = data.readUInt8(offset) === 1; offset += 1
            const bump = data.readUInt8(offset)

            const key = collection.toString()
            if (!itemTypesMap[key]) itemTypesMap[key] = []
            itemTypesMap[key].push({ collection, name, symbol, uri, price, is_active, bump })
            continue
          }
          
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
          
          // Ensure we have enough bytes for remaining fields (8+8+8+2+32+1+1 = 60 bytes)
          if (data.length < offset + 60) continue
          
          // Parse remaining numeric fields
          const max_supply = Number(data.readBigUInt64LE(offset))
          offset += 8
          
          const current_supply = Number(data.readBigUInt64LE(offset))
          offset += 8
          
          const price = Number(data.readBigUInt64LE(offset))
          offset += 8
          
          const royalty = data.readUInt16LE(offset)
          offset += 2
          
          const mint = new PublicKey(data.slice(offset, offset + 32))
          offset += 32
          
          const is_active = data.readUInt8(offset) === 1
          offset += 1
          
          const bump = data.readUInt8(offset)
          
          // Validate collection data
          if (name && name.length > 0 && symbol && symbol.length > 0 && 
              /^[\x20-\x7E]*$/.test(name) && /^[\x20-\x7E]*$/.test(symbol) && 
              price > 0 && max_supply > 0) {
            
            const collectionObj: NFTCollection = {
              admin,
              name,
              symbol,
              uri,
              max_supply,
              current_supply,
              price,
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
              price: price / LAMPORTS_PER_SOL + ' SOL',
              supply: `${current_supply}/${max_supply}`,
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
    if (!itemTypeName || !itemTypeSymbol || !collectionUri || !itemTypePrice) { setError('Fill item type fields'); return }
    setLoading(true); setError(null); setSuccess(null)
    try {
      const [collectionPDA] = getCollectionPDA(selectedAdminCollection.name)
      const priceLamports = Math.floor(parseFloat(itemTypePrice) * LAMPORTS_PER_SOL)
      const nameBuf = Buffer.from(itemTypeName, 'utf8')
      const symBuf = Buffer.from(itemTypeSymbol, 'utf8')
      const uriBuf = Buffer.from(collectionUri, 'utf8')
      const data = Buffer.concat([
        Buffer.from(CREATE_ITEM_TYPE_DISCRIMINATOR),
        (()=>{const b=Buffer.alloc(4+nameBuf.length);b.writeUInt32LE(nameBuf.length,0);nameBuf.copy(b,4);return b})(),
        (()=>{const b=Buffer.alloc(4+symBuf.length);b.writeUInt32LE(symBuf.length,0);symBuf.copy(b,4);return b})(),
        (()=>{const b=Buffer.alloc(4+uriBuf.length);b.writeUInt32LE(uriBuf.length,0);uriBuf.copy(b,4);return b})(),
        (()=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(priceLamports),0);return b})(),
      ])
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: collectionPDA, isSigner: false, isWritable: true },
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
      setItemTypeName(''); setItemTypeSymbol(''); setItemTypePrice('0.1')
      await fetchCollections()
    } catch (e) {
      setError('Failed to create item type: ' + (e as Error).message)
    } finally { setLoading(false) }
  }

  const fetchMyNfts = async () => {
    if (!publicKey) return
    try {
      const resp = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
      const mints: { mint: PublicKey }[] = []
      for (const it of resp.value) {
        const info: any = it.account.data.parsed.info
        const amount = Number(info.tokenAmount.amount)
        const decimals = Number(info.tokenAmount.decimals)
        if (decimals === 0 && amount > 0) {
          mints.push({ mint: new PublicKey(info.mint) })
        }
      }
      setMyMints(mints)
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
      const instructionData = Buffer.concat([
        Buffer.from(MARKETPLACE_DISCRIMINATOR),
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
       
       // Use original collection name (no timestamp needed)
       const uniqueCollectionName = collectionName
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
        masterEdition: masterEditionPDA.toString()
      })
      
             // Create transaction
       const transaction = new Transaction()
       
       // 1. Create mint account (kontrat mint'i oluşturuyor ama 1 token mint etmiyor)
       const mintRent = await getMinimumBalanceForRentExemptMint(connection)
       transaction.add(
         SystemProgram.createAccount({
           fromPubkey: publicKey,
           newAccountPubkey: mintKeypair.publicKey,
           space: MINT_SIZE,
           lamports: mintRent,
           programId: TOKEN_PROGRAM_ID,
         })
       )
       
       // 2. Initialize mint
       transaction.add(
         createInitializeMintInstruction(
           mintKeypair.publicKey,
           0, // decimals
           publicKey, // mint authority
           publicKey, // freeze authority
           TOKEN_PROGRAM_ID
         )
       )
       
       // 3. Create associated token account for admin
       const adminTokenAccount = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey)
       transaction.add(
         createAssociatedTokenAccountInstruction(
           publicKey, // payer
           adminTokenAccount, // associated token account
           publicKey, // owner (admin)
           mintKeypair.publicKey, // mint
           TOKEN_PROGRAM_ID,
           ASSOCIATED_TOKEN_PROGRAM_ID
         )
       )
       
       // 4. Mint 1 token to admin (master edition için gerekli)
       transaction.add(
         createMintToInstruction(
           mintKeypair.publicKey, // mint
           adminTokenAccount, // destination
           publicKey, // authority
           1, // amount (1 token for master edition)
           [], // multiSigners
           TOKEN_PROGRAM_ID
         )
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
      
      const instructionData = Buffer.concat([
        Buffer.from(COLLECTION_DISCRIMINATOR),
        // collection_name (String)
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
        // max_supply (u64)
        (() => {
          const buf = Buffer.alloc(8)
          buf.writeBigUInt64LE(BigInt(maxSupply), 0)
          return buf
        })(),
        // price (u64)
        (() => {
          const buf = Buffer.alloc(8)
          buf.writeBigUInt64LE(BigInt(Math.floor(parseFloat(collectionPrice) * LAMPORTS_PER_SOL)), 0)
          return buf
        })(),
        // royalty (u16)
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
            { pubkey: metadataPDA, isSigner: false, isWritable: true },
            { pubkey: masterEditionPDA, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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
      setMaxSupply('1000')
      setCollectionPrice('0.1')
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
      const instructionData = Buffer.concat([
        Buffer.from(MINT_NFT_DISCRIMINATOR),
        (() => {
          const buf = Buffer.alloc(4 + nameBuffer.length)
          buf.writeUInt32LE(nameBuffer.length, 0)
          nameBuffer.copy(buf, 4)
          return buf
        })(),
      ])
      
      // 1. Add mint NFT instruction
      transaction.add(
        new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: collectionPDA, isSigner: false, isWritable: true },
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
    } catch (error) {
      console.error('Error minting NFT:', error)
      setError('Failed to mint NFT: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = marketplace && publicKey && marketplace.admin.equals(publicKey)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            NFT Marketplace
          </h1>
          {isMounted && (
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded" />
          )}
        </div>
        <div className="mb-6 flex gap-2">
          <button onClick={() => setActiveTab('marketplace')} className={`px-3 py-1 rounded ${activeTab==='marketplace'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Marketplace</button>
          <button onClick={() => setActiveTab('my')} className={`px-3 py-1 rounded ${activeTab==='my'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>My NFTs</button>
          {isAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`px-3 py-1 rounded ${activeTab==='admin'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Admin</button>
          )}
        </div>

        {!connected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect your wallet to start</h2>
            <p className="text-gray-300">You need to connect your Solana wallet to interact with the marketplace.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-300">{success}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Marketplace Status */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Marketplace Status</h2>
              {marketplace ? (
                <div className="space-y-2">
                  <p className="text-green-300">✅ Marketplace is initialized</p>
                  <p className="text-sm text-gray-300">Admin: {marketplace.admin.toString().slice(0, 8)}...</p>
                  <p className="text-sm text-gray-300">Fee: {marketplace.fee_bps / 100}%</p>
                  <p className="text-sm text-gray-300">Total Collections: {marketplace.total_collections}</p>
                  {isAdmin && <p className="text-yellow-300">🔑 You are the marketplace admin</p>}
                </div>
              ) : (
                <div>
                  <p className="text-red-300 mb-4">❌ Marketplace not initialized</p>
                  <button
                    onClick={initializeMarketplace}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    {loading ? 'Initializing...' : 'Initialize Marketplace'}
                  </button>
                </div>
              )}
            </div>

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
                    placeholder="Max Supply"
                    value={maxSupply}
                    onChange={(e) => setMaxSupply(e.target.value)}
                    className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (SOL)"
                    value={collectionPrice}
                    onChange={(e) => setCollectionPrice(e.target.value)}
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
                  disabled={loading || !marketplace || !collectionName || !collectionSymbol || !collectionUri || !maxSupply || !collectionPrice || !royalty}
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
                      const uri = `ipfs://${metaCid}`
                      setSuccess(`Uploaded. URI: ${uri}`)
                      setCollectionUri(uri)
                    }catch(e){ setError((e as Error).message) } finally { setLoading(false) }
                  }}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >Upload to Pinata</button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input type="text" placeholder="Item Type Name" value={itemTypeName} onChange={e=>setItemTypeName(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <input type="text" placeholder="Item Type Symbol" value={itemTypeSymbol} onChange={e=>setItemTypeSymbol(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                  <input type="text" placeholder="Item Type URI (from Pinata)" value={collectionUri} onChange={e=>setCollectionUri(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300 md:col-span-2" />
                  <input type="number" step="0.01" placeholder="Price (SOL)" value={itemTypePrice} onChange={e=>setItemTypePrice(e.target.value)} className="bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-gray-300" />
                </div>
                <button onClick={createItemType} disabled={loading || !selectedAdminCollection} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded">Create Item Type</button>
              </div>
            )}
 
            {/* Collections List (Marketplace tab) */}
            {activeTab==='marketplace' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">NFT Collections</h2>
                <button
                  onClick={fetchCollections}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  Refresh
                </button>
              </div>
              
              {collections.length === 0 ? (
                <p className="text-gray-300">No collections found. {isAdmin ? 'Create one above!' : 'Admin can create collections.'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collections.map((collection, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h3 className="text-lg font-semibold mb-2">{collection.name}</h3>
                      <p className="text-sm text-gray-300 mb-1">Symbol: {collection.symbol}</p>
                      <p className="text-sm text-gray-300 mb-1">
                        Price: {(collection.price / LAMPORTS_PER_SOL).toFixed(3)} SOL
                      </p>
                      <p className="text-sm text-gray-300 mb-1">
                        Supply: {collection.current_supply}/{collection.max_supply}
                      </p>
                      <p className="text-sm text-gray-300 mb-1">
                        Royalty: {(collection.royalty / 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-300 mb-1">
                        Status: {collection.is_active ? 
                          <span className="text-green-300">Active</span> : 
                          <span className="text-red-300">Inactive</span>
                        }
                      </p>
                      {collection.uri && (
                        <p className="text-xs text-gray-400 mb-4 truncate" title={collection.uri}>
                          URI: {collection.uri}
                        </p>
                      )}
                      {/* Item types */}
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold">Item Types</p>
                        {(itemTypesByCollection[collectionKey(collection)] || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No item types yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {itemTypesByCollection[collectionKey(collection)]!.map((it, i) => (
                              <div key={i} className="flex items-center justify-between bg-white/10 rounded px-2 py-1">
                                <div>
                                  <div className="text-sm">{it.name}</div>
                                  <div className="text-xs text-gray-300">{(it.price / LAMPORTS_PER_SOL).toFixed(3)} SOL</div>
                                </div>
                                <button
                                  onClick={() => setSelectedCollection(collection)}
                                  disabled={loading || !collection.is_active || collection.current_supply >= collection.max_supply}
                                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold px-3 py-1 rounded text-sm"
                                >
                                  Select
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Mint NFT Modal */}
            {selectedCollection && activeTab==='marketplace' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-white/20">
                  <h2 className="text-2xl font-semibold mb-4">Mint NFT from {selectedCollection.name}</h2>
                  <div className="space-y-4 mb-4">
                    <div className="bg-white/10 rounded-lg p-4">
                      <p className="text-sm text-gray-300 mb-2">NFT Details:</p>
                      <p className="text-white">Name: {selectedCollection.name} #{selectedCollection.current_supply + 1}</p>
                      <p className="text-white">Symbol: {selectedCollection.symbol}</p>
                      <p className="text-white">Price: {(selectedCollection.price / LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                      <p className="text-white">Supply: {selectedCollection.current_supply + 1}/{selectedCollection.max_supply}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mintNFT(selectedCollection, (itemTypesByCollection[collectionKey(selectedCollection)] || [])[0]?.name || '')}
                      disabled={loading || !(itemTypesByCollection[collectionKey(selectedCollection)]||[]).length}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                      {loading ? 'Minting...' : `Mint for ${(selectedCollection.price / LAMPORTS_PER_SOL).toFixed(3)} SOL`}
                    </button>
                    <button
                      onClick={() => setSelectedCollection(null)}
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
            {activeTab==='my' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">My NFTs</h2>
                  <button onClick={fetchMyNfts} disabled={loading} className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-bold py-1 px-3 rounded text-sm">Refresh</button>
                </div>
                {myMints.length===0 ? (
                  <p className="text-gray-300">No NFTs found in this wallet (decimals 0 tokens).</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myMints.map((m, i)=>(
                      <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="text-xs text-gray-300 mb-2">Mint</div>
                        <div className="font-mono text-sm break-all">{m.mint.toBase58()}</div>
                        <a href={`https://solscan.io/token/${m.mint.toBase58()}?cluster=devnet`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-indigo-300 hover:underline text-sm">View on Solscan</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}