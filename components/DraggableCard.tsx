
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';

interface DraggableCardProps {
  id: string;
  text: string;
  isHeader?: boolean;
  isSmall?: boolean;
  headerColor?: string;
  onDelete?: (id: string) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ id, text, isHeader, isSmall, headerColor, onDelete }) => {
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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 100 : 1,
    backgroundColor: isHeader && headerColor ? headerColor : undefined,
    borderColor: isHeader && headerColor ? headerColor : undefined,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative select-none cursor-grab active:cursor-grabbing transition-all duration-200
        border-2 rounded-xl flex items-center justify-center text-center font-bold
        ${isHeader ? 'text-white shadow-xl py-5 px-8 min-w-[190px]' : 'bg-white text-[#1e2d4d] border-gray-200 shadow-sm hover:shadow-md py-3 px-4 text-sm'}
        ${isSmall ? 'text-xs py-2.5 px-3 min-w-[120px]' : ''}
      `}
    >
      <div {...attributes} {...listeners} className="flex-1">
        <span className={isHeader ? 'uppercase tracking-widest' : ''}>{text}</span>
      </div>
      
      {onDelete && (
        <button 
          onClick={handleDelete}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default DraggableCard;
