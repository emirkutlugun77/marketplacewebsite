"use client"

import * as React from "react"
import { notFound } from "next/navigation"
import { products } from "@/data/products"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GlowButton } from "@/components/glow-button"

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [open, setOpen] = React.useState<string | undefined>(undefined)
  const item = products.find((p) => p.slug === params.slug)
  if (!item) return notFound()

  // Gallery (use the same image repeated to keep layout consistent)
  const gallery = [item.image, item.image, item.image]

  return (
    <main className="min-h-[100dvh] bg-white">
      {/* Keep header visible always (header is defined in app/app/layout.tsx). 
          Set below content to account for header height and keep right sticky area aligned. */}
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left: images column (scrolls under header), full width, no borders */}
        <div className="relative md:col-span-7 max-h-[calc(100dvh-4rem)] overflow-y-auto no-scrollbar">
          {/* Title overlay inside the image column and not moving out of place */}
          <div className="pointer-events-none sticky top-4 z-10 px-4">
            <h1 className="text-4xl sm:text-5xl font-semibold lowercase text-black">{item.name}</h1>
          </div>

          {/* Images (full-bleed within column) */}
          <div className="space-y-0">
            {gallery.map((src, i) => (
              <div key={i} className="w-full">
                <img
                  src={src || "/placeholder.svg"}
                  alt={`${item.name} image ${i + 1}`}
                  className="block w-full h-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: info column (sticky, with consistent borders) */}
        <div className="md:col-span-5 md:border-l md:border-black">
          <div className="md:sticky md:top-16 p-4 sm:p-6">
            <p className="mt-1 text-neutral-700 text-sm">{item.description}</p>

            {/* Separate bordered accordions with consistent 1px borders all around */}
            <div className="mt-6 space-y-3">
              <Accordion
                type="single"
                collapsible
                value={open}
                onValueChange={(v) => setOpen(v as string | undefined)}
                className="space-y-3"
              >
                <AccordionItem value="details" className="border border-black rounded-none">
                  <AccordionTrigger className="px-4 py-3 lowercase">details</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-neutral-700 border-t border-black">
                    Materials, dimensions, upgrade paths, and rarities. Minimal placeholder text.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="questions" className="border border-black rounded-none">
                  <AccordionTrigger className="px-4 py-3 lowercase">questions</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-neutral-700 border-t border-black">
                    Common FAQs about this item and usage in your village.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="policy" className="border border-black rounded-none">
                  <AccordionTrigger className="px-4 py-3 lowercase">policy</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-neutral-700 border-t border-black">
                    Refund policy and on-chain settlement details.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Purchase button - moved lower with more spacing */}
            <div className="mt-10">
              <GlowButton onClick={() => alert("Purchase flow coming soon")}>purchase</GlowButton>
            </div>
          </div>
        </div>
      </div>

      {/* Hide scrollbars utility */}
      <style jsx global>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  )
}
