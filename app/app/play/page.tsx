"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"
import { PlayerSide } from "./types"
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js"
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor"
// Remove duplicate import above
import { getAssociatedTokenAddressSync } from "@solana/spl-token"

const PROGRAM_ID = new PublicKey("12LJUQx5mfVfqACGgEac65Xe6PMGnYm5rdaRRcU4HE7V")

type RoomAccount = {
  publicKey: PublicKey
  account: {
    creator: PublicKey
    challenger: PublicKey | null
    room_id: BN
    stake_lamports: BN
    status: number
    bump: number
  }
}

export default function PlayPage() {
  const wallet = useWallet()
  const [user, setUser] = useState<{ publicKey: string; chosenSide: keyof typeof PlayerSide } | null>(null)
  const backendBase = 'http://localhost:3001'

  // Load user from backend when wallet connects
  useEffect(() => {
    const load = async () => {
      if (!wallet.publicKey) return
      const pk = wallet.publicKey.toString()
      console.log('Loading user for:', pk)
      try {
        const res = await fetch(`${backendBase}/users/by-public-key?publicKey=${pk}`)
        console.log('User fetch response:', res.status)
        if (res.ok) {
          const u = await res.json()
          console.log('User found:', u)
          setUser({ publicKey: u.publicKey, chosenSide: u.chosenSide })
        } else {
          // Not found yet → try register silently
          console.log('User not found, registering...')
          await fetch(`${backendBase}/users/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: pk }) })
          setUser({ publicKey: pk, chosenSide: 'NOT_CHOSEN' as any })
          console.log('User registered with NOT_CHOSEN')
        }
      } catch (e) {
        console.error('Error loading user:', e)
      }
    }
    load()
  }, [wallet.publicKey])

  // Choose side popup state
  const [pendingSide, setPendingSide] = useState<keyof typeof PlayerSide | null>(null)
  const confirmChoose = async () => {
    if (!pendingSide || !wallet.publicKey) return
    const pk = wallet.publicKey.toString()
    try {
      await fetch(`${backendBase}/users/choose-side`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: pk, side: pendingSide }) })
      setUser((prev) => (prev ? { ...prev, chosenSide: pendingSide } : prev))
      setPendingSide(null)
    } catch {}
  }
  const [rpcUrl] = useState<string>(clusterApiUrl("devnet"))
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [rooms, setRooms] = useState<RoomAccount[]>([])

  const [roomId, setRoomId] = useState<string>("")
  const [stake, setStake] = useState<string>("")
  const [creatorAddressToJoin, setCreatorAddressToJoin] = useState<string>("")

  const [loadedIdl, setLoadedIdl] = useState<Idl | null>(null)

  const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl])

  const provider = useMemo(() => {
    if (!wallet || !wallet.publicKey) return null
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" })
  }, [connection, wallet])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!provider) return
      try {
        const fetched = await Program.fetchIdl(PROGRAM_ID, provider)
        if (!cancelled) setLoadedIdl(fetched as Idl)
      } catch (e) {
        console.error("Failed to fetch IDL from chain", e)
        if (!cancelled) setLoadedIdl(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [provider])

  const program = useMemo(() => {
    if (!provider || !loadedIdl) return null
    try {
      return new Program(loadedIdl, PROGRAM_ID, provider)
    } catch (e) {
      console.error("Failed to init Program", e)
      return null
    }
  }, [provider, loadedIdl])

  const listRooms = useCallback(async () => {
    if (!program) return
    setLoadingRooms(true)
    try {
      const fetched = (await program.account.room.all()) as RoomAccount[]
      fetched.sort((a, b) => Number(b.account.room_id.sub(a.account.room_id)))
      setRooms(fetched)
    } finally {
      setLoadingRooms(false)
    }
  }, [program])

  useEffect(() => {
    if (program) {
      listRooms()
    }
  }, [program, listRooms])

  // Generate a random u64 room id when wallet connects or page loads
  useEffect(() => {
    if (!roomId) {
      const timestamp = BigInt(Date.now())
      const randomness = BigInt(Math.floor(Math.random() * 1_000_000))
      const generated = timestamp * 1_000_000n + randomness
      setRoomId(generated.toString())
    }
  }, [roomId])

  const createRoom = useCallback(async () => {
    if (!program || !provider || !wallet.publicKey) return
    try {
      setCreating(true)
      const parsedRoomId = BigInt(roomId || "0")
      const parsedStake = BigInt(stake || "0")
      if (parsedRoomId <= 0n) throw new Error("Room ID > 0 olmalı")
      if (parsedStake <= 0n) throw new Error("Stake > 0 olmalı")
      const collectionMintEnv = process.env.NEXT_PUBLIC_COLLECTION_MINT
      if (!collectionMintEnv) throw new Error("NEXT_PUBLIC_COLLECTION_MINT tanımlı değil")
      const nftMintPk = new PublicKey(collectionMintEnv)
      const creator = wallet.publicKey
      const creatorNftToken = getAssociatedTokenAddressSync(nftMintPk, creator)
      const tokenMetadataProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      const [nftMetadata] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), tokenMetadataProgram.toBuffer(), nftMintPk.toBuffer()],
        tokenMetadataProgram,
      )

      const [roomPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), creator.toBuffer(), Buffer.from(new BN(parsedRoomId.toString()).toArrayLike(Buffer, "le", 8))],
        PROGRAM_ID,
      )

      await program.methods
        .createRoom(new BN(parsedRoomId.toString()), new BN(parsedStake.toString()))
        .accounts({
          room: roomPda,
          creator,
          nftMint: nftMintPk,
          nftMetadata,
          collectionMint: nftMintPk,
          creatorNftToken,
          systemProgram: SystemProgram.programId,
          tokenMetadataProgram,
        })
        .rpc()

      await listRooms()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setCreating(false)
    }
  }, [program, provider, wallet.publicKey, roomId, stake, listRooms])

  const joinRoom = useCallback(async () => {
    if (!program || !provider || !wallet.publicKey) return
    try {
      setJoining(true)
      const creatorPk = new PublicKey(creatorAddressToJoin)
      const parsedRoomId = BigInt(roomId || "0")
      if (parsedRoomId <= 0n) throw new Error("Room ID > 0 olmalı")
      const collectionMintEnv = process.env.NEXT_PUBLIC_COLLECTION_MINT
      if (!collectionMintEnv) throw new Error("NEXT_PUBLIC_COLLECTION_MINT tanımlı değil")
      const nftMintPk = new PublicKey(collectionMintEnv)

      const [roomPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), creatorPk.toBuffer(), Buffer.from(new BN(parsedRoomId.toString()).toArrayLike(Buffer, "le", 8))],
        PROGRAM_ID,
      )

      const challenger = wallet.publicKey
      const challengerNftToken = getAssociatedTokenAddressSync(nftMintPk, challenger)
      const tokenMetadataProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      const [nftMetadata] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), tokenMetadataProgram.toBuffer(), nftMintPk.toBuffer()],
        tokenMetadataProgram,
      )

      await program.methods
        .joinRoom()
        .accounts({
          room: roomPda,
          creator: creatorPk,
          challenger,
          nftMint: nftMintPk,
          nftMetadata,
          collectionMint: nftMintPk,
          challengerNftToken,
          systemProgram: SystemProgram.programId,
          tokenMetadataProgram,
        })
        .rpc()

      await listRooms()
    } catch (e) {
      console.error(e)
      alert((e as Error).message)
    } finally {
      setJoining(false)
    }
  }, [program, provider, wallet.publicKey, creatorAddressToJoin, roomId, listRooms])

  return (
    <main className="min-h-[60vh]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Choose side section */}
        {user && user.chosenSide === 'NOT_CHOSEN' && (
          <div className="w-full mb-12">
            <h2 className="text-center text-5xl font-bold mb-12 lowercase">choose side</h2>
            <div className="flex justify-center gap-12">
              <button onClick={() => setPendingSide('DARK' as any)} className="relative group w-[30vw] aspect-[4/3] overflow-hidden border-2 border-black hover:border-gray-600 transition-all duration-300">
                <Image src="/images/dark_side.jpeg" alt="dark side" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </button>
              <button onClick={() => setPendingSide('HOLY' as any)} className="relative group w-[30vw] aspect-[4/3] overflow-hidden border-2 border-black hover:border-gray-600 transition-all duration-300">
                <Image src="/images/holy_side.png" alt="holy side" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </button>
            </div>

            {/* Confirmation popup */}
            {pendingSide && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
                <div className="bg-white border-2 border-black p-8 w-full max-w-md">
                  <div className="text-2xl font-bold mb-6 lowercase">confirm choice</div>
                  <div className="mb-8 text-lg">are you sure to join {pendingSide.toLowerCase()} side?</div>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => setPendingSide(null)} className="px-6 py-3 border-2 border-black hover:bg-gray-100 transition-colors">cancel</button>
                    <button onClick={confirmChoose} className="px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors">confirm</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {user && user.chosenSide !== 'NOT_CHOSEN' && (
        <>
        <h1 className="text-2xl font-semibold lowercase">play</h1>
        <p className="mt-2 text-neutral-600">Anchor programıyla oda oluştur, katıl ve listele.</p>

        {/* Debug info */}
        <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
          <div>Wallet: {wallet.publicKey ? "Connected" : "Not connected"}</div>
          <div>Provider: {provider ? "Ready" : "Not ready"}</div>
          <div>Program: {program ? "Ready" : "Not ready"}</div>
          <div>Loaded IDL: {loadedIdl ? "Yes" : "No"}</div>
          <div>Collection Mint: {process.env.NEXT_PUBLIC_COLLECTION_MINT || "Not set"}</div>
          <div>User: {user ? `${user.publicKey?.slice(0,8)}... - ${user.chosenSide}` : "Not loaded"}</div>
          <div>Show Chooser: {user && user.chosenSide === 'NOT_CHOSEN' ? "YES" : "NO"}</div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-md border p-4">
            <h2 className="text-lg font-semibold">Create Room</h2>
            <div className="mt-4 space-y-3">
              <div className="text-sm text-neutral-600">Room ID otomatik oluşturuluyor: <span className="font-mono">{roomId}</span></div>
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Stake (lamports)"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
              <button
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                onClick={createRoom}
                disabled={!wallet.publicKey || creating || !program}
              >
                {creating ? "Creating..." : "Create Room"}
              </button>
              <div className="text-xs text-gray-500">
                Disabled: {!wallet.publicKey ? "No wallet" : !program ? "No program" : "Ready"}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <h2 className="text-lg font-semibold">Join Room</h2>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Creator Address"
                value={creatorAddressToJoin}
                onChange={(e) => setCreatorAddressToJoin(e.target.value)}
              />
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Room ID (u64)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <div className="text-sm text-neutral-600">NFT mint otomatik: env NEXT_PUBLIC_COLLECTION_MINT</div>
              <button
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                onClick={joinRoom}
                disabled={!wallet.publicKey || joining || !program}
              >
                {joining ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms</h2>
            <button
              className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
              onClick={listRooms}
              disabled={!program || loadingRooms}
            >
              {loadingRooms ? "Loading..." : "Refresh"}
            </button>
          </div>
          <div className="mt-4 divide-y">
            {rooms.length === 0 && <div className="text-sm text-neutral-500">No rooms</div>}
            {rooms.map((r) => (
              <div key={r.publicKey.toBase58()} className="py-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div><span className="text-neutral-500">PDA:</span> {r.publicKey.toBase58()}</div>
                  <div><span className="text-neutral-500">Creator:</span> {r.account.creator.toBase58()}</div>
                  <div><span className="text-neutral-500">Room ID:</span> {r.account.room_id.toString()}</div>
                  <div><span className="text-neutral-500">Stake:</span> {r.account.stake_lamports.toString()} lamports</div>
                  <div><span className="text-neutral-500">Status:</span> {r.account.status}</div>
                  <div><span className="text-neutral-500">Challenger:</span> {r.account.challenger ? r.account.challenger.toBase58() : "-"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </main>
  )
}
