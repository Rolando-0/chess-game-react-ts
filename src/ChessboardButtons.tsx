import { Chess, Move } from 'chess.js';
import dice_img from './assets/dice-symbol.svg';
import copy_to_clipboard_img from './assets/copy-to-clipboard.svg';
import { useState } from 'react';
import { randomMove } from './ComputerMoves'
import { searchBestMoveMinimax } from './ComputerMoves';

interface ComputerMoveProps {
  chessGame: Chess;
  makeExplicitMove: (fromSquare: string, toSquare: string, promotion?: string) => void;
  makeMove: (move: string) => void;
}
const ComputerMoveButtons: React.FC<ComputerMoveProps> = ({chessGame,makeExplicitMove,makeMove}) => {

  const handleRandomMove = () => {
    const move = randomMove(chessGame);
    if(move){
      makeExplicitMove(move.from,move.to,move.promotion);
    }
  };

  const handleMinimaxMove = () => {
    const tempChessGame = new Chess();
    tempChessGame.loadPgn(chessGame.pgn());

    const turn = chessGame.turn()

    const move = searchBestMoveMinimax(tempChessGame,4,turn);

    if(move){
      makeExplicitMove(move.from,move.to,move.promotion)
    }
  }

  return (
    <div>
      <button onClick={handleRandomMove} className="flex items-center mt-2 px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100 cursor-pointer">
        <img src={dice_img} className="w-12 h-12 rounded-full"></img>
        random move?
      </button>
      <button onClick={handleMinimaxMove} className="flex items-center mt-2 px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100 cursor-pointer">
        Minimax
      </button>
    </div>
    
  )
}

interface GameOptionProps{
  chessGame: Chess;
  setFen: (fen: string) => void;
}

const GameOptionButtons: React.FC<GameOptionProps> = ({chessGame,setFen}) => {
  const [inputFen, setInputFen] = useState<string>('');

  const handleSetFenString = () => {
    setFen(inputFen);
  }
  const copyFenToClipBoard = async () => {
    try{
      await navigator.clipboard.writeText(chessGame.fen());
      console.log('Copied FEN string');
    } catch(err) {
      console.log('Failed to copy FEN: ', err);
    }

  };


  return(
    <div className="flex mt-2">
      <button onClick={copyFenToClipBoard} className="flex items-center px-4 py-2 bg-white rounded-md hover:bg-gray-100 cursor-pointer">
        <img src={copy_to_clipboard_img} className="w-12 h-12 rounded-full"></img>
      </button>
      <input
        type="text"
        value={inputFen}
        onChange={(e) => setInputFen(e.target.value)}
        placeholder="Enter FEN string"
        className="flex items-center w-64 px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-text"
      />
      <button onClick={handleSetFenString} className="flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100 cursor-pointer">
        Set FEN
      </button>
    </div>
  )
}
//TODO add restart game button
//Display game state - stalemate,checkmate, draw
export {ComputerMoveButtons}
export {GameOptionButtons}