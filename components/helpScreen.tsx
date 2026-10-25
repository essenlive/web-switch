import { cn } from "@/lib/utils"
import { Move, BookText, MessageCircleQuestion, SquareArrowOutUpRight, CircleX } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { useEffect, useRef } from "react"

export function HelpScreen({
    className,
    visible,
    closeHelp,
    ...props
}:{ 

    className?: string,
    visible: boolean,
    closeHelp: () => void
 }) {
    
    const closeRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!visible) return
        const opener = document.activeElement as HTMLElement | null
        closeRef.current?.focus()
        const overflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") return closeHelp()
            if (e.key !== "Tab") return
            // keep Tab inside the dialog
            const items = dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button")
            if (!items?.length) return
            const first = items[0], last = items[items.length - 1]
            const active = document.activeElement
            if (!dialogRef.current?.contains(active)) { e.preventDefault(); first.focus() }
            else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
            else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
        }
        window.addEventListener("keydown", onKey)
        return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; opener?.focus() }
    }, [visible, closeHelp])

    return (
<AnimatePresence>
  {visible && (
            <motion.div
                    key="helpScreen"
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="About, rules and controls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "linear" }}
            className={cn("fixed inset-0 z-10 overflow-y-auto bg-gray-100 dark:bg-gray-900", className)} {...props}>
            <div className="p-4 flex flex-col max-w-xl mx-auto gap-2 min-h-dvh">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-3 bg-background rounded-lg">
                    <span className="text-xl font-bold pl-1">How to play</span>
                    <motion.button ref={closeRef} type="button" aria-label="Close" whileTap={{ scale: 0.95 }} onClick={closeHelp} className="flex justify-center items-center p-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <CircleX size={32} />
                    </motion.button>
                </div>
                <section className="flex flex-col gap-2 p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                        <BookText size={28} />
                        <h2 className="text-xl font-bold">Rules</h2>
                    </div>
                    <p className="text-base">Move your cursor to switch the lines. Line up the same shapes in a row or column to make them disappear.</p>
                    <p className="text-base">When the grid is only one square wide in any direction, you have won.</p>
                    <p className="text-base">Solve the grid in as few moves as you can.</p>
                </section>
                <section className="flex flex-col gap-2 p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                        <Move size={28} />
                        <h2 className="text-xl font-bold">Controls</h2>
                    </div>
                    <p className="text-base">Swipe, or use the arrow keys, to move the cursor.</p>
                    <p className="text-base">A long swipe goes faster.</p>
                    <p className="text-base">Press space or the restart button to start over.</p>
                </section>
                <section className="flex flex-col gap-2 p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                        <MessageCircleQuestion size={28} />
                        <h2 className="text-xl font-bold">About</h2>
                    </div>
                    <p className="text-base">This mini game is inspired by Russpack, a game I used to play on the Archos Gmini400 media player. All credit goes to its original creator.</p>
                    <p className="text-base">I rebuilt it because I could not find a playable copy.</p>
                    <p className="text-base">Minimal usage tracking is done with <Link className="underline" href="https://umami.is/" target="_blank" rel="noopener noreferrer">Umami</Link>.</p>
                </section>
                <section className="flex flex-col gap-2 p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                        <SquareArrowOutUpRight size={28} />
                        <h2 className="text-xl font-bold">Credits</h2>
                    </div>
                    <ul className="text-base list-disc pl-5">
                        <li>Icons from <Link className="underline" href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide</Link>.</li>
                        <li>Built with <Link className="underline" href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">Next.js</Link> and <Link className="underline" href="https://stately.ai" target="_blank" rel="noopener noreferrer">xstate</Link>.</li>
                        <li>UI from <Link className="underline" href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">Shadcn</Link>.</li>
                        <li>Hosted on <Link className="underline" href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</Link>.</li>
                    </ul>
                </section>
            </div>
        </motion.div>)}
        </AnimatePresence>
    )
}
