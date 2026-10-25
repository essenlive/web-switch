import Prando from 'prando';


export function removePadding(canva: number[][]){
        const trimmedCanva = structuredClone(canva)
        trimmedCanva.pop(); trimmedCanva.shift();
        trimmedCanva.forEach(row => { row.pop(); row.shift(); })
        return trimmedCanva
    }
export function addPadding(canva: number[][], value:number) {
        const paddedCanva = structuredClone(canva)
        paddedCanva.forEach(row => {
            row.push(value);
            row.unshift(value);
        })
        paddedCanva.push(Array(paddedCanva[0].length).fill(value));
        paddedCanva.unshift(Array(paddedCanva[0].length).fill(value));
        return paddedCanva
    }

export function removeRows(canva: number[][], rowsIndexes: number[]) {
        rowsIndexes = rowsIndexes.sort((a, b) => b - a);
        const newCanva = structuredClone(canva)
        rowsIndexes.forEach(rowIndex => {
            newCanva.splice(rowIndex, 1);
        })

        return newCanva
    }
export function removeRow(canva: number[][], rowIndex: number) {
        const newCanva = structuredClone(canva)
        newCanva.splice(rowIndex, 1);
        return newCanva
    }
export function removeColumns(canva: number[][], columnsIndexes: number[]) {
        columnsIndexes = columnsIndexes.sort((a, b) => b - a);
        const newCanva = structuredClone(canva)
        newCanva.forEach(row => {
            columnsIndexes.forEach(columnIndex => {
                row.splice(columnIndex, 1);
            })
        });
        return newCanva
    }
export function removeColumn(canva: number[][], columnIndex: number) {
        const newCanva = structuredClone(canva)
        newCanva.forEach(row => {
            row.splice(columnIndex, 1);
        });
        return newCanva
    }

// Add an item to the start of a specific row
export function addToRowStart(canva: number[][], rowIndex: number, newItem: number) {
        canva[rowIndex].unshift(newItem);
        const removedValue = canva[rowIndex].pop() ?? newItem  ;
        return {
            removedValue,
            canva
        };
    }

    // Add an item to the end of a specific row
export function addToRowEnd(canva: number[][], rowIndex: number, newItem: number) {
        canva[rowIndex].push(newItem);
        const removedValue = canva[rowIndex].shift() ?? newItem;
        return {
            removedValue,
            canva
        };
    }

    // Add an item to the start of a specific column
export function addToColumnStart(canva: number[][], columnIndex: number, newItem: number) {

        let itemToShift = newItem;
        canva.forEach(row => {
            // Store the item that will be shifted out
            const tempItemValue = row[columnIndex];
            row[columnIndex] = itemToShift;
            itemToShift = tempItemValue;
        });

        return {
            removedValue: itemToShift,
            canva
        };
    }

    // Add an item to the end of a specific column
export function addToColumnEnd(canva: number[][], columnIndex: number, newItem: number) {

        let itemToShift = newItem;
        canva.reverse().forEach(row => {
            // Store the item that will be shifted out
            const tempItemValue = row[columnIndex];
            row[columnIndex] = itemToShift;
            itemToShift = tempItemValue;
        });


        return {
            removedValue: itemToShift,
            canva: canva.reverse()
        };
    }
export function checkValues(canva: number[][]) {
    if (!canva || !Array.isArray(canva) || canva.length === 0) {
        throw new Error('Invalid canva: Must be a non-empty array of arrays');
    }
    const result: {
        rows: number[],
        columns: number[],
        // rowValues: number[],
        // columnValues: number[],
    } = {
        rows: [],    // Will store indices of rows with same values
        columns: [], // Will store indices of columns with same values
        // rowValues: [],    // Will store the repeated values found in rows
        // columnValues: []  // Will store the repeated values found in columns
    };

    // Check rows
    canva.forEach((row: number[], rowIndex: number) => {
        if (!Array.isArray(row)) {
            throw new Error(`Invalid row at index ${rowIndex}: Must be an array`);
        }

        if (row.length > 0) {
            const firstValue: number = row[0];
            if (row.every(value => value === firstValue)) {
                result.rows.push(rowIndex);
                // result.rowValues.push(firstValue);
            }
        }
    });

    // Check columns
    const columnCount = canva[0].length;
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const firstValue = canva[0][colIndex];
        const isAllSame = canva.every(row => row[colIndex] === firstValue);

        if (isAllSame) {
            result.columns.push(colIndex);
            // result.columnValues.push(firstValue);
        }
    }

    return {
        ...result
    };
}


// Generate random array from seed number !! This is not good code !! 
export function generateRandomMatrix(str: string, rows: number, cols: number): number[][] {
    const rng = new Prando(str);
    let randomArray: number[][] = [];
    let hasFullRowOrColumn = true;
    while (hasFullRowOrColumn) {
        randomArray = [];
        for (let i = 0; i < rows; i++) {
            const row: number[] = [];
            for (let j = 0; j < cols; j++) {
                const randomValue = Math.floor(rng.next(1, 5));
                row.push(randomValue);
            }
            randomArray.push(row);
        }

        hasFullRowOrColumn = randomArray.some(row => row.every(value => value === row[0])) ||
            randomArray[0].some((_, colIndex) => randomArray.every(row => row[colIndex] === randomArray[0][colIndex]));

    }


    return randomArray;
}

