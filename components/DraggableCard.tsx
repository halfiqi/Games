
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableCardProps {
  id: string;
  text: string;
  isHeader?: boolean;
  isSmall?: boolean;
  headerColor?: string;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ id, text, isHeader, isSmall, headerColor }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 1,
    backgroundColor: isHeader && headerColor ? headerColor : undefined,
    borderColor: isHeader && headerColor ? headerColor : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        ${isHeader ? 'text-white px-6 py-4' : 'bg-white text-[#1e2d4d] border-[#1e2d4d]'}
        ${isSmall ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}
        border-2 rounded-xl shadow-sm hover:shadow-md transition-all
        flex items-center justify-center min-w-[120px] max-w-[200px]
        cursor-grab active:cursor-grabbing group
      `}
    >
      <span className={`font-bold text-center select-none ${isHeader ? 'uppercase tracking-wide' : ''}`}>
        {text}
      </span>
    </div>
  );
};

export default DraggableCard;
