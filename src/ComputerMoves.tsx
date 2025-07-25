import { Chess, Move, Piece, Square} from 'chess.js';
import { SimpleMove, TranspositionTable } from './transpositionTable';
import { TranspositionEntry } from './transpositionTable';
import { getPSTValue } from './pieceSquareTables';
import { evaluateBoard, pieceValues} from './evaluation';

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
  return pieceValues[piece] || 0;
}

type KillerMoves = Map<number, Move[]>;


/**
 * 
 * @param chessGame - the chess instance holding the state of the chess game
 * @param depth - the current depth in the search e.g. if depth == 0 then we have reached a leaf node in the search
 * @param alpha - the best score the maximizing side can guarantee
 * @param beta - the best score the minimizing side can guarantee
 * @param startingColor - the color of the maximizer 'w' or 'b'
 * @param transpositionTable - a table which tells us if the result has already been seen earlier in the search
 * @param killerMoves - a table of moves that are non-captures which cause an alpha-beta cutoff at a specific depth
 * @param searchDepth - the starting depth of the search e.g. a value of '6' means 6 moves deep in total
 * @param inNullMove - tells us if we are in the null-move pruning portion of the search-- a speculative heuristic which prunes many positions to improve performance
 * @param historyTable - a table that stores how effective moving from one square to another is historically through the search
 * 
 * 
 * 
 * 
 * @returns The a result object which contains the best move found
 */
