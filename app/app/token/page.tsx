"use client"

import * as React from "react"

const sections = [
  {
    title: "Revolutionary Gaming Economy",
    content:
      "Experience the future of gaming finance with our innovative token system that bridges traditional gaming with decentralized finance.",
  },
  {
    title: "Seamless Integration",
    content:
      "Our platform seamlessly integrates with your favorite games, allowing you to earn, trade, and stake tokens across multiple gaming ecosystems.",
  },
  {
    title: "Community Driven",
    content:
      "Join a thriving community of gamers and investors who are shaping the future of gaming finance through collective decision-making and governance.",
  },
  {
    title: "Secure & Transparent",
    content:
      "Built on Solana blockchain technology, ensuring fast transactions, low fees, and complete transparency in all your gaming financial activities.",
  },
  {
    title: "Future Ready",
    content:
      "Prepare for the next generation of gaming finance with cutting-edge features, cross-chain compatibility, and endless possibilities for growth.",
  },
]

export default function TokenPage() {
  const [currentSection, setCurrentSection] = React.useState(0)
  const [progress, setProgress] = React.useState(0)
  const [displayText, setDisplayText] = React.useState("")
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [showFooter, setShowFooter] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  // Glitch reveal effect for all sections
  React.useEffect(() => {
    if (currentSection >= sections.length) return

    const currentText = sections[currentSection].content
    setIsAnimating(true)
    setDisplayText("")

    let glitchIndex = 0
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const glitchInterval = setInterval(() => {
      if (glitchIndex < currentText.length) {
        let glitchedText = currentText.slice(0, glitchIndex)
        for (let i = 0; i < 3 && glitchIndex + i < currentText.length; i++) {
          glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)]
        }
        setDisplayText(glitchedText)

        setTimeout(() => {
          setDisplayText(currentText.slice(0, glitchIndex + 1))
        }, 17)

        glitchIndex++
      } else {
        setDisplayText(currentText)
        setIsAnimating(false)
        clearInterval(glitchInterval)
      }
    }, 25)

    return () => clearInterval(glitchInterval)
  }, [currentSection])

  // Update stepped progress based on current section (20% increments)
  React.useEffect(() => {
    // Start with 0 progress for the first section, then increment
    const newProgress = currentSection * 20
    setProgress(newProgress)
  }, [currentSection])

  // Scroll handler
  React.useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight - container.clientHeight
      const scrollProgress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0

      // Calculate current section (0-4) based on scroll position
      const newSection = Math.floor(scrollProgress * (sections.length - 1) + 0.5)
      const clampedSection = Math.min(newSection, sections.length - 1)

      if (clampedSection !== currentSection) {
        setCurrentSection(clampedSection)
      }

      // Show footer only when we've reached the last section and scrolled near the end
      const shouldShowFooter = scrollProgress > 0.95 && clampedSection === sections.length - 1
      if (shouldShowFooter !== showFooter) {
        setShowFooter(shouldShowFooter)
      }

      // Update video time based on scroll
      if (videoRef.current) {
        const videoDuration = videoRef.current.duration || 10
        videoRef.current.currentTime = scrollProgress * videoDuration
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [currentSection, showFooter])

  return (
    <main className="min-h-[100dvh] bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-[100vh] flex items-center justify-center overflow-hidden p-4 sm:p-8">
        {/* Background breathing text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="breathe-text">vybe</span>
        </div>

        {/* Floating coin and lines */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Lines positioned relative to the coin */}
          <div className="absolute -left-48 top-1/2 w-48 h-px bg-black/30" />
          <div className="absolute -right-48 top-1/2 w-48 h-px bg-black/30" />

          <div className="mb-8 animate-float">
            <img
              src="/images/new-token-coin.png"
              alt="VYBE Token"
              className="w-80 h-80 sm:w-96 sm:h-96 object-contain drop-shadow-2xl hover:scale-110 transition-transform duration-500 ease-out"
            />
          </div>

          <p className="text-sm sm:text-base text-neutral-600 lowercase tracking-wide">New gen strategy finance.</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="h-[100vh] relative no-scrollbar" ref={containerRef} style={{ overflowY: "auto" }}>
        {/* New Progress Bar Implementation */}
        <div className="absolute left-1/2 top-0 transform -translate-x-1/2 h-full w-px bg-black/10 z-10">
          <div
            className="absolute top-0 left-0 w-full bg-black transition-all duration-500 ease-in-out"
            style={{ height: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 h-[500vh]">
          {/* Left: Text Content */}
          <div className="relative pr-8">
            <div className="sticky top-0 h-[100vh] flex flex-col justify-center p-8 sm:p-12">
              {/* Content */}
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold lowercase text-black">
                  {sections[currentSection]?.title || ""}
                </h2>
                <div className="text-base sm:text-lg text-neutral-700 leading-relaxed min-h-[120px]">{displayText}</div>
                <div className="text-xs text-neutral-400 lowercase">
                  Section {currentSection + 1} of {sections.length}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Video */}
          <div className="relative pl-8">
            <div className="sticky top-0 h-[100vh] flex items-center justify-center bg-neutral-50">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                controls={false}
                style={{ pointerEvents: "none" }}
              >
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/360-degree%20video%20earrings%20on%20white%20background-KnPCkPc62mx9JJGgawoDEdy3043Gef.mp4"
                  type="video/mp4"
                />
              </video>
            </div>
          </div>
        </div>

        {/* Footer - Only show when last section is reached */}
        {showFooter && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <footer className="bg-black text-white border-t border-white">
              <div className="w-full">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white">
                  {/* Navigation */}
                  <div className="p-8">
                    <h3 className="text-lg font-semibold lowercase mb-6">navigation</h3>
                    <div className="space-y-4">
                      <div>
                        <a href="/app/about" className="text-sm hover:text-white/70 transition-colors lowercase">
                          about
                        </a>
                      </div>
                      <div>
                        <a href="/app/docs" className="text-sm hover:text-white/70 transition-colors lowercase">
                          docs
                        </a>
                      </div>
                      <div>
                        <a href="/app/token" className="text-sm hover:text-white/70 transition-colors lowercase">
                          token
                        </a>
                      </div>
                      <div>
                        <a href="/app/store" className="text-sm hover:text-white/70 transition-colors lowercase">
                          store
                        </a>
                      </div>
                      <div>
                        <a href="/app/craft" className="text-sm hover:text-white/70 transition-colors lowercase">
                          craft
                        </a>
                      </div>
                      <div>
                        <a href="/app/village" className="text-sm hover:text-white/70 transition-colors lowercase">
                          village
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Social & Community */}
                  <div className="p-8">
                    <h3 className="text-lg font-semibold lowercase mb-6">community</h3>
                    <div className="space-y-4">
                      <a
                        href="https://twitter.com/vybe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm hover:text-white/70 transition-colors lowercase"
                      >
                        twitter
                      </a>
                      <a
                        href="https://discord.gg/vybe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm hover:text-white/70 transition-colors lowercase"
                      >
                        discord
                      </a>
                      <a
                        href="https://t.me/vybe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm hover:text-white/70 transition-colors lowercase"
                      >
                        telegram
                      </a>
                      <a
                        href="https://github.com/vybe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm hover:text-white/70 transition-colors lowercase"
                      >
                        github
                      </a>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="p-8">
                    <h3 className="text-lg font-semibold lowercase mb-6">contact</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-white/70 lowercase mb-1">general</div>
                        <a
                          href="mailto:hello@vybe.com"
                          className="text-sm hover:text-white/70 transition-colors lowercase"
                        >
                          hello@vybe.com
                        </a>
                      </div>
                      <div>
                        <div className="text-xs text-white/70 lowercase mb-1">support</div>
                        <a
                          href="mailto:support@vybe.com"
                          className="text-sm hover:text-white/70 transition-colors lowercase"
                        >
                          support@vybe.com
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Legal */}
                  <div className="p-8">
                    <h3 className="text-lg font-semibold lowercase mb-6">legal</h3>
                    <div className="space-y-4">
                      <a href="/privacy" className="block text-sm hover:text-white/70 transition-colors lowercase">
                        privacy policy
                      </a>
                      <a href="/terms" className="block text-sm hover:text-white/70 transition-colors lowercase">
                        terms of service
                      </a>
                      <div className="pt-4 border-t border-white/20">
                        <div className="text-xs text-white/50 lowercase">© 2024 vybe</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        )}
      </section>

      {/* Animation keyframes and font definitions */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        @font-face {
          font-family: 'TheFont';
          src: url("https://garet.typeforward.com/assets/fonts/shared/TFMixVF.woff2") format('woff2');
        }

        .breathe-text {
          font-family: 'TheFont', sans-serif;
          font-size: clamp(10vw, 25vw, 50vh);
          color: rgb(0, 0, 0);
          text-align: center;
          animation: letter-breathe 3s ease-in-out infinite;
        }

        @keyframes letter-breathe {
          from, to {
            font-variation-settings: 'wght' 100;
          }
          50% {
            font-variation-settings: 'wght' 900;
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
