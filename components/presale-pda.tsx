"use client"

import * as React from "react"
import { PublicKey } from "@solana/web3.js"

// Must match on-chain declare_id! in marketplace program
const PROGRAM_ID = new PublicKey("8KzE3LCicxv13iJx2v2V4VQQNWt4QHuvfuH8jxYnkGQ1")

export default function PresalePDA() {
  const [pda, setPda] = React.useState<string>("")
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    try {
      const [addr] = PublicKey.findProgramAddressSync([Buffer.from("presale")], PROGRAM_ID)
      setPda(addr.toBase58())
    } catch (e) {
      setPda("")
    }
  }, [])

  if (!pda) return null

  return (
    <div className="flex items-center gap-2 border border-white/30 text-white/90 rounded px-2 py-1 bg-white/10">
      <span className="text-xs opacity-80">presale wallet</span>
      <code className="text-xs font-mono">
        {pda.slice(0, 6)}...{pda.slice(-6)}
      </code>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(pda)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          } catch {}
        }}
        className="text-xs underline underline-offset-2 hover:opacity-80"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  )
}


