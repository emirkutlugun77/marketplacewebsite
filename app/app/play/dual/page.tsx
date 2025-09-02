"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

// Mock data for listings and user balance
const listings = [
  { amount: 200, user: "Player1", stats: "10W 5L" },
  { amount: 500, user: "Player2", stats: "22W 10L" },
  { amount: 100, user: "Player3", stats: "5W 0L" },
  { amount: 200, user: "Player4", stats: "15W 15L" },
  { amount: 1000, user: "Player5", stats: "50W 20L" },
  { amount: 200, user: "Player6", stats: "8W 8L" },
]

const userBalance = 500 // Mock balance

function HoldToProceed({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = React.useState(0)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const startHolding = () => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          onComplete()
          return 100
        }
        return prev + 1.5
      })
    }, 20)
  }

  const stopHolding = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setProgress(0) // Reset progress if hold is released
    }
  }

  return (
    <>
      {/* Full screen sweep overlay with pointer-events-none */}
      <div
        className="fixed top-0 left-0 h-full bg-black transition-all duration-100 ease-linear z-20 pointer-events-none"
        style={{ width: `${progress}%` }}
      />
      <Button
        variant="outline"
        className="h-10 px-4 text-sm border-black text-black hover:bg-black/5 bg-transparent relative z-10"
        onMouseDown={startHolding}
        onMouseUp={stopHolding}
        onMouseLeave={stopHolding}
        onTouchStart={startHolding}
        onTouchEnd={stopHolding}
      >
        Hold to Proceed
      </Button>
    </>
  )
}

function CreateBidDialog() {
  const [bidAmount, setBidAmount] = React.useState([100])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-black bg-transparent">
          Create Your Own Bid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Bid</DialogTitle>
        </DialogHeader>
        {userBalance > 0 ? (
          <div className="py-6 space-y-6">
            <div className="text-center">
              <span className="text-3xl font-bold">${bidAmount[0]}</span>
              <span className="text-sm text-neutral-500"> MINI</span>
            </div>
            <Slider
              defaultValue={bidAmount}
              max={userBalance}
              step={10}
              onValueChange={setBidAmount}
              className="w-full"
            />
            <div className="text-xs text-center text-neutral-600">Your balance: ${userBalance} MINI</div>
            <Button className="w-full" onClick={() => alert(`Bid for ${bidAmount[0]} MINI confirmed!`)}>
              Confirm Bid
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-neutral-700 mb-4">Acquire $MINI tokens to participate.</p>
            <Button>Purchase Tokens</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function DualPage() {
  const [view, setView] = React.useState<"explanation" | "grid">("explanation")

  if (view === "explanation") {
    return (
      <main className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4 relative bg-white">
        {/* Background DUAL text with inverted color effect */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 mix-blend-difference">
          <span className="breathe-text-dual">DUAL</span>
        </div>

        {/* Foreground content */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-semibold lowercase">Dual</h1>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            Rules are simple we let you select all the cards and your skill talks. Create or choose one listing amount
            for the duals amount, and the game begins.
          </p>
          <div className="mt-8">
            <HoldToProceed onComplete={() => setView("grid")} />
          </div>
        </div>

        {/* Global styles for this page */}
        <style jsx global>{`
          @font-face {
            font-family: 'TheFont';
            src: url("https://garet.typeforward.com/assets/fonts/shared/TFMixVF.woff2") format('woff2');
          }

          .breathe-text-dual {
            font-family: 'TheFont', sans-serif;
            font-size: clamp(20vw, 40vw, 60vh);
            color: white; /* Set to white for mix-blend-difference to work */
            text-align: center;
            animation: letter-breathe-dual 3s ease-in-out infinite;
            opacity: 0.8; /* Adjust opacity of the effect */
          }

          @keyframes letter-breathe-dual {
            from,
            to {
              font-variation-settings: 'wght' 100;
            }
            50% {
              font-variation-settings: 'wght' 900;
            }
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="min-h-[60vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between border-b border-black pb-4 mb-8">
          <h1 className="text-2xl font-semibold lowercase">select your match</h1>
          <CreateBidDialog />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {listings.map((listing, i) => (
            <div
              key={i}
              className="group relative aspect-square border border-black flex items-center justify-center cursor-pointer hover:bg-black hover:text-white transition-colors"
            >
              <div className="text-center">
                <div className="text-xs text-neutral-500 group-hover:text-neutral-400">$MINI</div>
                <div className="text-2xl font-bold">{listing.amount}</div>
              </div>
              <div className="absolute inset-0 bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-center">
                  <div className="font-semibold">{listing.user}</div>
                  <div className="text-sm text-neutral-300">{listing.stats}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
