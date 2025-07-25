import { Chess, Move } from "chess.js";
import { getKingPST, getPSTValue } from "./pieceSquareTables";

export const pieceValues: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };


/* A function used in the minimax search to evaluate the position

Scores the position by considering the value of the pieces and their positional strength

*/
export function evaluateBoard(chessGame: Chess, startingColor: string) {
  
  if(chessGame.isCheckmate()){
    return (chessGame.turn() === startingColor) ? -100000 : 100000
  }

  const board = chessGame.board()

  let score = 0;


  for (let i = 0; i < 8; i++) {

    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];

      if (piece) {
        const baseValue = pieceValues[piece.type];
        const positional = getPSTValue(piece.type, piece.color,i,j);
        const totalValue = baseValue + positional;

        score += (piece.color === startingColor) ? totalValue : -totalValue;
      }
    }
  }




  return score;
}


