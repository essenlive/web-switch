import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Share2, CircleArrowRight } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { AnimatePresence, m } from "motion/react"
import { getMatrixString } from "@/lib/matrixHelpers"
import { ScopedLeaderboard } from "@/components/leaderboard"

export function EndScreen({
    className,
    visible,
    score,
    highscore: bestRank,
    url,
    restart,
    initialCanva,
    lost = false,
    area = 0,
    ...props
}) {
    // The stored best is a rank: >= 1000 is a lost game, so there is no winning score to compare with
    const highscore = bestRank !== null && bestRank < 1000 ? bestRank : null
    const { toast } = useToast()
    const copyToClipboard = (options? : undefined | 'withCanva') => {
        let clipboardContent: string = ''
        if(lost){
            clipboardContent = `🌱 This switch time challenge outgrew me after ${score} moves, down to ${area} tiles.\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`
        }
        else if(options === 'withCanva'){
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves. \n${getMatrixString(initialCanva)}\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`

        }
        else{
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves.\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`
        }
        navigator.clipboard.writeText(clipboardContent)

        toast({
            title: "Copied to clipboard",
            description: "You can now share your score with your friends",
            duration: 5000
    })}


    const best = highscore === null ? score : Math.min(score, highscore)
    const headline = lost ? `You got it down to ${area} tiles.` : highscore === null
        ? "First score on the board."
        : score < highscore ? `New best, ${highscore - score} fewer than before.`
        : score === highscore ? "You matched your best."
        : `Best is ${highscore}. ${score - highscore} to beat.`

    return (
        <AnimatePresence>

        { visible && (
        <m.div 
            key="endScreen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, position: "absolute" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn("flex flex-col gap-2", className)} {...props}>

            <div className="flex flex-col p-4 bg-background rounded-lg gap-3">
                <div>
                    <p className="text-sm text-muted-foreground">{lost ? "outgrown after" : "solved in"}</p>
                    <p className="text-6xl font-extrabold leading-none tracking-tight">
                        {score} <span className="text-2xl font-bold text-muted-foreground">moves</span>
                    </p>
                </div>
                <p className="text-xl">{headline}</p>
                <div className="flex gap-2">
                    <Button className="text-base grow" onClick={() => copyToClipboard()}>
                        <Share2 /> Share {best === score ? "result" : "best"}
                    </Button>
                </div>
            </div>

            <ScopedLeaderboard url={url} />

            <Button className="h-14 justify-between text-xl font-bold" onClick={restart}>
                Play again
                <CircleArrowRight />
            </Button>
        </m.div>)}
        </AnimatePresence>
    )
}
