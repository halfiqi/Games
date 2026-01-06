
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '../types.ts';
import DraggableCard from './DraggableCard.tsx';

interface ColumnCellProps {
  rowId: string;
  colId: string;
  items: Card[];
  accentColor: string;
  onDeleteCard: (cardId: string, rowId: string, colId: string) => void;
}

const ColumnCell: React.FC<ColumnCellProps> = ({ rowId, colId, items, accentColor, onDeleteCard }) => {
  const cellId = `${rowId}::${colId}`;
  const { setNodeRef, isOver } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[220px] min-h-[160px] rounded-3xl border-2 border-dashed transition-all p-4 flex flex-col gap-3
        ${isOver ? 'bg-white shadow-2xl scale-[1.03]' : 'bg-white/30'}
      `}
      style={{
        borderColor: isOver ? accentColor : `${accentColor}11`,
      }}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <DraggableCard 
            key={item.id} 
            id={item.id} 
            text={item.text} 
            isSmall 
            onDelete={() => onDeleteCard(item.id, rowId, colId)}
          />
        ))}
      </SortableContext>
      
      {items.length === 0 && !isOver && (
        <div className="flex-1 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-dashed border-black flex items-center justify-center font-black text-3xl">+</div>
        </div>
      )}
    </div>
  );
};

export default ColumnCell;
