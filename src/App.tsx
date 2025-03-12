import { useState } from 'react'
import Chessboard from './Chessboard'
import PromotionDropDown from './PromotionDropDown';
import { Chess } from 'chess.js'

const App: React.FC = () => {
  const [isWhite, setIsWhite] = useState<boolean>(Math.random() > 0.5);
  const [game, setGame] = useState(new Chess());
  const [promotePiece,setPromotionPiece] = useState<string>('q')

  const makeMove = (fromSquare: string, toSquare: string, promotion?: string) => {
    const newGame = new Chess();
    newGame.loadPgn(game.pgn()); 
  
    if (newGame.move({from: fromSquare, to: toSquare, promotion: promotion})) {
      setGame(newGame); 
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Chessboard isWhite={isWhite} chessGame={game} makeMove={makeMove} promotePiece={promotePiece}/>
      <div className="ml-4 text-xl">
        <p>{isWhite ? 'You are playing as White' : 'You are playing as Black'}</p>
        <PromotionDropDown isWhite={isWhite} setPromotionPiece={setPromotionPiece}/>
      </div>
    </div>
  );
};

export default App
