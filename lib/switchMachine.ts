import { setup, assign, raise } from "xstate";
import { 
    checkValues,
    removeColumn, 
    removeRow, 
    addToColumnEnd, 
    addToColumnStart, 
    addToRowEnd, 
    addToRowStart,
    growLine,
    growMs,
    MAX_SIDE
} from "@/lib/matrixHelpers"

export type Direction = "up" | "left" | "down" | "right";
type Input = {
    canva: number[][],
    timerMode: boolean,
    seed: string,
    url: string
}

const switchMachine = setup({
    types: {
        context: {} as {
            inputList : Direction[]
            score: number;
            cursor: {
                x: number,
                y: number,
                value: number
            };
            canva: number[][];
            canvaIndexes : {
                rows : number[],
                columns: number[]
            };
            initialCanva: number[][];
            url : string;
            // Time challenge only
            timerMode: boolean;
            seed: string;
            grown: number;   // growth steps applied so far
            minArea: number; // smallest grid area reached, ranks a lost game
            times: number[]; // ms since the first move, one per accepted move
            clockBase: number; // ms at which the current growth countdown started (reset when a line is removed)
            lastAt: number;  // ms of the latest move
            endAt: number;   // ms at which the last growth step happened (when the game is lost: the loss)
        },
        input: {} as Input,
        output: {} as { score : number },
        events: {} as
            | 
            { 
                type: "input_move"
                params: { direction: Direction, at?: number }
            }
            |
            {
                type: "tick"
                params: { at: number }
            }
            |
            {
                type: "restart_game"
                params: { input: Input | null}
            }
    },
    actions: {
        move_cursor: assign({
            cursor: ({ context }, params: { direction: Direction }) => {
                
                const clonedContext = structuredClone( context );
                switch (params.direction) {
                    case "up":
                        clonedContext.cursor.y++;
                        break;
                    case "down":
                        clonedContext.cursor.y--;
                        break;
                    case "left":
                        clonedContext.cursor.x--;
                        break;
                    case "right":
                        clonedContext.cursor.x++;
                        break;
                    default:
                        break;
                }
                return clonedContext.cursor;
            },
        }),
        shift_canva: assign(({ context }, params: { direction: Direction }) => {
            const clonedContext = structuredClone(context);
            let newData : {
                removedValue: number,
                canva: number[][]
            } = {
                removedValue: clonedContext.cursor.value,
                canva: clonedContext.canva
            };
            switch (params.direction) {
                case "down":
                    newData = addToColumnEnd(
                        clonedContext.canva,
                        clonedContext.cursor.x - 1,
                        clonedContext.cursor.value,
                    );
                    clonedContext.cursor.y = 0;
                    break;
                case "up":
                    newData = addToColumnStart(
                        clonedContext.canva,
                        clonedContext.cursor.x - 1,
                        clonedContext.cursor.value,
                    );
                    clonedContext.cursor.y = clonedContext.canva.length + 1;
                    break;
                case "left":
                    newData = addToRowEnd(
                        clonedContext.canva,
                        clonedContext.cursor.y - 1,
                        clonedContext.cursor.value,
                    );
                    clonedContext.cursor.x = 0;
                    break;
                case "right":
                    newData = addToRowStart(
                        clonedContext.canva,
                        clonedContext.cursor.y - 1,
                        clonedContext.cursor.value,
                    );
                    clonedContext.cursor.x = clonedContext.canva[0].length + 1;
                    break;
            }
            clonedContext.canva = newData.canva;
            clonedContext.cursor.value = newData.removedValue;
            return clonedContext;
        }),
        increment_score: assign(({ context }, params: { direction: Direction, at?: number }) => {
            const clonedContext = structuredClone(context);
            clonedContext.inputList.push(params.direction)
            if (clonedContext.timerMode) clonedContext.times.push(params.at ?? 0)
            clonedContext.lastAt = params.at ?? 0;
            clonedContext.score = clonedContext.score + 1;
            return clonedContext;
        }),
        set_game: assign(({ context }, params: { input: Input | null }) => {
            const clonedContext = structuredClone(context);
            clonedContext.score = 0;
            clonedContext.cursor = { x: 0, y: 0, value: 1 }
            clonedContext.inputList = [];
            clonedContext.grown = 0;
            clonedContext.times = [];
            clonedContext.endAt = 0;
            clonedContext.clockBase = 0;
            clonedContext.lastAt = 0;
            if(params.input) {
                clonedContext.url = params.input.url;
                clonedContext.timerMode = params.input.timerMode;
                clonedContext.seed = params.input.seed;
                clonedContext.canva = structuredClone(params.input.canva);
                clonedContext.initialCanva = structuredClone(params.input.canva);
                clonedContext.canvaIndexes.rows = Array.from({ length: params.input.canva.length }, (_, i) => i);
                clonedContext.canvaIndexes.columns = Array.from({ length: params.input.canva[0].length }, (_, i) => i);
            }
            else{
                clonedContext.canva = structuredClone(clonedContext.initialCanva);
                clonedContext.canvaIndexes.rows = Array.from({ length: clonedContext.initialCanva.length }, (_, i) => i);
                clonedContext.canvaIndexes.columns = Array.from({ length: clonedContext.initialCanva[0].length }, (_, i) => i);
            }
            clonedContext.minArea = clonedContext.canva.length * clonedContext.canva[0].length;

            return clonedContext;
        }),
        // One growth step: a new row on top, then a new column on the right, alternating.
        // Steps are applied one at a time (evaluated in between) so a live game and its replay take the same path.
        grow_canva: assign(({ context }, params: { at: number }) => {
            const clonedContext = structuredClone(context);
            clonedContext.endAt = params.at;
            const { canva, canvaIndexes, cursor } = clonedContext;
            const line = growLine(clonedContext.seed, clonedContext.grown, clonedContext.grown % 2 === 0 ? canva[0].length : canva.length);
            if (clonedContext.grown % 2 === 0) {
                canva.push(line);
                canvaIndexes.rows.push(Math.max(-1, ...canvaIndexes.rows) + 1);
                if (cursor.y === canva.length) cursor.y++; // cursor was on the top border, follow it
            } else {
                canva.forEach((row, i) => row.push(line[i]));
                canvaIndexes.columns.push(Math.max(-1, ...canvaIndexes.columns) + 1);
                if (cursor.x === canva[0].length) cursor.x++; // cursor was on the right border
            }
            clonedContext.grown++;
            clonedContext.clockBase += growMs(clonedContext.initialCanva); // next step is due one interval later
            return clonedContext;
        }),
        track_area: assign({
            minArea: ({ context }) => Math.min(context.minArea, context.canva.length * context.canva[0].length),
        }),
        resize_canva: assign(({ context }) => {
            const clonedContext = structuredClone(context);
            const { rows, columns } = checkValues(clonedContext.canva);
            // A removed line restarts the growth countdown
            if (rows.length > 0 || columns.length > 0) clonedContext.clockBase = Math.max(clonedContext.clockBase, clonedContext.lastAt);
            if (rows.length > 0) {
                clonedContext.canva = removeRow(
                    clonedContext.canva,
                    rows[0],
                );
                clonedContext.canvaIndexes.rows.splice(rows[0], 1);
                clonedContext.cursor.y =
                clonedContext.cursor.y === 0 ? 0 : clonedContext.cursor.y - 1;
            } else if (columns.length > 0) {
                clonedContext.canva = removeColumn(
                    clonedContext.canva,
                    columns[0],
                );
                clonedContext.canvaIndexes.columns.splice(columns[0], 1);
                clonedContext.cursor.x =
                clonedContext.cursor.x === 0 ? 0 : clonedContext.cursor.x - 1;
            }
            return clonedContext;
        }),
    },
    guards: {
        is_invalid_move: ({ context }, params: { direction: "up" | "left" | "down" | "right" }) => {
            // Check for invalid movements
            if (
                (context.cursor.y <= 0 && params.direction === "down") ||
                (context.cursor.y >= context.canva.length + 1 && params.direction === "up") ||
                (context.cursor.x <= 0 && params.direction === "left") ||
                (context.cursor.x >= context.canva[0].length + 1 && params.direction === "right")
            ) {
                return true;
            }
            return false;
        },
        is_cursor_move: ({ context }, params: { direction: "up" | "left" | "down" | "right" }) => {
            // Check for simple movements
            if (
                ((context.cursor.y === 0 || context.cursor.y === context.canva.length + 1) && (params.direction === "left" || params.direction === "right")) ||
                ((context.cursor.x === 0 || context.cursor.x === context.canva[0].length + 1) && (params.direction === "up" || params.direction === "down"))
            ) {
                return true;
            }
            return false;
        },
        is_win_condition: ({ context }) => {
            if (context.canva.length <= 1 || context.canva[0].length <= 1) {
                return true;
            }
            return false;
        },
        // Time challenge: a full interval has passed since the countdown started
        is_growth_due: ({ context }, params: { at?: number }) =>
            context.timerMode && params.at !== undefined && params.at - context.clockBase >= growMs(context.initialCanva),
        is_overgrown: ({ context }) => context.canva.length > MAX_SIDE || context.canva[0].length > MAX_SIDE,
        is_full_line: ({ context }) => {
            const { rows, columns } = checkValues(context.canva);
            if (rows.length > 0 || columns.length > 0) {
                return true;
            }
            return false;
        },
    },
}).createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5SwO4EsAuBjAFgYgCc4MBDAjAfShIFswBtABgF1FQAHAe1kzU4Ds2IAB6IALACYANCACeiCWICcAOgDMEiQA4xAViUBGXQDZjhiQF8LM1JlwqA4rTAUAymAwBXdniaskIFw8GHyCAaIIaroSKsYA7AZKumIGjNEGCWIy8ggSUSpKEkrGjHFxagnGklY26Ng4js4UAJIQADZgeGj87J6UNJwAbgwsQkG8AkIRKTFR2loZxgZaJkrZiKZi6gbGaiVxEqVmWjUgtvWNdC3tnd29-UMMBv4c3BNhoBHlcSq6B2KmNRaOIrLTSOQbHQFLRaYoSEwGNSMYqnc72JxXVodLo9PoUAbDegSF6BN4hSbhRAGAyKWL6VIMsRxRhadYIJYxJSMAwArkSIxKDSouroppYzpEWCkch+MZk0JTRBArQqIpmRJAzS7NnLXQqSTFJG6LRqJQLE7WM4ihoYlwAYRI-EGJAoAFFnW1PCRyfxfKMAuMfYqEIjSnSqro9koDsU4myJFVwxrdIxtGJSsK7Damg6nS73SRPd7Qr5nnLggrKQhisYVGUossTYY4kydWUVMDDkolGI9ozdJmLraKLnnW6PV6fb5ieX3sG4roDCpGCkTWk1GoxLCDPGWfqN8aSmCzFEB6d+JwIHAhGicLOg1WALTGNlc9QHZFlGmaVOD0VXdwvHYe9K0+BRuV+PItwODI4mMRR42UDtNBNEx4JSBI-2zTEbhAikwPZLdfkYYw-iSFlYQSNljTUOtTXglYQS0Mwz1qLNLntR0xwLIsH1eCt8JEKkSKXLRGBXZY1GWOJozjCEEDEJD4SZaNdEjaIKiwji3X4CA8I+ISQ1XFQMiMGlyhYio2RSLZ0x5ZZ4L+NI0isKwgA */
    context: ({ input }) =>({
        inputList: [],
        score :  0,
        cursor: {
            x: 0,
            y: 0,
            value: 1
        },
        url : input.url,
        timerMode: input.timerMode,
        seed: input.seed,
        grown: 0,
        times: [],
        endAt: 0,
        clockBase: 0,
        lastAt: 0,
        minArea: input.canva.length * input.canva[0].length,
        canva: input.canva,
        initialCanva: structuredClone(input.canva),
        canvaIndexes: {
            rows: Array.from({ length: input.canva.length }, (_, i) => i),
            columns: Array.from({ length: input.canva[0].length }, (_, i) => i),
        }
    }),
    id: "switch", 
    initial: "Game_Idle",
    on: {
        restart_game: {
            target: "#switch.Game_Idle",
            actions: {
                type: "set_game",
                params: ({ event }) => ({ input: event.params.input })
            },
        },
    },
    states: {
        "Game_Idle": {
            on: {
                tick: [
                    {
                        target: "Game_Canva_Evaluation",
                        guard: { type: "is_growth_due", params: ({ event }) => ({ at: event.params.at }) },
                        actions: [
                            { type: "grow_canva", params: ({ event }) => ({ at: event.params.at ?? 0 }) },
                            raise(({ event }) => event), // play the event again: more growth may be due, or the move itself
                        ],
                    },
                ],
                input_move: [
                    // The clock comes first: grow, evaluate, then play the same move on the grown grid
                    {
                        target: "Game_Canva_Evaluation",
                        guard: { type: "is_growth_due", params: ({ event }) => ({ at: event.params.at }) },
                        actions: [
                            { type: "grow_canva", params: ({ event }) => ({ at: event.params.at ?? 0 }) },
                            raise(({ event }) => event), // play the event again: more growth may be due, or the move itself
                        ],
                    },
                    {
                        target: "Game_Idle",
                        guard: { 
                            type: "is_invalid_move",
                            params: ({ event }) => ({ direction: event.params.direction })
                        },
                    },
                    {
                        target: "Game_Canva_Evaluation",
                        actions: [
                            {
                                type: 'move_cursor',
                                params: ({ event }) => ({ direction: event.params.direction })

                            },
                            { 
                                type: "increment_score",
                                params: ({ event }) => ({ direction: event.params.direction, at: event.params.at })
                            },
                        ],
                        guard: {
                            type: "is_cursor_move",
                            params: ({ event }) => ({ direction: event.params.direction })

                        },
                    },
                    {
                        target: "Game_Canva_Evaluation",
                        actions: [
                            { 
                                type: "shift_canva",
                                params: ({ event }) => ({ direction: event.params.direction })
                            },
                            { 
                                type: "increment_score",
                                params: ({ event }) => ({ direction: event.params.direction, at: event.params.at })
                             }
                        ],
                    },
                ],
            },
        },

        "Game_Canva_Evaluation": {
            entry: "track_area",
            always: [
                {
                    target: "Game_End",
                    guard: {
                        type: "is_win_condition",
                    },
                },
                {
                    target: "Game_Over",
                    guard: {
                        type: "is_overgrown",
                    },
                },
                {
                    target: "Game_Canva_Evaluation",
                    actions: {
                        type: "resize_canva",
                    },
                    guard: {
                        type: "is_full_line",
                    },
                    reenter: true,
                },
                {
                    target: "Game_Idle",
                },
            ],
        },

        "Game_End": {},

        // Time challenge only: the grid outgrew the limit
        "Game_Over": {},

    },

});


export default switchMachine