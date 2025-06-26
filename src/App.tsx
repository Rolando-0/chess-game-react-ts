import { useState } from 'react'
import Chessboard from './Chessboard'
import PromotionDropDown from './PromotionDropDown';
import { Chess } from 'chess.js'
import { ComputerMoveButtons, GameOptionButtons } from './ChessboardButtons';

const App: React.FC = () => {
  const [isWhite, setIsWhite] = useState<boolean>(Math.random() > 0.5);
  const [game, setGame] = useState(new Chess());
  const [promotePiece,setPromotionPiece] = useState<string>('q');

  const makeExplicitMove = (fromSquare: string, toSquare: string, promotion?: string) => {
    const newGame = new Chess();
    newGame.loadPgn(game.pgn()); 
  
    if (newGame.move({from: fromSquare, to: toSquare, promotion: promotion})) {
      setGame(newGame); 
    }
  }

  const makeMove = (move: string) => {
    const newGame = new Chess();
    newGame.loadPgn(game.pgn()); 
  
    if (newGame.move(move)) {
      setGame(newGame); 
    }
  }

  const setFen = (fen: string) => {
    const newGame = new Chess();
    try{
      newGame.load(fen);
      setGame(newGame);
    }catch(e){
      console.log(e)
    }
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Chessboard isWhite={isWhite} chessGame={game} makeExplicitMove={makeExplicitMove} promotePiece={promotePiece}/>
      <div className="ml-4 text-xl">
        <p>{isWhite ? 'You are playing as White' : 'You are playing as Black'}</p>
        <PromotionDropDown isWhite={isWhite} setPromotionPiece={setPromotionPiece}/>
        <ComputerMoveButtons chessGame={game} makeExplicitMove={makeExplicitMove} makeMove={makeMove} />
        <GameOptionButtons chessGame={game} setFen={setFen} />
      </div>
    </div>
  );
};

export default App
