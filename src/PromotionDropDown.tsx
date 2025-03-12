import React from 'react';
import { useState } from 'react';
import {pieceImages} from './pieceImages';

interface PromotionProps {
  isWhite: boolean,
  setPromotionPiece: (piece: string) => void;
}

const PromotionDropDown: React.FC<PromotionProps> = ({isWhite,setPromotionPiece}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(isWhite? 'wq' : 'bq');

  const promotionOptions = isWhite? ['wq','wr','wb','wn'] : ['bq','br','bb','bn']

  
  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const handleSelect = (piece: string) => {
    setSelectedOption(piece) // promotion piece differentiated by color e.g. 'wq' ,'wr', 'wb' 
    setPromotionPiece(piece[1]); // the type of piece itself e.g 'q' 'r' 'b' 'n'
    setIsOpen(false); //sets state of dropdown to be closed after selection
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className="flex items-center px-4 py-2 bg-white text-white rounded-md hover:bg-gray-100 cursor-pointer"
      >
        <img
          src={pieceImages[selectedOption]}
          alt={'Select promotion piece'}
          className="w-12 h-12 rounded-full"
        />
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-24 bg-white border rounded-md shadow-lg">
          <ul className="py-2">
            {promotionOptions.map((option) => (
              <li
                key={option}
                className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(option)}
              >
                <img
                  src={pieceImages[option]}
                  alt={option}
                  className="w-12 h-12 rounded-full"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PromotionDropDown;