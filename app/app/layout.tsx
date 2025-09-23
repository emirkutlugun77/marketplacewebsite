import type { ReactNode } from "react"
import WalletConnect from "@/components/wallet-connect"
import AppMenu from "@/components/app-menu"
import Footer from "@/components/footer"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      {/* Header with black underline */}
      <header className="w-full border-b border-black">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-lg sm:text-xl">
            <span className="font-sans">vybe</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <AppMenu />
            <WalletConnect />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <ConditionalFooter />
    </div>
  )
}

function ConditionalFooter() {
  // Only show footer on non-token pages
  if (typeof window !== "undefined" && window.location.pathname === "/app/token") {
    return null
  }
  return <Footer />
}