function minimaxAB(
  chessGame: Chess, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean, 
  startingColor: string,  
  transpositionTable: TranspositionTable,
  killerMoves: KillerMoves,
  searchDepth: number,
  inNullMove: boolean,
  historyTable: Int32Array
): { score: number, move: SimpleMove | null } {
  
  nodesVisited++;

  if(nodesVisited % 10000 === 0){
    console.log(nodesVisited);
    
  }
  
  const hash = chessGame.hash()

  let entry: TranspositionEntry | undefined

  if (!inNullMove) {
    entry = transpositionTable.get(hash);
    if (entry && entry.depth >= depth) { // The chess position has been seen before (hash exists and we can return the evaluation immediately)
      if (entry.flag === 'FULL') return { score: entry.score, move: entry.bestMove || null };
      if (entry.flag === 'ALPHA' && entry.score <= alpha) return { score: alpha, move: null };
      if (entry.flag === 'BETA' && entry.score >= beta) return { score: beta, move: null };
    }
  }


  //We reached the end of the search so evaluate the position 
  if (depth === 0 || chessGame.isGameOver()) {
    return { score: evaluateBoard(chessGame, startingColor), move: null };
  }

  /*
  Null move pruning:
  
  checks if the position is still too for the maximizer strong even if the maximizer forfeits their turn- known as a 'null move' (which is not a legal move),
  however it serves as a useful heuristic for eliminating portions of the search space

  Sets inNullMove flag to true if used
  */
  if (
    !inNullMove &&
    depth !== searchDepth &&
    depth >= 3 &&
    isMaximizing &&
    !chessGame.isCheck()
  ) {
    const currentColor = chessGame.turn();
    const oppositeColor = currentColor === 'w' ? 'b' : 'w';


      const cloned = new Chess(chessGame.fen());

      cloned.setTurn(oppositeColor)

      
      const R = 2; 
      const nullEval = minimaxAB(
        cloned,
        depth - 1 - R,
        alpha,
        beta,
        false, 
        startingColor,
        transpositionTable,
        killerMoves,
        searchDepth,
        true,
        historyTable
        
      ).score;


      if (nullEval >= beta) {
        return { score: beta, move: null };
      }
    
  }

  let legalMoves = chessGame.moves({ verbose: true });


  // Move ordering 
  const scoredMoves = legalMoves.map(move => ({
    move,
    score: evaluateMovePriority(chessGame, move, entry, killerMoves, depth,inNullMove,historyTable)
  }));
  scoredMoves.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    // Tiebreaker: prioritize stronger pieces
    const pieceCmp = pieceValues[b.move.piece] - pieceValues[a.move.piece];
    if (pieceCmp !== 0) return pieceCmp;

    return 0;
  });

  if(depth === searchDepth || depth === searchDepth - 1){
    console.log(scoredMoves)
  }


  let originalAlpha = alpha;
  let originalBeta = beta;

  let bestEval = isMaximizing ? -1000000 : 1000000;
  let bestMove = null;

  let isFirstMove = true;


  for (let i = 0; i < scoredMoves.length; i++) {

    const move = scoredMoves[i].move
    chessGame.move(move);

    let result;

    const isCapture = move.isCapture()
    const isKiller = isKillerMove(killerMoves,depth,move)

    let reduction = 0

    if (
      !isCapture &&
      !isFirstMove &&           
      depth >= 3 &&                    
      !isKiller &&             
      i > 3                     
    ) {
      reduction = 1; // Reduce depth by 1 ply
    }


    if (isFirstMove) {
      // Full-window search on first move
      result = minimaxAB(chessGame,depth - 1, alpha,beta,!isMaximizing,startingColor,transpositionTable,killerMoves,searchDepth,inNullMove,historyTable);
      isFirstMove = false;

    } else {
      //Null-window search for other moves
      result = minimaxAB(chessGame,depth - 1 - reduction,alpha,alpha + 1,!isMaximizing,startingColor,transpositionTable,killerMoves,searchDepth,inNullMove,historyTable);

      //Re-search with full window if fail-high
      if (result.score > alpha && result.score < beta) {
        result = minimaxAB(chessGame,depth - 1,alpha,beta,!isMaximizing,startingColor,transpositionTable,killerMoves,searchDepth,inNullMove,historyTable);
      }
    }

    chessGame.undo();

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

    if (beta <= alpha) {
      if (!isCapture) {
        storeKillerMove(killerMoves, move, depth);
        updateHistoryHeuristic(historyTable,move,depth)
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

  if(!inNullMove){

    transpositionTable.set(hash!, {
      score: bestEval,
      depth: depth,
      flag: flag,
      bestMove: (flag === 'FULL' && bestMove) ? { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion } : undefined
    });

  }

  return { score: bestEval, move: bestMove };
}



function isKillerMove(killerMoves: KillerMoves, depth: number, move: Move): boolean {
  const killers = killerMoves.get(depth);
  if (!killers) return false;

  return killers.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
}


function updateHistoryHeuristic(historyTable: Int32Array, move: Move, depth: number) {
  const from = squareToIndex(move.from);
  const to = squareToIndex(move.to);
  const moveIndex = from * 64 + to;
  const currentScore = historyTable[moveIndex];
  historyTable[moveIndex] = Math.min(currentScore + (depth + 1) * (depth + 1), 3500)
}

function squareToIndex(square: string): number {
  return (8 - parseInt(square[1])) * 8 + (square.charCodeAt(0) - 97);
}

function storeKillerMove(killerMoves: KillerMoves, move: Move, depth: number) {
  const killers = killerMoves.get(depth) ?? [];
  if (!killers.some(m => m.from === move.from && m.to === move.to && m.piece === move.piece && m.promotion === move.promotion )) {
    if (killers.length >= 2) killers.pop();
    killers.unshift(move);
    killerMoves.set(depth, killers);
  }
}

function searchBestMoveMinimax(chessGame: Chess, searchDepth: number, startingColor: string) {
  let result = null;

  const transpositionTable = new TranspositionTable(250000);

  const historyTable = new Int32Array(64 * 64);

  const killerMoves = new Map<number, Move[]>();

  const start = performance.now();

  for (let currentDepth = 1; currentDepth <= searchDepth; currentDepth++) {
    result = minimaxAB(chessGame, currentDepth, -1000000, 1000000, true,startingColor, transpositionTable,killerMoves,searchDepth, false,historyTable);
  }

  const end = performance.now();

  console.log(`time taken by minimax: ${ end - start } ` )

  console.log(killerMoves)

  return result?.move;
}

// Move scoring function - used for ordering moves in the minimax search which is crucial 

function evaluateMovePriority(chessGame: Chess, move: Move, ttEntry: TranspositionEntry | undefined,killerMoves: KillerMoves,depth: number,inNullMove: boolean,historyTable: Int32Array){

  const pieceMoved = move.piece
  const movedTo = move.to
  const movedFrom = move.from

  let score = 0 // score tells how prioritized a move should be

  const earlyGame = chessGame.moveNumber() <= 15

  const bestMove = ttEntry?.bestMove
  const turn = chessGame.turn()

  const opponentColor = oppositeColor(turn)


  //transposition table move available - the best move found at an earlier point or shallower depth (highest priority)
  if (!inNullMove && bestMove && movedFrom === bestMove.from && movedTo === bestMove.to && move.promotion === bestMove.promotion) {
    return 25000
  }
  //capture moves (high priority)
  if(move.isCapture()){
    
    const captured = move.captured as string
    const victimValue = pieceValues[captured]
    const attackerValue = pieceValues[pieceMoved]

    score += 2000 + ( victimValue * 10 - attackerValue ) 

    if(chessGame.isAttacked(movedTo,opponentColor) && depth > 3){ // captured square is defended by opponent pieces if true

      let seeScore = staticExchangeEval(chessGame,movedTo,turn)

      if(seeScore < 0){
        score -= 6000
        console.log("losing trade found")
      }
      else{
        score += seeScore * 2
      }

    }

  }
  else if(!inNullMove) { // none capture moves (low priority unless a killer move or found in history table)

    
    const killers = killerMoves.get(depth);
    if (killers && killers.some(k =>k.from === move.from &&k.to === move.to &&k.piece === move.piece && k.promotion === move.promotion)) {
      score += 4500;
    }
    else{
      const from = squareToIndex(move.from);
      const to = squareToIndex(move.to);
      score += historyTable[from * 64 + to];
    }

  } 

  if(move.isEnPassant()){
    score += 1000
  } // En passant and promotion mutually exclusive
  else if(move.isPromotion()){
    score += 12000
    score += getPieceValue(move.promotion as string) 

  }


  if(earlyGame){ // early game bonuses

    if(move.isBigPawn()){
      score += 200
    }

    if(pieceMoved === 'n' || pieceMoved === 'b'){
      score += 250
    }
    else if(move.isKingsideCastle() || move.isQueensideCastle()){
      score += 250
    }

  }

  if(chessGame.isAttacked(movedFrom, opponentColor)){ // Opponent attacking piece square moved from 
    score += 50
  }
  if(chessGame.isAttacked(movedTo, opponentColor)){ // Opponent attacking square moved to
    score -= 10
  }
  if(chessGame.isAttacked(movedTo, turn)){ // Square moved to already defended by a friendly piece
    score += 20
  }

  return score
}

// Static exchange eval - checks if a 

function staticExchangeEval(
  chessGame: Chess,
  square: Square,
  color: 'w' | 'b'
): number {
  const target = chessGame.get(square);
  if (!target) return 0;

  // Get initial attackers and sort by value (cheapest first)
  const initialAttackers = {
    w: chessGame
      .attackers(square, 'w')
      .map(sq => ({ square: sq, piece: chessGame.get(sq)! }))
      .sort((a, b) => pieceValues[a.piece.type] - pieceValues[b.piece.type]),
    b: chessGame
      .attackers(square, 'b')
      .map(sq => ({ square: sq, piece: chessGame.get(sq)! }))
      .sort((a, b) => pieceValues[a.piece.type] - pieceValues[b.piece.type]),
  };

  const gain: number[] = [];
  gain[0] = pieceValues[target.type];

  let depth = 0;
  let side = color;

  
  const whiteAttackers = [...initialAttackers.w];
  const blackAttackers = [...initialAttackers.b];

  while (true) {
    const attackers = side === 'w' ? whiteAttackers : blackAttackers;
    if (attackers.length === 0) break;

    const attacker = attackers.shift()!;

    // Skip illegal king captures (would walk into check)
    if (
      attacker.piece.type === 'k' &&
      chessGame.attackers(square, side === 'w' ? 'b' : 'w').length > 0
    ) {
      continue;
    }

    depth++;
    gain[depth] = pieceValues[attacker.piece.type] - gain[depth - 1];

    // Alternate side
    side = side === 'w' ? 'b' : 'w';
  }

  // Minimax backward: maximize gain for the side to move - because we should assume we still stop trading pieces if no longer profitable
  for (let i = gain.length - 2; i >= 0; i--) {
    gain[i] = Math.max(-gain[i + 1], gain[i]);
  }

  return gain[0] * 4;
}


function oppositeColor(color: string): 'w' | 'b'{
  return color === 'w' ? 'b' : 'w'
}

export {randomMove}
export {searchBestMoveMinimax}



//r1bqkb1r/pp1ppppp/2n5/2p5/3n1BP1/2NP1N2/PPP1PP1P/R2QKB1R w KQkq - 3 6     | a noisy middle game position

//5k1r/2p2p1p/2p1r1p1/8/P4PP1/8/7P/2R2RK1 w - - 0 28      | a rook endgame position