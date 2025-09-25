"use client"

import * as React from "react"
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, clusterApiUrl, Connection } from "@solana/web3.js"
import { WalletContextProvider } from "@/components/wallet-connect"
import { useWallet } from "@solana/wallet-adapter-react"

const PROGRAM_ID = new PublicKey("8KzE3LCicxv13iJx2v2V4VQQNWt4QHuvfuH8jxYnkGQ1")

function InnerButton() {
  const { publicKey, signTransaction, connected } = useWallet()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)

  // Optional: restrict button visibility by env-admin
  const adminEnv = process.env.NEXT_PUBLIC_PRESALE_ADMIN || ""
  const isAdmin = React.useMemo(() => {
    if (!connected || !publicKey) return false
    if (!adminEnv) return true // if no env, allow any connected wallet to try
    return publicKey.toBase58() === adminEnv
  }, [connected, publicKey, adminEnv])

  const onRestart = async () => {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      if (!publicKey || !signTransaction) throw new Error("Cüzdan bağlı değil")

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

      // presale PDA
      const [presalePda] = PublicKey.findProgramAddressSync([Buffer.from("presale")], PROGRAM_ID)

      // Anchor discriminator for instruction: sha256("global:restart_presale").slice(0, 8)
      const discriminator = new Uint8Array([137, 20, 194, 15, 240, 82, 236, 229])

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: presalePda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(discriminator),
      })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction({ feePayer: publicKey, recentBlockhash: blockhash })
      tx.add(ix)
      const signed = await signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed")
      setOk("Presale yeniden başlatıldı")
    } catch (e: any) {
      setError(e?.message || "İşlem hatası")
    } finally {
      setBusy(false)
      setTimeout(() => { setError(null); setOk(null) }, 3000)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRestart}
        disabled={busy}
        className="text-xs border border-white/30 text-white/90 hover:bg-white/10 rounded px-2 py-1"
      >
        {busy ? "Restarting..." : "Restart Presale"}
      </button>
      {ok && <span className="text-xs text-green-300">{ok}</span>}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  )
}

export default function PresaleAdminActions() {
  // Wrap with wallet context to ensure hooks work regardless of page provider
  return (
    <WalletContextProvider>
      <InnerButton />
    </WalletContextProvider>
  )
}


