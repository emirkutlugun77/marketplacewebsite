"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function GlowButton({ className, children, ...props }: ButtonProps) {
  return (
    <div className="relative inline-block">
      <Button
        {...props}
        className={cn(
          "px-7 py-4 rounded-full text-base font-medium",
          "bg-neutral-900 text-white border border-white/10",
          "shadow-[0_0_24px_rgba(255,255,255,0.55)]",
          "hover:shadow-[0_0_40px_rgba(255,255,255,0.85)]",
          "transition-shadow",
          className,
        )}
      >
        {children}
      </Button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-full"
        style={{
          boxShadow: "0 0 70px 22px rgba(255,255,255,0.35)",
          filter: "blur(12px)",
        }}
      />
    </div>
  )
}
