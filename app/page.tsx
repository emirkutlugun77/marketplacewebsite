"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import WalletConnect from "@/components/wallet-connect"

export default function Page() {
  const [displayText, setDisplayText] = React.useState("")
  const [isAnimating, setIsAnimating] = React.useState(false)

  // Glitch reveal effect for the tagline
  React.useEffect(() => {
    const targetText = "a breath in a chaotic market"
    setIsAnimating(true)
    setDisplayText("")

    let glitchIndex = 0
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const glitchInterval = setInterval(() => {
      if (glitchIndex < targetText.length) {
        let glitchedText = targetText.slice(0, glitchIndex)
        for (let i = 0; i < 3 && glitchIndex + i < targetText.length; i++) {
          glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)]
        }
        setDisplayText(glitchedText)

        setTimeout(() => {
          setDisplayText(targetText.slice(0, glitchIndex + 1))
        }, 17)

        glitchIndex++
      } else {
        setDisplayText(targetText)
        setIsAnimating(false)
        clearInterval(glitchInterval)
      }
    }, 25)

    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <main className={cn("min-h-[100dvh] flex flex-col", "relative overflow-hidden")}>
      {/* Full screen desert landscape background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/desert-landscape.png')",
        }}
      />

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Top Bar */}
      <header className="w-full relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-lg sm:text-xl text-white drop-shadow-lg">
            <span className="font-sans">mini</span> <span className="font-sans text-white/80">mega</span>
          </div>
          <div className="[&_button]:text-white [&_button]:border-white/30 [&_button]:hover:bg-white/10">
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center relative z-10">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          {/* Glitch text */}
          <div className="mb-8">
            <p className="text-xs sm:text-sm text-white/90 tracking-[0.2em] uppercase font-light drop-shadow-lg">
              {displayText}
            </p>
          </div>

          {/* Enter App button - positioned slightly down from center */}
          <div className="mt-16">
            <Link href="/app" className="relative">
              <Button
                size="lg"
                className={cn(
                  "px-8 py-6 text-base font-semibold",
                  "bg-white text-black",
                  "shadow-[0_0_24px_rgba(255,255,255,0.55)]",
                  "hover:shadow-[0_0_36px_rgba(255,255,255,0.85)]",
                  "hover:bg-white/90",
                  "transition-all duration-300",
                  "border border-white/20",
                )}
              >
                Enter App
              </Button>
              {/* white halo glow backdrop */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-md"
                style={{
                  boxShadow: "0 0 60px 18px rgba(255,255,255,0.35)",
                  filter: "blur(10px)",
                }}
              />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
