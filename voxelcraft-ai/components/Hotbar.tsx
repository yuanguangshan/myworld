
import React from 'react';
import { BlockType } from '../types';
import { BLOCK_DATA } from '../constants';

interface HotbarProps {
  selectedBlock: BlockType;
  onSelect: (type: BlockType) => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ selectedBlock, onSelect }) => {
  const blockTypes = Object.keys(BLOCK_DATA) as BlockType[];

  return (
    <div className="flex items-center gap-1 bg-black/60 p-1 border-4 border-gray-600 rounded-sm pointer-events-auto">
      {blockTypes.map((type, index) => (
        <div
          key={type}
          onClick={() => onSelect(type)}
          className={`
            relative w-12 h-12 flex items-center justify-center text-2xl cursor-pointer transition-all
            ${selectedBlock === type ? 'bg-white/20 border-4 border-white' : 'hover:bg-white/10 border-4 border-transparent'}
          `}
          title={BLOCK_DATA[type].name}
        >
          <span>{BLOCK_DATA[type].icon}</span>
          <span className="absolute bottom-0 right-1 text-[10px] text-white/50">{index + 1}</span>
        </div>
      ))}
    </div>
  );
};
