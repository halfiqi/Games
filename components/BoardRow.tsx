
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardState, CategoryId } from '../types';
import DraggableCard from './DraggableCard';
import ColumnCell from './ColumnCell';
import { COLUMN_COLORS } from '../constants';

interface BoardRowProps {
  id: CategoryId;
  label: string;
  subLabel?: string;
  board: BoardState;
}

const BoardRow: React.FC<BoardRowProps> = ({ id, label, subLabel, board }) => {
  const isClassification = id === 'classification';
  
  const { setNodeRef, isOver } = useDroppable({ 
    id: id,
    disabled: !isClassification 
  });

  const columns = board.classification;

  return (
    <div className="flex gap-4 items-stretch min-h-[160px]">
      {/* Row Label */}
      <div className={`w-56 flex flex-col justify-center pr-8 border-r-2 border-dashed border-gray-300 transition-all ${isClassification ? 'bg-[#1e2d4d] rounded-xl text-white p-6 border-none shadow-xl' : ''}`}>
        <span className={`text-4xl font-handwritten leading-none mb-1 ${isClassification ? 'text-white' : 'text-[#1e2d4d]'}`}>
          {label}
        </span>
        {subLabel && (
          <span className={`text-3xl font-handwritten leading-tight ${isClassification ? 'text-white opacity-80' : 'text-[#1e2d4d] opacity-60'}`}>
            {subLabel}
          </span>
        )}
      </div>

      {/* Row Content */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {isClassification ? (
          <div
            ref={setNodeRef}
            className={`flex-1 flex gap-4 min-w-[200px] items-center p-4 rounded-2xl border-2 transition-all ${isOver ? 'bg-blue-50 border-blue-400' : 'bg-white/50 border-transparent'}`}
          >
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((card, index) => (
                <DraggableCard 
                  key={card.id} 
                  id={card.id} 
                  text={card.text} 
                  isHeader 
                  headerColor={COLUMN_COLORS[index % COLUMN_COLORS.length]}
                />
              ))}
            </SortableContext>
            {columns.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-400 font-medium italic text-lg text-center">
                Drag cards here to create columns
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex gap-4">
            {columns.length > 0 ? (
              columns.map((colCard, index) => (
                <ColumnCell
                  key={colCard.id}
                  rowId={id}
                  colId={colCard.id}
                  items={board.grid[id]?.[colCard.id] || []}
                  accentColor={COLUMN_COLORS[index % COLUMN_COLORS.length]}
                />
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/30">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">Add Learning Classifications First</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardRow;