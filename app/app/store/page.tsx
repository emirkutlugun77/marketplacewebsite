"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { products, type Product } from "@/data/products"
import { X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Cat = "buildings" | "troops" | "others"

const categories: { key: Cat; label: string }[] = [
  { key: "buildings", label: "buildings" },
  { key: "troops", label: "troops" },
  { key: "others", label: "others" },
]

const typeOptions = ["common", "rare", "epic", "legendary"] as const
type TypeOpt = (typeof typeOptions)[number]

export default function StorePage() {
  const [selected, setSelected] = React.useState<Cat | null>(null)
  const [types, setTypes] = React.useState<TypeOpt[]>([])

  const toggleType = (t: TypeOpt) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const filtered: Product[] = React.useMemo(() => {
    const base = selected ? products.filter((p) => p.category === selected) : []
    if (types.length === 0) return base
    return base.filter((p) => types.includes(p.type))
  }, [selected, types])

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="w-full">
        {/* Full-bleed initial selector with uniform 1px black lines */}
        {!selected ? (
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-3",
              "border border-black divide-y sm:divide-y-0 sm:divide-x divide-black",
              "h-[calc(100vh-4rem)]",
            )}
          >
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelected(c.key)}
                className={cn(
                  "flex items-center justify-center text-lg sm:text-xl lowercase",
                  "hover:bg-black/5 transition-colors",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {/* Top container: uniform borders everywhere */}
            <div
              className={cn(
                "border-y border-black",
                "grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black",
              )}
            >
              {categories.map((c) => {
                const isActive = selected === c.key
                return (
                  <div key={c.key} className="flex items-center justify-between gap-3 px-4 h-14 lowercase">
                    <button
                      onClick={() => setSelected(c.key)}
                      className={cn(
                        "text-base sm:text-lg",
                        isActive ? "underline underline-offset-4" : "hover:underline underline-offset-4",
                      )}
                    >
                      {c.label}
                    </button>
                    {isActive && (
                      <button
                        aria-label="Deselect category"
                        onClick={() => setSelected(null)}
                        className="p-1 hover:bg-black/5 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom container: full width; left filter exactly 20% on md+ */}
            <div
              className={cn(
                "grid grid-cols-1 md:grid-cols-[20%_80%]",
                "divide-y md:divide-y-0 md:divide-x divide-black",
                "border-b border-black",
                "min-h-[60vh]",
              )}
            >
              {/* Filters (20%) — single column list */}
              <div className="p-6 border-r border-black">
                <div className="lowercase text-sm text-neutral-700 mb-3">filters</div>
                <div className="space-y-3">
                  <div className="lowercase text-xs text-neutral-600">types</div>
                  <div className="flex flex-col gap-2">
                    {typeOptions.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm lowercase cursor-pointer">
                        <Checkbox
                          checked={types.includes(t)}
                          onCheckedChange={() => toggleType(t)}
                          className="border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products (80%) */}
              <div className="p-6">
                {filtered.length === 0 ? (
                  <div className="text-sm text-neutral-500 lowercase">no items match your filters</div>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/app/store/${p.slug}`}
                          className={cn(
                            "group block border border-black rounded-sm overflow-hidden bg-white",
                            "transition-all duration-300 ease-out",
                            "hover:translate-x-2 hover:-translate-y-2",
                            "hover:shadow-[-8px_8px_25px_rgba(0,0,0,0.15)]",
                          )}
                        >
                          <div className="aspect-square w-full bg-white flex items-center justify-center">
                            <img
                              src={p.image || "/placeholder.svg"}
                              alt={p.name}
                              className={cn(
                                "h-full w-full object-contain p-3",
                                "transition-shadow duration-300 ease-out",
                                "group-hover:shadow-[0_0_36px_rgba(255,255,255,0.65),0_0_60px_rgba(255,235,0,0.35)]",
                              )}
                            />
                          </div>
                          <div className="px-3 py-2 border-t border-black">
                            <div className="text-[12px] lowercase text-neutral-700">{p.name}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
