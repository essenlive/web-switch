import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Share2, TextQuote, CircleArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence} from "motion/react"
import { getMatrixString } from "@/lib/matrixHelpers"
import { type Direction } from "@/lib/switchMachine";
import { useState } from "react"
import { Leaderboard } from "@/components/leaderboard"
import { useCommunity } from "@/hooks/useCommunity"
import { friendLink } from "@/lib/links"

function getInputListIcons(inputList: Direction[]):string{
    const DIRECTION_ARROWS = new Map(Object.entries({
        'up': "⬆️",
        'right': "➡️",
        'down': "⬇️",
        'left': '⬅️',
    }))
    return inputList.map(input=>DIRECTION_ARROWS.get(input)).join(' ')

}
export function EndScreen({
    className,
    visible,
    score,
    inputsList,
    highscore: bestRank,
    highscoreInputs,
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
    const { friendCode } = useCommunity()
    const [withFriendLink, setWithFriendLink] = useState(false)
    const copyToClipboard = (options? : undefined | 'withCanva' | 'withInputs') => {
        let clipboardContent: string = ''
        if(lost){
            clipboardContent = `🌱 This switch time challenge outgrew me after ${score} moves, down to ${area} tiles.\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`
        }
        else if(options === 'withCanva'){
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves. \n${getMatrixString(initialCanva)}\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`

        }
        else if(options === 'withInputs'){
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves. \nHere is my solution : ${highscore !== null && highscore < score ? getInputListIcons(highscoreInputs) : getInputListIcons(inputsList)}\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`

        }
        else{
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves.\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`
        }
        if (withFriendLink && friendCode) clipboardContent += `\nAdd me : ${friendLink(friendCode)}`
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
        <motion.div 
            key="endScreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, position: "absolute" }}
            transition={{ duration: 0.1, ease: "linear" }}
            className={cn("flex flex-col gap-4", className)} {...props}>

            <div className="flex flex-col p-4 bg-background rounded-lg gap-4">
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
                    <Button variant="secondary" aria-label="Share with my moves" title="Share with my moves" onClick={() => copyToClipboard("withInputs")}>
                        <TextQuote />
                    </Button>
                </div>
                {friendCode && (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={withFriendLink} onChange={e => setWithFriendLink(e.target.checked)} />
                        Add my friend link when sharing
                    </label>
                )}
            </div>

            <Leaderboard url={url} />

            <Button className="h-14 justify-between text-xl font-bold" onClick={restart}>
                Play again
                <CircleArrowRight />
            </Button>
        </motion.div>)}
        </AnimatePresence>
    )
}
