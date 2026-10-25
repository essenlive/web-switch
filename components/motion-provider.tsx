"use client"

import { LazyMotion } from "motion/react"

// Animation features load after the first paint; `m` components render still until then
const features = () => import("./motion-features").then(mod => mod.default)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={features} strict>{children}</LazyMotion>
}
