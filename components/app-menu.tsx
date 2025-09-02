"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function AppMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const go = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Open menu"
        className={cn(
          "inline-flex items-center justify-center",
          "h-10 px-3 rounded-md border border-black",
          "bg-transparent text-black",
          "transition-colors hover:bg-black/5 focus:outline-none",
        )}
      >
        {/* Animated 3-lines hamburger */}
        <span className="relative block h-3.5 w-5">
          <span
            className={cn(
              "absolute left-0 top-0 h-0.5 w-5 bg-black transition-all",
              open ? "translate-y-1.75 rotate-45" : "translate-y-0 rotate-0",
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-1.5 h-0.5 w-5 bg-black transition-opacity",
              open ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            className={cn(
              "absolute left-0 bottom-0 h-0.5 w-5 bg-black transition-all",
              open ? "-translate-y-1.75 -rotate-45" : "translate-y-0 rotate-0",
            )}
          />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(
          "w-52 rounded-md border border-neutral-200 bg-white p-1 shadow-lg",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        )}
      >
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            go("/app/docs")
          }}
        >
          Docs
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            go("/app/presale")
          }}
        >
          Presale
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            go("/app/marketplace")
          }}
        >
          NFT Marketplace
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              go("/app/token")
            }}
          >
            Token
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault()
                go("/app/token/purchase")
              }}
            >
              Purchase
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault()
                go("/app/token/withdraw")
              }}
            >
              Withdraw
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault()
                go("/app/token/stake")
              }}
            >
              Stake
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              go("/app/play")
            }}
          >
            Play
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault()
                go("/app/play/village")
              }}
            >
              Village
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault()
                go("/app/play/dual")
              }}
            >
              Dual
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            go("/app/store")
          }}
        >
          Store
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            go("/app/craft")
          }}
        >
          Craft
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[11px] text-neutral-500">v0.1</div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
