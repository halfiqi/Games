
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '../types';
import DraggableCard from './DraggableCard';

interface ColumnCellProps {
  rowId: string;
  colId: string;
  items: Card[];
  accentColor?: string;
}

const ColumnCell: React.FC<ColumnCellProps> = ({ rowId, colId, items, accentColor }) => {
  // Use a unique separator to avoid conflict with instance IDs that contain dashes
  const cellId = `${rowId}::${colId}`;
  const { setNodeRef, isOver } = useDroppable({ id: cellId });

  const style = {
    borderColor: isOver ? accentColor : (accentColor ? `${accentColor}33` : '#e5e7eb'), // 33 is 20% opacity in hex
    backgroundColor: isOver ? `${accentColor}11` : 'white', // 11 is ~7% opacity
    borderWidth: accentColor ? '2px' : '1px',
    boxShadow: accentColor ? `0 4px 6px -1px ${accentColor}11` : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex-1 min-w-[180px] min-h-[140px] rounded-2xl border-dashed p-3 transition-all flex flex-col gap-2
        ${isOver ? 'ring-4 ring-offset-2' : 'shadow-sm'}
      `}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <DraggableCard key={item.id} id={item.id} text={item.text} isSmall />
        ))}
      </SortableContext>
      
      {items.length === 0 && !isOver && (
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-gray-300 text-xs">+</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnCell;
