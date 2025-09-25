"use client"

import * as React from "react"
import { WalletContextProvider } from "@/components/wallet-connect"

export default function Providers({ children }: { children: React.ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>
}


