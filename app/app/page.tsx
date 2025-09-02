"use client"

import { cn } from "@/lib/utils"

export default function AppPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-white">
      <section className={cn("flex-1")}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome to the App</h1>
          <p className="mt-2 text-neutral-600">
            Choose a category from the menu to explore: About, Docs, Token, Store, Craft, Village.
          </p>
        </div>
      </section>
    </main>
  )
}
