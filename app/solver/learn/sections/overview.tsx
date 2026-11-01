import { Lead, Section } from '../section'

const ENGINES = [
  { tag: 'Guarantee: the optimum', name: 'Exact', text: 'Explore everything, in order of the number of moves. The first win is the shortest.', size: '4×4 and 5×5 grids.' },
  { tag: 'Deterministic', name: 'Beam', text: 'At each layer, push everywhere and keep only the W cheapest positions.', size: 'All grids, tested up to 10×10.' },
  { tag: 'Random, reproducible', name: 'Genetic', text: 'Evolve lists of moves: keep the best, cross them, mutate them.', size: 'Up to 8×8, in stages or at once.' },
  { tag: 'Variant', name: 'Push genes', text: 'The genetic search, but a gene is a whole push and the walk is computed.', size: 'At best on par with the plain one.' },
]
const IDEAS = [
  { name: 'A fast simulator', text: 'The rules rewritten on a flat array. A test compares it with the real game machine, move after move.' },
  { name: 'Push, don’t walk', text: 'Walking on the ring does not change the grid. The engines search where to push and pay the walk as a cost.' },
  { name: 'A cost', text: 'Tiles left, closeness to the next line, and moves played. It ranks positions that are not won yet.' },
]
const Card = ({ tag, name, text, size }: { tag?: string; name: string; text: string; size?: string }) => (
  <div className="flex min-w-0 flex-col gap-1 rounded-md bg-muted p-3">
    {tag && <span className="text-xs font-bold text-muted-foreground">{tag}</span>}
    <b>{name}</b><span>{text}</span>
    {size && <span className="text-sm text-muted-foreground">{size}</span>}
  </div>
)

export function Overview() {
  return (
    <Section id="overview" title="How to read this page">
      <Lead>The example grid is <code>4x4:a</code>, a grid of the benchmark. Its shortest solution takes 10 moves, which lets us judge every method. Each section has guided steps (Previous and Next) and tools to explore freely. What you do moves the grid on the side: the position being developed, the positions the beam keeps, a genome played gene by gene. The label above the grid tells which method is driving it.</Lead>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{ENGINES.map(e => <Card key={e.name} {...e} />)}</div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2.5">{IDEAS.map(e => <Card key={e.name} {...e} />)}</div>
    </Section>
  )
}
