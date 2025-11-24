import { cn } from "@/lib/utils"
import { Move, BookText, MessageCircleQuestion, SquareArrowOutUpRight, CircleX } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"

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
    
    return (
<AnimatePresence>
  {visible && (
            <motion.div 
                    key="helpScreen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "linear" }}
            className={cn("absolute z-10 top-0 left-0 !my-0 h-full w-full space-y-4 bg-gray-100 dark:bg-gray-900", className)} {...props}>   
            <div className={"p-4 flex flex-col items-stretch justify-stretch min-h-dvh max-w-xl mx-auto space-y-4"}>   
                <div className="flex-grow flex flex-col p-8 bg-background rounded-lg">
                    <div className="py-4">
                        <MessageCircleQuestion size={32} />
                    </div>
                <h2 className="text-xl font-bold my-4">
                    About
                </h2>
                <p className="text-xl mt-2">
                    This mini game is inspired from memory of the game Russpack that I used to play on the Archos Gmini400 media player. All the credits goes to the original creator of the game.
                            </p>
                            <p className="text-xl mt-2">
                                I rebuilt it because I could not find a playable instance.
                            </p>
                            <p className="text-xl mt-2">
                                Minimalist usage tracking is done with <Link className="underline" href="https://umami.is/" target="_blank" rel="noopener noreferrer">Umami</Link>.
                            </p>
                </div>
                <div className="flex-grow flex flex-col p-8 bg-background rounded-lg">
                    <div className="py-4">

                        <BookText size={32} />
                    </div>
                    <h2 className="text-xl font-bold my-4">
                        Rules
                    </h2>
                    <p className="text-xl mt-2">
                        Move your cursor to switch the lines, try to align the same colors on the same column or line to make it disappear.
                    </p>
                    <p className="text-xl mt-2">
                        Once you the grid is only one square wide in any direction, you have won !
                    </p>
                    <p className="text-xl mt-2">
                        Try to make the best score by solving the grid in the least amount of moves.
                    </p>
                </div>
                <div className="flex-grow flex flex-col p-8 bg-background rounded-lg">
                    <div className="py-4">

                        <Move size={32} />
                    </div>
                    <h2 className="text-xl font-bold my-4">
                        Controls
                    </h2>
                    <p className="text-xl mt-2">
                        Either swipe or use the arrows to move the cursor in the right direction.
                    </p>
                    <p className="text-xl mt-2">
                        Use a long swipe to go faster.
                    </p>
                    <p className="text-xl mt-2">
                        Press space or restart button to restart the game.
                    </p>
                </div>
                <div className="flex-grow flex flex-col p-8 bg-background rounded-lg">
                    <div className="py-4">

                        <SquareArrowOutUpRight size={32} />
                    </div>
                    <h2 className="text-xl font-bold my-4">
                        Credits
                    </h2>
                    <ol className="text-xl mt-2">
                                <li>Icons are from <Link className="underline" href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide.dev</Link>.</li>
                                <li>The app is built with <Link className="underline" href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">Next.js</Link>.</li>
                                <li>The app is hosted on <Link className="underline" href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</Link>.</li>
                                <li><Link className="underline" href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">Shadcn</Link> is used for the UI.</li>
                        <li><Link className="underline" href="https://stately.ai" target="_blank" rel="noopener noreferrer">xstate</Link>.</li>
                    </ol>
                </div>
            </div>
    
                <motion.div whileHover={{ scale: 1.1 }} onClick={closeHelp}  className="fixed z-10 p-4 top-0 right-4 cursor-pointer">
                    <CircleX size={32} />
                </motion.div>
        </motion.div>)}
        </AnimatePresence>
    )
}