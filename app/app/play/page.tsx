"use client"
// This page can serve as a general introduction to the "Play" section
// or redirect to a default sub-page like 'village'.

export default function PlayPage() {
  return (
    <main className="min-h-[60vh]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold lowercase">play</h1>
        <p className="mt-2 text-neutral-600">
          Welcome to the arena. Choose a game mode from the menu: Village or Dual.
        </p>
      </div>
    </main>
  )
}
