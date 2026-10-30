'use client'

import { useState } from 'react'
import { Copy, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ENGINE_PRESETS, FIELDS, type EngineSpec } from '@/lib/solver/engines'

export const freshVariants = (): EngineSpec[] => ENGINE_PRESETS.map(p => ({ ...p, options: { ...p.options } }))

const input = 'w-full p-2 rounded-md border bg-background text-foreground disabled:opacity-60'

// The engines you can run, each with all its options. One of them for a single run (radio), several for the benchmark (checkbox).
export function Variants({ variants, setVariants, mode, picked, setPicked, locked }: {
  variants: EngineSpec[]
  setVariants: (v: EngineSpec[]) => void
  mode: 'one' | 'many'
  picked: string[]
  setPicked: (ids: string[]) => void
  locked: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)

  const update = (id: string, change: (v: EngineSpec) => EngineSpec) => setVariants(variants.map(v => v.id === id ? change(v) : v))
  const duplicate = (v: EngineSpec) => {
    let n = 2
    while (variants.some(o => o.id === `${v.id}-${n}`)) n++
    const copy = { ...v, id: `${v.id}-${n}`, label: `${v.label} (${n})`, options: { ...v.options }, reference: false }
    setVariants(variants.flatMap(o => o.id === v.id ? [o, copy] : [o]))
    setOpen(copy.id)
  }
  const remove = (id: string) => {
    if (variants.length < 2) return
    setVariants(variants.filter(v => v.id !== id))
    const left = picked.filter(p => p !== id)
    setPicked(left.length || mode === 'many' ? left : [variants.find(v => v.id !== id)!.id])
  }
  const toggle = (id: string) => {
    if (mode === 'one') return setPicked([id])
    setPicked(picked.includes(id) ? picked.filter(p => p !== id) : [...picked, id])
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground">{mode === 'one' ? 'Engine' : 'Engines to compare'}</h3>
        <Button variant="secondary" size="sm" disabled={locked} onClick={() => { setVariants(freshVariants()); setOpen(null) }}>Reset</Button>
      </div>
      {variants.map(v => (
        <div key={v.id} className="flex flex-col gap-2 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <input
              type={mode === 'one' ? 'radio' : 'checkbox'}
              name="engine" aria-label={`Use ${v.label}`}
              checked={picked.includes(v.id)} disabled={locked}
              onChange={() => toggle(v.id)}
              className="accent-foreground size-4 shrink-0"
            />
            <input
              value={v.label} disabled={locked} aria-label="Name"
              onChange={e => update(v.id, o => ({ ...o, label: e.target.value }))}
              className="grow min-w-0 bg-transparent text-sm font-bold"
            />
            <span className="text-xs text-muted-foreground shrink-0">{v.kind}</span>
            <Button variant={open === v.id ? 'default' : 'secondary'} size="icon" aria-label={`Options of ${v.label}`} aria-pressed={open === v.id} onClick={() => setOpen(open === v.id ? null : v.id)}><SlidersHorizontal /></Button>
            <Button variant="secondary" size="icon" aria-label={`Duplicate ${v.label}`} disabled={locked} onClick={() => duplicate(v)}><Copy /></Button>
            <Button variant="secondary" size="icon" aria-label={`Remove ${v.label}`} disabled={locked || variants.length < 2} onClick={() => remove(v.id)}><Trash2 /></Button>
          </div>
          {open === v.id && (
            <div className="grid grid-cols-2 gap-2">
              {FIELDS[v.kind].map(f => f.type === 'boolean' ? (
                <label key={f.key} title={f.hint} className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={v.options[f.key] === true} disabled={locked} className="accent-foreground size-4"
                    onChange={e => update(v.id, o => ({ ...o, options: { ...o.options, [f.key]: e.target.checked } }))} />
                  {f.label} <span className="opacity-70">· {f.hint}</span>
                </label>
              ) : (
                <label key={f.key} title={f.hint} className="text-xs text-muted-foreground">{f.label}
                  <input
                    type="number" min={f.min} step={f.step} placeholder={f.fallback} disabled={locked} className={input}
                    value={typeof v.options[f.key] === 'number' ? (v.options[f.key] as number) : ''}
                    onChange={e => update(v.id, o => ({ ...o, options: { ...o.options, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) } }))}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
