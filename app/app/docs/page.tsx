"use client"

import * as React from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const docSections = [
  {
    title: "overview",
    items: [
      { title: "what is mini mega?", slug: "what-is-mini-mega" },
      { title: "getting started", slug: "getting-started" },
      { title: "tokenomics", slug: "tokenomics" },
    ],
  },
  {
    title: "gaming mechanics",
    items: [
      { title: "village system", slug: "village-system" },
      { title: "dual battles", slug: "dual-battles" },
      { title: "crafting system", slug: "crafting-system" },
      { title: "resource management", slug: "resource-management" },
    ],
  },
  {
    title: "marketplace",
    items: [
      { title: "store overview", slug: "store-overview" },
      { title: "item categories", slug: "item-categories" },
      { title: "trading mechanics", slug: "trading-mechanics" },
    ],
  },
  {
    title: "defi integration",
    items: [
      { title: "token staking", slug: "token-staking" },
      { title: "liquidity pools", slug: "liquidity-pools" },
      { title: "yield farming", slug: "yield-farming" },
    ],
  },
  {
    title: "technical",
    items: [
      { title: "smart contracts", slug: "smart-contracts" },
      { title: "solana integration", slug: "solana-integration" },
      { title: "security", slug: "security" },
    ],
  },
]

const docContent = {
  "what-is-mini-mega": {
    title: "what is mini mega?",
    content: `mini mega is a revolutionary gaming finance platform that bridges traditional strategy gaming with decentralized finance. Built on Solana, we combine the engaging mechanics of clash-style games with the financial opportunities of DeFi.

our platform allows players to truly own their in-game assets, trade them freely, and earn real value through gameplay. every building, troop, and resource in the game is tokenized, creating a player-driven economy where skill and strategy translate to financial rewards.

the core philosophy is simple: gaming should be rewarding, ownership should be real, and communities should control their own economies. we're not just building a game - we're creating a new paradigm for how gaming and finance intersect.`,
  },
  "getting-started": {
    title: "getting started",
    content: `welcome to mini mega! here's how to begin your journey:

**step 1: connect your wallet**
use phantom, solflare, or any solana-compatible wallet to connect to the platform. this wallet will hold your $mini tokens and all in-game assets.

**step 2: acquire $mini tokens**
purchase $mini tokens through our token page or earn them through gameplay. these tokens are used for crafting, trading, and participating in dual battles.

**step 3: build your village**
start with basic buildings like elixir collectors and defensive structures. each building generates resources and contributes to your village's strength.

**step 4: explore the marketplace**
browse the store for buildings, troops, and crafting materials. all items are player-owned nfts that can be traded freely.

**step 5: engage in battles**
participate in dual battles to test your strategy and earn rewards. stake $mini tokens to enter matches and compete against other players.`,
  },
  tokenomics: {
    title: "tokenomics",
    content: `the $mini token is the cornerstone of our gaming economy, designed to create sustainable value for players and stakeholders.

**token distribution:**
- 40% community rewards and gameplay incentives
- 25% development and operations
- 20% liquidity and market making
- 10% team and advisors (vested)
- 5% initial airdrop to early adopters

**utility mechanisms:**
- crafting and upgrading in-game assets
- staking for dual battle participation
- governance voting on platform decisions
- fee discounts for premium features

**deflationary mechanics:**
- token burning through crafting activities
- battle entry fees partially burned
- premium feature purchases reduce supply

**staking rewards:**
- earn yield from platform revenue
- bonus rewards for long-term staking
- governance power increases with stake duration`,
  },
  "village-system": {
    title: "village system",
    content: `the village is your base of operations in mini mega. unlike traditional games, every structure you build is a tokenized asset that you truly own.

**building categories:**
- **resource generators**: elixir collectors, gold mines, and material extractors
- **defensive structures**: cannons, tesla towers, and air artillery
- **research facilities**: upgrade labs and troop training centers
- **storage**: secure vaults for your resources and materials

**upgrade mechanics:**
buildings can be upgraded using crafted materials and $mini tokens. higher level structures generate more resources and provide better defensive capabilities.

**ownership model:**
every building is minted as an nft when constructed. you can trade, sell, or transfer buildings to other players, creating a dynamic real estate market within the game.

**strategic considerations:**
village layout affects both resource generation and defensive capabilities. optimal placement of buildings can maximize efficiency and protect against raids.`,
  },
  "dual-battles": {
    title: "dual battles",
    content: `dual battles are competitive matches where players stake $mini tokens and compete in strategic combat scenarios.

**battle mechanics:**
- players select their army composition from owned troops
- battles are resolved through strategic algorithms considering troop types, levels, and formations
- winners take the staked tokens, minus platform fees

**staking system:**
- choose from available stake amounts or create your own
- minimum stake requirements ensure meaningful competition
- automatic escrow system holds tokens during battles

**matchmaking:**
- players are matched based on village strength and battle history
- rating system ensures fair competition
- seasonal tournaments with special rewards

**rewards structure:**
- winner takes 90% of the total stake
- 5% goes to the platform treasury
- 5% distributed to $mini token stakers as yield`,
  },
  "crafting-system": {
    title: "crafting system",
    content: `the crafting system allows players to create advanced items and materials using basic resources and $mini tokens.

**crafting materials:**
- **scrap metal**: basic material obtained from battles and resource generation
- **precious metal**: refined material created from scrap metal
- **machined metal**: advanced component requiring precious metals and $mini tokens

**craftable items:**
- **building tokens**: unlock new building types and upgrades
- **troop tokens**: enhance army capabilities and unlock special units
- **defense tokens**: improve defensive structures and unlock advanced defenses

**crafting interface:**
the crafting page features a grid-based system where players can:
- select items to craft from dropdown menus
- view required materials and costs
- see crafting recipes with ingredient images
- manage inventory across organized grid slots`,
  },
}

