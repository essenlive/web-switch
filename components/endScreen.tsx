import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Share2, TextQuote, CircleArrowRight, PartyPopper, Trophy, Medal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence} from "motion/react"
import { getMatrixString } from "@/lib/matrixHelpers"
import { type Direction } from "@/lib/switchMachine";

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
    highscore,
    highscoreInputs,
    url,
    restart,
    initialCanva,
    ...props
}) {
    const { toast } = useToast()
    const copyToClipboard = (options? : undefined | 'withCanva' | 'withInputs') => {
        let clipboardContent: string = ''
        if(options === 'withCanva'){
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves. \n${getMatrixString(initialCanva)}\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`

        }
        else if(options === 'withInputs'){
            clipboardContent = `🎊 I solved this switch grid in ${highscore !== null && highscore < score ? highscore : score} moves. \nHere is my solution : ${highscore !== null && highscore < score ? getInputListIcons(highscoreInputs) : getInputListIcons(inputsList)}\nTry yourself !\nhttps://switch.essenlive.xyz/g${url}`

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


    return (
        <AnimatePresence>

        { visible && (
        <motion.div 
            key="endScreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, position: "absolute" }}
            transition={{ duration: 0.1, ease: "linear" }}
            className={cn("flex-grow flex flex-col gap-4", className)} {...props}>

    
            <div className={cn("flex-grow relative flex flex-col p-4 bg-background rounded-lg", className)}>
                <div className="absolute z-10 top-4 right-4 flex gap-2 ">

                <motion.div whileHover={{ scale: 1.1 }} onClick={()=> copyToClipboard()} className="">
                    <Button className="text-xl" >
                        <Share2 /> Share best
                    </Button>
                </motion.div>    
                <motion.div whileHover={{ scale: 1.1 }} onClick={()=> copyToClipboard("withInputs")} className="">
                    <Button className="text-md" >
                        <TextQuote/>
                    </Button>
                </motion.div>           
                </div>
            {highscore === null ? (
                <>
                    <div className="py-4">
                        <Medal size={32} />
                    </div>
                    <h2 className="text-2xl font-bold ">
                        Easy first !
                    </h2>
                    <p className="flex-grow text-xl my-4">
                        You solved the grid in <span className="font-bold">{score}</span> moves, that makes it the first score to beat.
                    </p>
                </>
        ) : (<>

            {score <= highscore ? (
                <>
                    <div className="py-4">
                        <Trophy size={32} />
                    </div>
                    <h2 className="text-2xl font-bold ">
                        New highscore !
                    </h2>
                    <p className="flex-grow text-xl my-4">
                                You solved the grid in <span className="font-bold">{score}</span> moves. It is <span className="font-bold">{Math.abs(score - highscore)}</span> moves less than the previous best.
                    </p>
                </>
            ) : (
                <>
                    <div className="py-4">
                        <PartyPopper size={32} />
                    </div>
                    <h2 className="text-2xl font-bold ">
                        Good Job !
                    </h2>
                    <p className="flex-grow text-xl my-4">
                        You solved the grid in <span className="font-bold">{score}</span> moves. Now try to beat the highscore of <span className="font-bold">{highscore}</span> moves.
                    </p>
            </>
        )}

        </>)}
        </div>

            <motion.div whileHover={{ scale: 1.05 }} onClick={restart} className="flex justify-between items-center p-4 bg-background rounded-lg cursor-pointer">
            <span className="font-bold text-xl">
                Play again
            </span>
            <CircleArrowRight />
        </motion.div>
    </motion.div>)}
    </AnimatePresence>

    )
}