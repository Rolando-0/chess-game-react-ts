import { Chess, Move} from 'chess.js';
import dice_img from './assets/dice-symbol.svg'

function randomMove(chessGame: Chess): Move | null{
  if(!chessGame.isGameOver()){
    const possibleMoves = chessGame.moves({verbose: true});
    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    return randomMove;
  }
  return null;

}

interface ComputerMoveProps {
  chessGame: Chess;
  makeMove: (fromSquare: string, toSquare: string, promotion?: string) => void;
}
const ComputerMoveButtons: React.FC<ComputerMoveProps> = ({chessGame,makeMove}) => {

  const handleRandomMove = () => {
    const move = randomMove(chessGame);
    if(move){
      makeMove(move.from,move.to,move.promotion);
    }
  };


  
  return (
    <button onClick={handleRandomMove} className="flex items-center px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100 cursor-pointer">
      <img src={dice_img} className="w-12 h-12 rounded-full"></img>
      random move?
    </button>
  )
}

export default ComputerMoveButtons