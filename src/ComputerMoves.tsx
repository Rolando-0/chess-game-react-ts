import { Chess, Move} from 'chess.js';
import { TranspositionTable } from './transpositionTable';
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

function getPieceValue(piece: string): number {
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return pieceValues[piece] || 0;
}

function evaluateBoard(chessGame: Chess, startingColor: string) {
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const board = chessGame.board();
  let score = 0;

  if(chessGame.isCheckmate()){
    score += (chessGame.turn() !== startingColor) ? 100 : -100
  }

  if(chessGame.isCheck()){
    score += (chessGame.turn() !== startingColor) ? 2 : -2
  }

  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        const value = pieceValues[piece.type];
        score += (piece.color === startingColor) ? value : -value;
      }
    }
  }

  return score;
}

function minimaxAB(chessGame: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean, startingColor: string,  transpositionTable: TranspositionTable) {
  
  nodesVisited++;

  if(nodesVisited % 10000 === 0){
    console.log(nodesVisited);
  }
  
  const hashedPosition = chessGame.hash()

  const entry = transpositionTable.get(hashedPosition);

  if (entry && entry.depth >= depth) {
    if (entry.flag === 'FULL') return entry.score;
    if (entry.flag === 'ALPHA' && entry.score <= alpha) return alpha;
    if (entry.flag === 'BETA' && entry.score >= beta) return beta;
  }
  
  if (depth === 0 || chessGame.isGameOver()) {
    return evaluateBoard(chessGame, startingColor);
  }

  const legalMoves = chessGame.moves({verbose: true})

  legalMoves.sort((a, b) => evaluateMovePriority(chessGame,b) - evaluateMovePriority(chessGame,a));

  let originalAlpha = alpha;
  let originalBeta = beta;

  let bestEval = isMaximizing ? -Infinity : Infinity;

  if (isMaximizing) {
    
    for (const move of legalMoves) {
      chessGame.move(move);
      const boardEval = minimaxAB(chessGame, depth - 1, alpha, beta, false, startingColor, transpositionTable);
      chessGame.undo();

      bestEval = Math.max(bestEval, boardEval);
      alpha = Math.max(alpha, boardEval);

      if (beta <= alpha) break; 
    }
    
  } else {
    
    for (const move of legalMoves) {
      chessGame.move(move);
      const boardEval = minimaxAB(chessGame, depth - 1, alpha, beta, true, startingColor, transpositionTable);
      chessGame.undo();

      bestEval = Math.min(bestEval, boardEval);
      beta = Math.min(beta, boardEval);

      if (beta <= alpha) break; 
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


  transpositionTable.set(hashedPosition, {
    score: bestEval,
    depth: depth,
    flag: flag
  });

  return bestEval
}



function searchBestMoveMinimax(chessGame: Chess, depth: number, startingColor: string) {
  let bestMove = null;
  let bestEval = -Infinity;

  const transpositionTable = new TranspositionTable(200000);

  const legalMoves = chessGame.moves({verbose: true})

  legalMoves.sort((a, b) => evaluateMovePriority(chessGame,b) - evaluateMovePriority(chessGame,a));

  const start = performance.now();

  for (const move of legalMoves) {
    chessGame.move(move);
    const boardEval = minimaxAB(chessGame, depth - 1, -Infinity, Infinity, false,startingColor, transpositionTable);
    chessGame.undo();

    if (boardEval > bestEval) {
      bestEval = boardEval;
      bestMove = move;
    }
  }

  const end = performance.now();

  console.log(`time taken by minimax: ${ end - start } ` )

  return bestMove;
}

function evaluateMovePriority(chessGame: Chess, move: Move){

  const turnNumber = chessGame.history().length;

  const isEarlyGame = turnNumber <= 15;

  const centerSquares = new Set(['d4', 'd5', 'e4',"e5"]);

  const outerCenterSquares = new Set(['c3','c4','c5','c6','d3','d6','e3','e6','f3','f4','f5','f6'])
  
  let score = 0;

  if(move.san.includes('#')){
    return 10000;
  }

  if(move.san.includes('+')){
    score+= 30;
  }

  if(move.isBigPawn()){
    score += 10
  }

  if(move.isEnPassant()){
    score += 25
  }

  if(move.isPromotion()){
    score += 150
  }

  if(move.isKingsideCastle() || move.isQueensideCastle()){
    score += 20
  }

  if(move.isCapture()){
    const captured = move.captured as string
    score += ( getPieceValue(captured) * 10 - getPieceValue(move.piece) ) 
  }

  if(centerSquares.has(move.to)){
    score += 10
  }
  else if(outerCenterSquares.has(move.to)){
    score += 5
  }

  return score;
}



export {randomMove}
export {searchBestMoveMinimax}

