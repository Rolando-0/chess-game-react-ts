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

const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const centerSquares = new Set(['d4', 'd5', 'e4',"e5"]);

const outerCenterSquares = new Set(['c3','c4','c5','c6','d3','d6','e3','e6','f3','f4','f5','f6'])

function getPieceValue(piece: string): number {
  return pieceValues[piece] || 0;
}

function evaluateBoard(chessGame: Chess, startingColor: string) {
  
  const board = chessGame.board();
  const turn = chessGame.turn();

  let score = 0;

  if(chessGame.isCheckmate()){
    score += (turn !== startingColor) ? 100 : -100
  }

  if(chessGame.isCheck()){
    score += (turn !== startingColor) ? 1 : -1
  }

  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        const value = getPieceValue(piece.type)
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

  legalMoves.sort((a, b) => evaluateMovePriority(chessGame,b,transpositionTable) - evaluateMovePriority(chessGame,a,transpositionTable));

  let originalAlpha = alpha;
  let originalBeta = beta;

  let bestEval = isMaximizing ? -Infinity : Infinity;
  let bestMove = null;

  if (isMaximizing) {
    
    for (const move of legalMoves) {
      chessGame.move(move);
      const boardEval = minimaxAB(chessGame, depth - 1, alpha, beta, false, startingColor, transpositionTable);
      chessGame.undo();

      if(boardEval > bestEval){
        bestMove = move
      }

      bestEval = Math.max(bestEval, boardEval);
      alpha = Math.max(alpha, boardEval);

      if (beta <= alpha) break; 
    }
    
  } else {
    
    for (const move of legalMoves) {
      chessGame.move(move);
      const boardEval = minimaxAB(chessGame, depth - 1, alpha, beta, true, startingColor, transpositionTable);
      chessGame.undo();

      if(boardEval < bestEval){
        bestMove = move
      }

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
    flag: flag,
    bestMove: (flag === 'FULL' && bestMove) ? { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion } : undefined
  });

  return bestEval
}



function searchBestMoveMinimax(chessGame: Chess, depth: number, startingColor: string) {
  let bestMove = null;
  let bestEval = -Infinity;

  const transpositionTable = new TranspositionTable(500000);

  const legalMoves = chessGame.moves({verbose: true})

  legalMoves.sort((a, b) => evaluateMovePriority(chessGame,b,transpositionTable) - evaluateMovePriority(chessGame,a,transpositionTable));

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

function evaluateMovePriority(chessGame: Chess, move: Move, transpositionTable: TranspositionTable){

  const turnNumber = chessGame.history().length;
  const pieceMoved = move.piece;
  const movedTo = move.to;
  
  const ttEntry = transpositionTable.get(chessGame.hash()); // transposition table entry

  const ttBestMove = ttEntry?.bestMove;

  const earlyGame = turnNumber <= 15;

  let score = 0;

  if (ttBestMove && move.from === ttBestMove.from && movedTo === ttBestMove.to && move.promotion === ttBestMove.promotion) {
    score += 200; // best move from transposition table (if available) gets priority
    
    console.log("tt move found")

  }

  chessGame.move(move);

  if (chessGame.isCheckmate()) {
    chessGame.undo()
    return 10000;
  } else if (chessGame.isCheck()) {
    score += 15
  }

  chessGame.undo()

  if(move.isBigPawn()){
    score += 10
  }

  if(move.isEnPassant()){
    score += 25
  }

  if(move.isPromotion()){
    score += 100
    score += getPieceValue(move.promotion as string) 

  }

  if(move.isKingsideCastle() || move.isQueensideCastle()){
    score += 20
  }

  if(move.isCapture()){
    const captured = move.captured as string
    score += ( getPieceValue(captured) * 10 - getPieceValue(pieceMoved) ) 
  }

  if(earlyGame){

    if(centerSquares.has(movedTo)){
    score += 10
    }
    else if(outerCenterSquares.has(movedTo)){
    score += 5
    }

    if(pieceMoved === 'n' || pieceMoved === 'b'){
      score += 10
    }
    if(pieceMoved === 'q'){
      score += 5
    }

  }


  return score;
}




export {randomMove}
export {searchBestMoveMinimax}