// Time challenge: every growMs(current grid) of play (clock starts at the first move) the grid gains a row, then a column, alternating.
// The interval is 1000 ms per tile of the smallest side of the current grid, plus a fixed 5000 ms (12x9 -> 14000 ms).
// Lose when a side exceeds MAX_SIDE. Changing these invalidates every shared time-challenge score.
export const GROW_BASE_MS = 5000;
export const growMs = (canva: number[][]): number => GROW_BASE_MS + 1000 * Math.min(canva.length, canva[0].length);
export const MAX_SIDE = 12;

// New line appended at the top (row) or right (column), derived from seed + growth index only,
// so a replay rebuilds the exact same grid. Never uniform, otherwise it would vanish at once.
export function growLine(seed: string, index: number, length: number): number[] {
    const rng = new Prando(`${seed}:grow:${index}`);
    let line: number[];
    do {
        line = Array.from({ length }, () => Math.floor(rng.next(1, 5)));
    } while (length > 1 && line.every(v => v === line[0]));
    return line;
}


export function matrixFromParams({s, cs, c, t}:{
  s: string,
  cs: string,
  c: string,
  t: string
}): {
  validParams: boolean, 
  error : string | null,
  input : {
    timerMode: boolean,
    seed: string,
    canva :number[][],
    url: string
  }
} {
    // Check for timermode, return false if not explicitly true
    const timerMode = t === "true" ? true : false;    
    
    // Prepare invalid params mode
    const invalidParams = {
        validParams : false,
        input : {      
            timerMode : timerMode,
            seed: "",
            canva :[
                [4,4,1,1,1,1,4,4],
                [4,1,4,4,4,4,1,4],
                [1,4,4,1,1,4,4,1],
                [1,4,4,4,4,4,4,1],
                [1,4,4,1,1,4,4,1],
                [1,4,4,1,1,4,4,1],
                [4,1,4,4,4,4,1,4],
                [4,4,1,1,1,1,4,4]
            ],
            url: ""
        }

    }

    // Return an error if canva size is missing
    if (!cs) return ({ error: "Canva size (cs) missing. ", ...invalidParams })
    // The time challenge grows the grid from the seed, an explicit canva has none
    if (timerMode && !s) return ({ error: "Time challenge needs a seed (s). ", ...invalidParams })
    // Return an error if canva data and seed are missing
    if (!c && !s) return ({ error: "Canva (c) and Seed (s) are missing, use one or the other. ", ...invalidParams })

    // Get and validate canva size.
    const canvaSize = {
      width: Number(cs.split("x")[0]),
      height: Number(cs.split("x")[1]),
    }    
    if (isNaN(canvaSize.width) || isNaN(canvaSize.height)) return ({ error: "Canva size (cs) is not correctly formatted : #Row x #Col", ...invalidParams })

        if(c){
        // Check the canva data length
        if (c.length !== canvaSize.height * canvaSize.width) return ({ error: `Canva (c = ${c.length}) data does not match Canva Size (cs = ${canvaSize.height * canvaSize.width} )`, ...invalidParams })
        // Create canva format
        const canva: number[][] = [];
        const charArray: number[] = Array.from(c).map((el) => Number(el));
        for (let i = 0; i < charArray.length; i += canvaSize.width) {
          canva.push(charArray.slice(i, i + canvaSize.width));
        }    
        // Check the canva data 
        if (!canva.every(row => row.every(elem => [1, 2, 3, 4].includes(elem)))) return ({ error: `Canva (c) data does not contain correct data ([1,2,3,4])`, ...invalidParams })
        // Reformat url
            const url = `?c=${canva.map((row) => row.join('')).join('')}&cs=${canvaSize.width}x${canvaSize.height}`
        return {
            validParams: true,
            error: null,
            input: {
                timerMode,
                seed: "",
                canva,
                url
            }
        }
    }
    // Create custom canva from seed
    else if(s){
        const canva = generateRandomMatrix(s, canvaSize.height, canvaSize.width);
        // Reformat url
        // t is part of the identity: same seed, different rules, different leaderboard
        const url = `?s=${s}&cs=${canvaSize.width}x${canvaSize.height}${timerMode ? "&t=true" : ""}`
        return {
            validParams: true,
            error: null,
            input: {
                timerMode,
                seed: s,
                canva,
                url
            }
        }
    }
    return ({ error: `Problem with data url`, ...invalidParams })
}

export function getMatrixString( canva:number[][] ) : string{
    const VALUE_MAP = ['🟥','🟦','🟩','🟨']
    const clonedCanva = structuredClone(canva)
    return clonedCanva.reverse().map(row => row.map(value => VALUE_MAP[value - 1]).join(' ')).join('\n');
}