export default function DocsPage() {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    overview: true,
  })
  const [activeItem, setActiveItem] = React.useState("what-is-mini-mega")
  const [collapsed, setCollapsed] = React.useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const currentDoc = docContent[activeItem as keyof typeof docContent]

  // Get current section and breadcrumb
  const currentSection = docSections.find((section) => section.items.some((item) => item.slug === activeItem))

  // Get all items for navigation
  const allItems = docSections.flatMap((section) => section.items)
  const currentIndex = allItems.findIndex((item) => item.slug === activeItem)
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null

  // Breadcrumb navigation
  const navigateToBreadcrumb = (level: string) => {
    if (level === "docs") {
      setActiveItem("what-is-mini-mega")
    } else if (level === currentSection?.title) {
      setActiveItem(currentSection.items[0].slug)
    }
  }

  return (
    <main className="min-h-[100vh] bg-white flex flex-col">
      {/* Top Container - Full Width */}
      <div className="w-full border-b border-black">
        <div className="w-full">
          <div className={cn("grid h-16", collapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[1fr_3fr]")}>
            {/* Left - Documentation Title */}
            <div className="flex items-center border-r border-black px-6 transition-all duration-300">
              {!collapsed && <h2 className="text-lg font-semibold lowercase">documentation</h2>}
            </div>

            {/* Right - Breadcrumb Navigation */}
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <button onClick={() => navigateToBreadcrumb("docs")} className="hover:text-black transition-colors">
                  docs
                </button>
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => navigateToBreadcrumb(currentSection?.title || "")}
                  className="hover:text-black transition-colors lowercase"
                >
                  {currentSection?.title}
                </button>
                <ChevronRight className="h-3 w-3" />
                <span className="lowercase">{currentDoc?.title}</span>
              </div>

              {/* Collapse Button */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform", collapsed ? "rotate-180" : "")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Container - Same Ratio, Flex-1 to fill remaining space */}
      <div className="flex-1 w-full">
        <div className={cn("grid h-full", collapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[1fr_3fr]")}>
          {/* Left - Navigation */}
          <div className="border-r border-black transition-all duration-300 h-full">
            {!collapsed && (
              <nav className="p-6 h-full">
                {docSections.map((section) => (
                  <div key={section.title} className="mb-6">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium lowercase hover:text-black/70 transition-colors mb-3"
                    >
                      {expandedSections[section.title] ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {section.title}
                    </button>

                    {expandedSections[section.title] && (
                      <div className="ml-5 space-y-2">
                        {section.items.map((item) => (
                          <button
                            key={item.slug}
                            onClick={() => setActiveItem(item.slug)}
                            className={cn(
                              "block w-full text-left text-xs lowercase py-2 px-3 transition-colors",
                              activeItem === item.slug ? "bg-black text-white" : "hover:bg-black/5",
                            )}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* Right - Content */}
          <div className="p-8 h-full flex flex-col">
            <div className="flex-1">
              <h1 className="text-3xl font-bold lowercase mb-8">{currentDoc?.title}</h1>

              <div className="prose prose-neutral max-w-none">
                {currentDoc?.content.split("\n\n").map((paragraph, index) => {
                  if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                    return (
                      <h3 key={index} className="text-lg font-semibold lowercase mt-8 mb-4">
                        {paragraph.replace(/\*\*/g, "")}
                      </h3>
                    )
                  } else if (paragraph.includes("**")) {
                    const parts = paragraph.split(/(\*\*.*?\*\*)/g)
                    return (
                      <p key={index} className="mb-4 leading-relaxed">
                        {parts.map((part, partIndex) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={partIndex} className="font-semibold">
                              {part.replace(/\*\*/g, "")}
                            </strong>
                          ) : (
                            part
                          ),
                        )}
                      </p>
                    )
                  } else if (paragraph.startsWith("- ")) {
                    const items = paragraph.split("\n- ").map((item) => item.replace(/^- /, ""))
                    return (
                      <ul key={index} className="list-disc list-inside mb-4 space-y-1">
                        {items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )
                  } else {
                    return (
                      <p key={index} className="mb-4 leading-relaxed text-neutral-700">
                        {paragraph}
                      </p>
                    )
                  }
                })}
              </div>
            </div>

            {/* Navigation with Content Titles - Stays at bottom */}
            <div className="border-t border-black pt-8 mt-8">
              <div className="grid grid-cols-2 gap-8">
                {/* Previous */}
                <div>
                  {prevItem ? (
                    <button onClick={() => setActiveItem(prevItem.slug)} className="text-left w-full group">
                      <div className="text-xs lowercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors mb-2">
                        ← previous
                      </div>
                      <div className="text-xs text-neutral-500 lowercase group-hover:text-black transition-colors">
                        {prevItem.title}
                      </div>
                    </button>
                  ) : (
                    <div className="opacity-50">
                      <div className="text-xs lowercase border border-black px-4 py-2 mb-2 cursor-not-allowed">
                        ← previous
                      </div>
                      <div className="text-xs text-neutral-500 lowercase">no previous page</div>
                    </div>
                  )}
                </div>

                {/* Next */}
                <div className="text-right">
                  {nextItem ? (
                    <button onClick={() => setActiveItem(nextItem.slug)} className="text-right w-full group">
                      <div className="text-xs lowercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors mb-2">
                        next →
                      </div>
                      <div className="text-xs text-neutral-500 lowercase group-hover:text-black transition-colors">
                        {nextItem.title}
                      </div>
                    </button>
                  ) : (
                    <div className="opacity-50">
                      <div className="text-xs lowercase border border-black px-4 py-2 mb-2 cursor-not-allowed">
                        next →
                      </div>
                      <div className="text-xs text-neutral-500 lowercase">no next page</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
