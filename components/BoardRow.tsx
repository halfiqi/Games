
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardState, CategoryId } from '../types.ts';
import DraggableCard from './DraggableCard.tsx';
import ColumnCell from './ColumnCell.tsx';
import { COLUMN_COLORS } from '../constants.tsx';

interface BoardRowProps {
  id: CategoryId;
  label: string;
  subLabel?: string;
  board: BoardState;
  onDeleteCard: (cardId: string, rowId: string, colId?: string) => void;
}

const BoardRow: React.FC<BoardRowProps> = ({ id, label, subLabel, board, onDeleteCard }) => {
  const isClassification = id === 'classification';
  const { setNodeRef, isOver } = useDroppable({ 
    id, 
    disabled: !isClassification 
  });

  const activeCols = board?.classification || [];

  return (
    <div className="flex gap-10 items-stretch min-h-[180px]">
      {/* Row Label */}
      <div className={`w-72 shrink-0 flex flex-col justify-center pr-12 border-r-2 border-dashed border-gray-200 transition-all ${isClassification ? 'bg-[#1e2d4d] text-white rounded-[2.5rem] px-10 shadow-2xl border-none ring-8 ring-[#1e2d4d]/5' : ''}`}>
        <span className={`text-5xl font-handwritten leading-none tracking-tight ${isClassification ? 'text-white' : 'text-[#1e2d4d]'}`}>
          {label}
        </span>
        {subLabel && (
          <span className={`text-2xl font-handwritten opacity-50 leading-tight mt-1 ${isClassification ? 'text-blue-100' : 'text-[#1e2d4d]'}`}>
            {subLabel}
          </span>
        )}
      </div>

      {/* Row Content */}
      <div className="flex-1 flex gap-8 overflow-x-auto pb-8 scrollbar-hide items-center">
        {isClassification ? (
          <div
            ref={setNodeRef}
            className={`flex-1 flex gap-6 min-w-[250px] items-center p-8 rounded-[3rem] border-2 transition-all ${isOver ? 'bg-blue-50/50 border-blue-400 border-dashed' : 'bg-white/20 border-transparent'}`}
          >
            <SortableContext items={activeCols.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {activeCols.map((card, idx) => (
                <DraggableCard 
                  key={card.id} 
                  id={card.id} 
                  text={card.text} 
                  isHeader 
                  headerColor={COLUMN_COLORS[idx % COLUMN_COLORS.length]}
                  onDelete={() => onDeleteCard(card.id, 'classification')}
                />
              ))}
            </SortableContext>
            {activeCols.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-300 font-black uppercase tracking-[0.3em] text-[11px] opacity-50 animate-pulse">
                Drag cards here to create columns
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex gap-8">
            {activeCols.map((col, idx) => (
              <ColumnCell
                key={col.id}
                rowId={id}
                colId={col.id}
                items={board?.grid?.[id]?.[col.id] || []}
                accentColor={COLUMN_COLORS[idx % COLUMN_COLORS.length]}
                onDeleteCard={onDeleteCard}
              />
            ))}
            {activeCols.length === 0 && (
              <div className="flex-1 flex items-center justify-center rounded-[3rem] border-2 border-dashed border-gray-200 bg-gray-50/20">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-200">Awaiting Columns</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardRow;
