"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Crafting recipes
const craftingRecipes = {
  "machined-metal": {
    name: "machined metal",
    ingredients: [{ name: "precious metal", quantity: 3, image: "/images/precious-metal.png" }],
    cost: 600,
  },
  "building-token": {
    name: "building token",
    ingredients: [
      { name: "scrap metal", quantity: 2, image: "/images/scrap-metal.png" },
      { name: "precious metal", quantity: 1, image: "/images/precious-metal.png" },
    ],
    cost: 400,
  },
  "shooter-token": {
    name: "shooter token",
    ingredients: [
      { name: "scrap metal", quantity: 1, image: "/images/scrap-metal.png" },
      { name: "machined metal", quantity: 1, image: "/images/precious-metal.png" }, // Placeholder for machined metal
    ],
    cost: 800,
  },
  "defense-building-token": {
    name: "defense building token",
    ingredients: [
      { name: "precious metal", quantity: 2, image: "/images/precious-metal.png" },
      { name: "machined metal", quantity: 2, image: "/images/precious-metal.png" }, // Placeholder for machined metal
    ],
    cost: 1200,
  },
}

// Craftable items from store
const craftableItems = [
  { value: "machined-metal", label: "machined metal" },
  { value: "building-token", label: "building token" },
  { value: "shooter-token", label: "shooter token" },
  { value: "defense-building-token", label: "defense building token" },
]

export default function CraftPage() {
  const [selectedItem, setSelectedItem] = React.useState<string>("")

  const selectedRecipe = selectedItem ? craftingRecipes[selectedItem as keyof typeof craftingRecipes] : null

  return (
    <main className="min-h-[100vh] bg-white">
      <div className="w-full h-[100vh]">
        {/* Full-size container with 2 equal columns */}
        <div className="grid grid-cols-2 h-full border border-black">
          {/* Left Column: Your Items */}
          <div className="relative border-r border-black">
            {/* Header with dividing line */}
            <div className="h-[10%] border-b border-black flex items-center pl-4">
              <span className="text-sm font-semibold lowercase">your items</span>
            </div>

            {/* Grid Container - 9 rows */}
            <div className="h-[90%] relative">
              <div className="grid grid-cols-10 grid-rows-9 h-full w-full">
                {Array.from({ length: 90 }, (_, i) => (
                  <div key={`left-${i}`} className="border-r border-b border-black" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Craft */}
          <div className="relative">
            {/* Header with dividing line */}
            <div className="h-[10%] border-b border-black flex items-center pl-4">
              <span className="text-sm font-semibold lowercase">craft</span>
            </div>

            {/* Grid Container - 9 rows */}
            <div className="h-[90%] relative">
              <div className="grid grid-cols-10 grid-rows-9 h-full w-full">
                {Array.from({ length: 90 }, (_, i) => {
                  const row = Math.floor(i / 10)
                  const col = i % 10

                  // Active area: 7x3 (cols 2-8, rows 3-5)
                  const isInActiveArea = col >= 2 && col <= 8 && row >= 3 && row <= 5
                  const isActiveRow2 = row === 4 && col >= 2 && col <= 8 // Recipe row

                  return (
                    <div
                      key={`right-${i}`}
                      className={cn("border-r border-b relative", isInActiveArea ? "border-black" : "border-gray-300")}
                    >
                      {/* Recipe content - only show in middle row */}
                      {selectedRecipe && isActiveRow2 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs p-1">
                          {col === 2 && selectedRecipe.ingredients[0] && (
                            <img
                              src={selectedRecipe.ingredients[0].image || "/placeholder.svg"}
                              alt={selectedRecipe.ingredients[0].name}
                              className="h-full w-full object-contain filter grayscale"
                            />
                          )}
                          {col === 3 && <span>×</span>}
                          {col === 4 && selectedRecipe.ingredients[1] && (
                            <img
                              src={selectedRecipe.ingredients[1].image || "/placeholder.svg"}
                              alt={selectedRecipe.ingredients[1].name}
                              className="h-full w-full object-contain filter grayscale"
                            />
                          )}
                          {col === 5 && selectedRecipe.ingredients[1] && <span>×</span>}
                          {col === 6 && selectedRecipe.ingredients[2] && (
                            <img
                              src={selectedRecipe.ingredients[2].image || "/placeholder.svg"}
                              alt={selectedRecipe.ingredients[2].name}
                              className="h-full w-full object-contain filter grayscale"
                            />
                          )}
                          {col === 7 && <span>=</span>}
                          {col === 8 && <span className="lowercase font-medium">{selectedRecipe.name}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Dropdown overlay - dynamically positioned in first row of active area */}
              <div
                className="absolute bg-white border border-black z-10"
                style={{
                  left: "20%", // col 2/10
                  top: "33.33%", // row 3/9
                  width: "70%", // 7 columns
                  height: "11.11%", // 1 row
                }}
              >
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="w-full h-full border-none text-xs rounded-none focus:ring-0">
                    <SelectValue placeholder="select item to craft" />
                  </SelectTrigger>
                  <SelectContent>
                    {craftableItems.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="lowercase text-xs">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost overlay - positioned in third row of active area */}
              {selectedRecipe && (
                <div
                  className="absolute bg-white border border-black z-10 flex items-center justify-center"
                  style={{
                    left: "20%", // col 2/10
                    top: "55.55%", // row 5/9
                    width: "70%", // 7 columns
                    height: "11.11%", // 1 row
                  }}
                >
                  <span className="text-xs lowercase text-gray-600">{selectedRecipe.cost} $mini</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for proper grid sizing */}
      <style jsx global>{`
        .grid-rows-9 {
          grid-template-rows: repeat(9, minmax(0, 1fr));
        }
      `}</style>
    </main>
  )
}
