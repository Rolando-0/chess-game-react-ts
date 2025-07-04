import { Chess, Move} from 'chess.js';
import { SimpleMove, TranspositionTable } from './transpositionTable';
import { TranspositionEntry } from './transpositionTable';

function randomMove(chessGame: Chess): Move | null{
  if(!chessGame.isGameOver()){
    const possibleMoves = chessGame.moves({verbose: true});
    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    return randomMove;
  }
  return null;

}

let nodesVisited = 0;

const pieceValues: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

const centerSquares = new Set(['d4', 'd5', 'e4',"e5"]);

const outerCenterSquares = new Set(['c3','c4','c5','c6','d3','d6','e3','e6','f3','f4','f5','f6'])

function getPieceValue(piece: string): number {
  return pieceValues[piece] || 0;
}

function evaluateBoard(chessGame: Chess, startingColor: string) {
  
  if(chessGame.isCheckmate()){
    return (chessGame.turn() === startingColor) ? -10000 : 10000
  }

  const board = chessGame.board();
  let score = 0;



  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        const value =  pieceValues[piece.type];
        score += (piece.color === startingColor) ? value : -value;
      }
    }
  }

  return score;
}


function minimaxAB(
  chessGame: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean, 
  startingColor: string,  
  transpositionTable: TranspositionTable,
  killerMoves: Record<number,Set<string>>
): { score: number, move: SimpleMove | null } {
  
  nodesVisited++;

  if(nodesVisited % 10000 === 0){
    console.log(nodesVisited);
    console.log(transpositionTable.size())
  }
  
  const hash = chessGame.hash()

  const entry = transpositionTable.get(hash);

  if (entry && entry.depth >= depth) {
    if (entry.flag === 'FULL') return { score: entry.score, move: entry.bestMove || null };
    if (entry.flag === 'ALPHA' && entry.score <= alpha) return { score: alpha, move: null };
    if (entry.flag === 'BETA' && entry.score >= beta) return { score: beta, move: null };
  }
  
  if (depth === 0 || chessGame.isGameOver()) {
    return { score: evaluateBoard(chessGame, startingColor), move: null };
  }
  let legalMoves = chessGame.moves({ verbose: true });

  // Move ordering
  const scoredMoves = legalMoves.map(move => ({
    move,
    score: evaluateMovePriority(chessGame, move, hash, entry, killerMoves, depth)
  }));
  scoredMoves.sort((a, b) => b.score - a.score);

  let originalAlpha = alpha;
  let originalBeta = beta;

  let bestEval = isMaximizing ? -Infinity : Infinity;
  let bestMove = null;

   for (const { move } of scoredMoves) {
    chessGame.move(move);             // Move into child position

    // Recursive search on child
    const result = minimaxAB(chessGame, depth - 1, alpha, beta, !isMaximizing, startingColor, transpositionTable, killerMoves);

    chessGame.undo();                 // Backtrack to finish evaluating parent

    if (isMaximizing) {
      if (result.score > bestEval) {
        bestEval = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestEval);
    } else {
      if (result.score < bestEval) {
        bestEval = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, bestEval);
    }

    // Beta cutoff -> store killer move
    if (beta <= alpha) {
      if (!move.isCapture()) {
        storeKillerMove(killerMoves, move, depth);
      }
      break;
    }
  }

  let flag: 'FULL' | 'ALPHA' | 'BETA';
  if (bestEval <= originalAlpha) {
    flag = 'ALPHA'; // fail-low
  } else if (bestEval >= originalBeta) {
    flag = 'BETA'; // fail-high
  } else {
    flag = 'FULL'; // full evaluation
  }


  transpositionTable.set(hash, {
    score: bestEval,
    depth: depth,
    flag: flag,
    bestMove: (flag === 'FULL' && bestMove) ? { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion } : undefined
  });

  return { score: bestEval, move: bestMove };
}

function storeKillerMove(killerMoves: Record<number, Set<string>>, move: Move, depth: number) {
  if (!killerMoves[depth]) {
    killerMoves[depth] = new Set<string>();
  }

  const killers = killerMoves[depth];
  const moveStr = serializeMove(move);

  if (!killers.has(moveStr)) {
    killers.add(moveStr);

    // Enforce max 2 killer moves per depth
    if (killers.size > 2) {
      // Remove the oldest move (first inserted)
      const first = killers.values().next().value;
      if (first !== undefined) {
        killers.delete(first);
      }
    }
  }
}

function serializeMove(move: Move): string {
  return move.from + move.to + (move.promotion ?? '');
}


function searchBestMoveMinimax(chessGame: Chess, depth: number, startingColor: string) {
  let result = null;

  const transpositionTable = new TranspositionTable(250000);

  const killerMoves: Record<number, Set<string>> = {};

  const start = performance.now();

  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    result = minimaxAB(chessGame, currentDepth, -Infinity, Infinity, true,startingColor, transpositionTable,killerMoves);
  }

  
  const end = performance.now();

  console.log(`time taken by minimax: ${ end - start } ` )

  return result?.move;
}

function evaluateMovePriority(chessGame: Chess, move: Move,hash: string, ttEntry: TranspositionEntry | undefined,killerMoves: Record<number,Set<string>>,depth: number){

  if (move.san.includes('#')) {
    return 100000 - depth;
  }

  const pieceMoved = move.piece;
  const movedTo = move.to;
  const movedFrom = move.from

  
  let score = 0;

  
  const bestMove = ttEntry?.bestMove

  //transposition table move available
  if (bestMove && movedFrom === bestMove.from && movedTo === bestMove.to && move.promotion === bestMove.promotion) {
    score += 10000;
  }

  if (killerMoves[depth]?.has(serializeMove(move))) {
    score += 2000;
  } 

  if (move.san.includes('+')) {
    score += 500
  }

  if(move.isEnPassant()){
    score += 1000
  }

  if(move.isPromotion()){
    score += 5000
    score += getPieceValue(move.promotion as string) 

  }

  if(move.isKingsideCastle() || move.isQueensideCastle()){
    score += 1000
  }

  if(move.isCapture()){
    const captured = move.captured as string
    score += 2000 + ( pieceValues[captured] * 10 - pieceValues[pieceMoved] ) 
  }

  
  return score;
}




export {randomMove}
export {searchBestMoveMinimax}

