"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Footer() {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <footer className="bg-black text-white border-t border-white">
      <div className="w-full">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white">
          {/* Navigation */}
          <div className="p-8">
            <h3 className="text-lg font-semibold lowercase mb-6">navigation</h3>
            <div className="space-y-4">
              <div>
                <Link href="/app/docs" className="text-sm hover:text-white/70 transition-colors lowercase">
                  docs
                </Link>
              </div>
              <div>
                <Link href="/app/presale" className="text-sm hover:text-white/70 transition-colors lowercase">
                  presale
                </Link>
              </div>
              <div>
                <button
                  onClick={() => toggleSection("token")}
                  className="flex items-center gap-2 text-sm font-medium lowercase hover:text-white/70 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      expandedSections.token ? "rotate-90" : "rotate-0",
                    )}
                  />
                  token
                </button>
                {expandedSections.token && (
                  <div className="pl-5 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Link href="/app/token" className="block text-xs hover:text-white/70 transition-colors lowercase">
                      overview
                    </Link>
                    <Link
                      href="/app/token/purchase"
                      className="block text-xs hover:text-white/70 transition-colors lowercase"
                    >
                      purchase
                    </Link>
                    <Link
                      href="/app/token/withdraw"
                      className="block text-xs hover:text-white/70 transition-colors lowercase"
                    >
                      withdraw
                    </Link>
                    <Link
                      href="/app/token/stake"
                      className="block text-xs hover:text-white/70 transition-colors lowercase"
                    >
                      stake
                    </Link>
                  </div>
                )}
              </div>
              <div>
                <Link href="/app/store" className="text-sm hover:text-white/70 transition-colors lowercase">
                  store
                </Link>
              </div>
              <div>
                <Link href="/app/craft" className="text-sm hover:text-white/70 transition-colors lowercase">
                  craft
                </Link>
              </div>
              <div>
                <button
                  onClick={() => toggleSection("play")}
                  className="flex items-center gap-2 text-sm font-medium lowercase hover:text-white/70 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      expandedSections.play ? "rotate-90" : "rotate-0",
                    )}
                  />
                  play
                </button>
                {expandedSections.play && (
                  <div className="pl-5 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/app/play/village"
                      className="block text-xs hover:text-white/70 transition-colors lowercase"
                    >
                      village
                    </Link>
                    <Link
                      href="/app/play/dual"
                      className="block text-xs hover:text-white/70 transition-colors lowercase"
                    >
                      dual
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social & Community */}
          <div className="p-8">
            <h3 className="text-lg font-semibold lowercase mb-6">community</h3>
            <div className="space-y-4">
              <a
                href="https://twitter.com/minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                twitter
              </a>
              <a
                href="https://discord.gg/minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                discord
              </a>
              <a
                href="https://t.me/minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                telegram
              </a>
              <a
                href="https://github.com/minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                github
              </a>
              <a
                href="https://medium.com/@minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                medium
              </a>
              <a
                href="https://reddit.com/r/minimega"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-white/70 transition-colors lowercase"
              >
                reddit
              </a>
            </div>
          </div>

          {/* Contact & Support */}
          <div className="p-8">
            <h3 className="text-lg font-semibold lowercase mb-6">contact</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-white/70 lowercase mb-1">general inquiries</div>
                <a href="mailto:hello@minimega.com" className="text-sm hover:text-white/70 transition-colors lowercase">
                  hello@minimega.com
                </a>
              </div>
              <div>
                <div className="text-xs text-white/70 lowercase mb-1">support</div>
                <a
                  href="mailto:support@minimega.com"
                  className="text-sm hover:text-white/70 transition-colors lowercase"
                >
                  support@minimega.com
                </a>
              </div>
              <div>
                <div className="text-xs text-white/70 lowercase mb-1">partnerships</div>
                <a
                  href="mailto:partners@minimega.com"
                  className="text-sm hover:text-white/70 transition-colors lowercase"
                >
                  partners@minimega.com
                </a>
              </div>
              <div>
                <div className="text-xs text-white/70 lowercase mb-1">press</div>
                <a href="mailto:press@minimega.com" className="text-sm hover:text-white/70 transition-colors lowercase">
                  press@minimega.com
                </a>
              </div>
            </div>
          </div>

          {/* Careers */}
          <div className="p-8">
            <h3 className="text-lg font-semibold lowercase mb-6">careers</h3>
            <div className="space-y-4">
              <p className="text-xs text-white/70 lowercase leading-relaxed">
                join our team and help build the future of gaming finance
              </p>
              <div className="space-y-3">
                <div>
                  <button
                    onClick={() => toggleSection("careers")}
                    className="flex items-center gap-2 text-sm font-medium lowercase hover:text-white/70 transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        expandedSections.careers ? "rotate-90" : "rotate-0",
                      )}
                    />
                    open positions
                  </button>
                  {expandedSections.careers && (
                    <div className="pl-5 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <a
                        href="/careers/frontend-developer"
                        className="block text-xs hover:text-white/70 transition-colors lowercase"
                      >
                        frontend developer
                      </a>
                      <a
                        href="/careers/blockchain-engineer"
                        className="block text-xs hover:text-white/70 transition-colors lowercase"
                      >
                        blockchain engineer
                      </a>
                      <a
                        href="/careers/game-designer"
                        className="block text-xs hover:text-white/70 transition-colors lowercase"
                      >
                        game designer
                      </a>
                      <a
                        href="/careers/community-manager"
                        className="block text-xs hover:text-white/70 transition-colors lowercase"
                      >
                        community manager
                      </a>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-white/20">
                  <a
                    href="mailto:careers@minimega.com"
                    className="text-sm hover:text-white/70 transition-colors lowercase"
                  >
                    careers@minimega.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white">
            {/* Logo & Copyright */}
            <div className="p-6 flex items-center">
              <div>
                <div className="font-semibold text-lg lowercase mb-1">
                  <span>mini</span> <span className="text-white/70">mega</span>
                </div>
                <div className="text-xs text-white/50 lowercase">© 2024 mini mega. all rights reserved.</div>
              </div>
            </div>

            {/* Legal Links */}
            <div className="p-6 flex items-center justify-center">
              <div className="flex flex-wrap gap-4 text-xs">
                <Link href="/privacy" className="hover:text-white/70 transition-colors lowercase">
                  privacy policy
                </Link>
                <span className="text-white/30">•</span>
                <Link href="/terms" className="hover:text-white/70 transition-colors lowercase">
                  terms of service
                </Link>
                <span className="text-white/30">•</span>
                <Link href="/cookies" className="hover:text-white/70 transition-colors lowercase">
                  cookie policy
                </Link>
              </div>
            </div>

            {/* Version & Status */}
            <div className="p-6 flex items-center justify-end">
              <div className="text-right">
                <div className="text-xs text-white/50 lowercase mb-1">version 0.1.0</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-white/70 lowercase">all systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
