'use client'

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from '@/components/ui/switch'
import { Label } from "@/components/ui/label";
import { getRandomString } from "@/lib/utils";
import { MAX_SIDE } from "@/lib/matrixHelpers";

const MIN_SIDE = 2;

export default function Custom() {
  const router = useRouter()
  const [width, setWidth] = useState(6)
  const [height, setHeight] = useState(8)
  const [seed, setSeed] = useState("")
  const [timer, setTimer] = useState(false)
  // Random seed after mount to avoid hydration errors
  useEffect(() => { setSeed(getRandomString()) }, [])

  const valid = [width, height].every(n => Number.isInteger(n) && n >= MIN_SIDE && n <= MAX_SIDE) && /^[\w-]+$/.test(seed)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    router.push(`/g?s=${encodeURIComponent(seed)}&cs=${width}x${height}${timer ? "&t=true" : ""}`)
  }

  const side = (id: string, label: string, value: number, set: (n: number) => void) => (
    <div className="grow space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={MIN_SIDE} max={MAX_SIDE} value={value}
        onChange={e => set(e.target.valueAsNumber)} />
    </div>
  )

  return (
    <main className="grow flex flex-col w-full">
      <form onSubmit={submit} className="flex flex-col gap-3 p-4 bg-background rounded-lg">
        <h2 className="text-2xl font-bold">Custom game</h2>
        <div className="flex gap-3">
          {side("width", "Columns", width, setWidth)}
          {side("height", "Rows", height, setHeight)}
        </div>
        <p className="text-sm text-muted-foreground">Sizes from {MIN_SIDE} to {MAX_SIDE}.</p>
        <div className="space-y-2">
          <Label htmlFor="seed">Seed</Label>
          <div className="flex gap-2">
            <Input id="seed" value={seed} onChange={e => setSeed(e.target.value.trim())} />
            <Button type="button" variant="outline" size="icon" aria-label="New random seed" onClick={() => setSeed(getRandomString())}>
              <Dices />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Letters, digits, - and _. The same seed and size always give the same grid.</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
          <Label htmlFor="timer" className="grow cursor-pointer text-base">
            Time challenge
            <span className="block text-sm font-normal text-muted-foreground">The grid grows while you play</span>
          </Label>
          <Switch id="timer" checked={timer} onCheckedChange={setTimer} />
        </div>
        <Button type="submit" disabled={!valid}>Play this grid</Button>
      </form>
    </main>
  )
}
