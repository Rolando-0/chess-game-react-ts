import React from 'react';
import { useState } from 'react';
import { Chess, Square } from 'chess.js';
import {pieceImages} from './pieceImages'

interface ChessboardProps {
  isWhite: boolean;
  chessGame: Chess;
  makeMove: (fromSquare: string, toSquare: string, promotion?: string) => void;
  promotePiece: string;
}


const Chessboard: React.FC<ChessboardProps> = ({ isWhite,chessGame,makeMove,promotePiece }) => {

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  //List of possible moves depending on the selected square
  const possibleMoves = selectedSquare ? chessGame.moves({ square: selectedSquare as Square, verbose: true }).map(move => move.to) : [];
  // Define the file (a-h) and rank (1-8) values
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Reverse the rows if playing as black
  const adjustedRanks = !isWhite ? ranks : ranks.slice().reverse();

  const ChessPiece = ({ piece }: { piece: { type: string; color: string } | null }) => {
    if (!piece) return null; // No piece on this square

    const key = `${piece.color}${piece.type}`; // e.g., "wp"
    return <img src={pieceImages[key]} alt={key} className="w-24 h-24" />;
};

  const handleSquareClick = (squareClicked: string) => {
    const alreadySelected = selectedSquare === squareClicked
    if (selectedSquare !== null && !alreadySelected) {

      makeMove(selectedSquare,squareClicked,promotePiece);  // Execute move
      setSelectedSquare(null); // Deselect after move
      return; // Stop further execution
    }

    // If no move was made, deselect or update selected square
    setSelectedSquare(alreadySelected ? null : squareClicked);
    console.log(chessGame.get(squareClicked as Square))
    console.log(possibleMoves)
};

  // Render each square with alphanumeric notation
  //if you add the row index and column index (assuming both start from 1, like in algebraic notation), the sum determines the color:
  //ASSUMING INDICES START AT 0
  //Even sum → White square
  //Odd sum → Black square

  const renderSquare = (file: string, rank: string) => {
    const square = `${file}${rank}`;
    const isDarkSquare = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
    const isSelected = square === selectedSquare;

    const piece = chessGame.get(square as Square) || null

    const isPossibleMove = possibleMoves.includes(square as Square)

    return (
      <div
        key={square}
        onClick={() => handleSquareClick(square)}
        className={`flex items-center justify-center w-24 h-24 ${isDarkSquare ? 'bg-gray-700' : 'bg-gray-300'} ${isSelected ? 'border-4 border-yellow-500' : ''} ${isPossibleMove ? 'border-4 border-orange-500': ''}`}
      >
        <ChessPiece piece={piece}/>
      </div>
    );
  };

  // Render the entire chessboard
  const renderBoard = () => {
    return (
      <div className="grid grid-cols-8 border-4 border-black">
        {adjustedRanks.flatMap((rank) => files.map((file) => renderSquare(file, rank)))}
      </div>
    );
  };

  

  return <div>{renderBoard()}</div>;
};

export default Chessboard;