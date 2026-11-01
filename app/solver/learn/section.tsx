import type { ReactNode } from 'react'

// A block of the page: a title, a sentence, then its guided steps and tools. `data-section` is what the page watches to give the grid back.
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-section={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-4 flex-col gap-3.5 rounded-lg bg-background p-4">
      <h2 id={`${id}-title`} className="text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}
export const Lead = ({ children }: { children: ReactNode }) => <p className="max-w-prose">{children}</p>
export const Panel = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-3">{children}</div>
