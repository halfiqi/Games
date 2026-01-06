
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  CollisionDetection,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TandemLogo, INITIAL_CARDS } from './constants';
import { BoardState, Card, CATEGORIES } from './types';
import BoardRow from './components/BoardRow';
import DraggableCard from './components/DraggableCard';
import { RotateCcw, Share2, Check, Download, Upload, X, Copy, Info, FileJson, FilePlus } from 'lucide-react';

// Utility to handle template vs instance IDs
const isTemplate = (id: string) => id.startsWith('template-');
const getTemplateId = (id: string) => id.replace('template-', '');
const createInstanceId = (templateId: string) => `inst-${templateId}-${Math.random().toString(36).substr(2, 9)}`;

// Fisher-Yates Shuffle Algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Robust URL-Safe Base64 Serialization
 */
const serializeState = (state: BoardState) => {
  const data = {
    c: state.classification,
    g: state.grid,
  };
  try {
    const json = JSON.stringify(data);
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < utf8Bytes.byteLength; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.error("Failed to serialize board", e);
    return null;
  }
};

const deserializeState = (encoded: string): Partial<BoardState> | null => {
  if (!encoded) return null;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    return {
      classification: data.c,
      grid: data.g,
    };
  } catch (e) {
    console.warn("Failed to deserialize board.", e);
    return null;
  }
};

const PoolContainer: React.FC<{ cards: Card[] }> = ({ cards }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });
  
  return (
    <div 
      ref={setNodeRef}
      className={`fixed top-0 right-0 w-72 h-screen bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-40 transition-colors flex flex-col ${isOver ? 'bg-blue-50/50' : ''}`}
    >
      <div className="p-6 border-b border-gray-100 bg-white/50">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Component Pool</h3>
        <p className="text-[10px] text-gray-400 font-medium">Drag items to the board</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex flex-col gap-3 pb-20">
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <DraggableCard key={card.id} id={card.id} text={card.text} />
            ))}
          </SortableContext>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialPool = useMemo(() => {
    const templates = INITIAL_CARDS.map(c => ({ ...c, id: `template-${c.id}` }));
    return shuffleArray(templates);
  }, []);

  const [board, setBoard] = useState<BoardState>(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('board');
    if (sharedData) {
      const deserialized = deserializeState(sharedData);
      if (deserialized) {
        return {
          classification: deserialized.classification || [],
          grid: deserialized.grid || { strategy: {}, mechanics: {}, ux: {}, theme: {} },
          pool: initialPool,
        };
      }
    }
    return {
      classification: [],
      grid: { strategy: {}, mechanics: {}, ux: {}, theme: {} },
      pool: initialPool,
    };
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isCopied, setIsCopied] = useState<'link' | 'code' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((id: string, currentState: BoardState) => {
    if (id === 'pool') return { rowId: 'pool' };
    if (currentState.pool.some(c => c.id === id)) return { rowId: 'pool' };
    if (id === 'classification') return { rowId: 'classification' };
    if (currentState.classification.some(c => c.id === id)) return { rowId: 'classification' };
    if (id.includes('::')) {
      const [rowId, colId] = id.split('::');
      return { rowId, colId };
    }
    for (const [rowId, columns] of Object.entries(currentState.grid)) {
      for (const [colId, cards] of Object.entries(columns)) {
        if (cards.some(c => c.id === id)) return { rowId, colId };
      }
    }
    return null;
  }, []);

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = active.id as string;
    const overId = over.id as string;
    if (activeIdStr === overId) return;
    if (isTemplate(activeIdStr)) return;

    setBoard((prev) => {
      const activeLoc = findContainer(activeIdStr, prev);
      const overLoc = findContainer(overId, prev);
      if (!activeLoc || !overLoc) return prev;
      if (activeLoc.rowId === overLoc.rowId && activeLoc.colId === overLoc.colId) return prev;

      const activeCard = activeLoc.rowId === 'classification' 
        ? prev.classification.find(c => c.id === activeIdStr)
        : activeLoc.colId 
          ? prev.grid[activeLoc.rowId][activeLoc.colId]?.find(c => c.id === activeIdStr)
          : undefined;

      if (!activeCard) return prev;
      const nextState = { ...prev };
      nextState.grid = { ...prev.grid };
      nextState.classification = [...prev.classification];

      if (activeLoc.rowId === 'classification') {
        nextState.classification = nextState.classification.filter(c => c.id !== activeIdStr);
      } else if (activeLoc.colId) {
        const rowCols = { ...nextState.grid[activeLoc.rowId] };
        rowCols[activeLoc.colId] = (rowCols[activeLoc.colId] || []).filter(c => c.id !== activeIdStr);
        nextState.grid[activeLoc.rowId] = rowCols;
      }

      if (overLoc.rowId === 'classification') {
        if (!nextState.classification.some(c => c.id === activeCard.id)) {
          nextState.classification.push(activeCard);
          Object.keys(nextState.grid).forEach(r => {
            const rowCols = { ...nextState.grid[r] };
            if (!rowCols[activeCard.id]) rowCols[activeCard.id] = [];
            nextState.grid[r] = rowCols;
          });
        }
      } else if (overLoc.colId) {
        const rowCols = { ...nextState.grid[overLoc.rowId] };
        const colCards = [...(rowCols[overLoc.colId] || [])];
        if (!colCards.some(c => c.id === activeCard.id)) {
          colCards.push(activeCard);
          rowCols[overLoc.colId] = colCards;
          nextState.grid[overLoc.rowId] = rowCols;
        }
      }
      return nextState;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeIdStr = active.id as string;
    if (!over) {
      setActiveId(null);
      return;
    }

    setBoard((prev) => {
      const overLoc = findContainer(over.id as string, prev);
      const activeLoc = findContainer(activeIdStr, prev);
      let nextState = { ...prev };

      if (isTemplate(activeIdStr)) {
          if (overLoc && overLoc.rowId !== 'pool') {
              const templateId = getTemplateId(activeIdStr);
              const original = INITIAL_CARDS.find(c => c.id === templateId);
              if (original) {
                  const newInstance = { ...original, id: createInstanceId(templateId) };
                  if (overLoc.rowId === 'classification') {
                      nextState.classification = [...nextState.classification, newInstance];
                      Object.keys(nextState.grid).forEach(r => {
                        const rowCols = { ...nextState.grid[r] };
                        rowCols[newInstance.id] = [];
                        nextState.grid[r] = rowCols;
                      });
                  } else if (overLoc.colId) {
                      const rowCols = { ...nextState.grid[overLoc.rowId] };
                      rowCols[overLoc.colId] = [...(rowCols[overLoc.colId] || []), newInstance];
                      nextState.grid[overLoc.rowId] = rowCols;
                  }
              }
          }
      } else if (activeLoc && overLoc && activeLoc.rowId === overLoc.rowId && activeLoc.colId === overLoc.colId) {
        if (activeLoc.rowId === 'classification') {
          const oldIdx = nextState.classification.findIndex(c => c.id === activeIdStr);
          const newIdx = nextState.classification.findIndex(c => c.id === (over.id as string));
          if (oldIdx !== -1 && newIdx !== -1) {
            nextState.classification = arrayMove(nextState.classification, oldIdx, newIdx);
          }
        } else if (activeLoc.rowId === 'pool') {
          const oldIdx = nextState.pool.findIndex(c => c.id === activeIdStr);
          const newIdx = nextState.pool.findIndex(c => c.id === (over.id as string));
          if (oldIdx !== -1 && newIdx !== -1) {
            nextState.pool = arrayMove(nextState.pool, oldIdx, newIdx);
          }
        } else if (activeLoc.colId) {
          const colCards = nextState.grid[activeLoc.rowId][activeLoc.colId] || [];
          const oldIdx = colCards.findIndex(c => c.id === activeIdStr);
          const newIdx = colCards.findIndex(c => c.id === (over.id as string));
          if (oldIdx !== -1 && newIdx !== -1) {
            const rowCols = { ...nextState.grid[activeLoc.rowId] };
            rowCols[activeLoc.colId] = arrayMove(colCards, oldIdx, newIdx);
            nextState.grid[activeLoc.rowId] = rowCols;
          }
        }
      }
      return nextState;
    });
    setActiveId(null);
  };

  const resetGame = () => {
    if (!confirm("Are you sure you want to start a new board? Everything current will be lost.")) return;
    const templates = INITIAL_CARDS.map(c => ({ ...c, id: `template-${c.id}` }));
    setBoard({
      classification: [],
      grid: { strategy: {}, mechanics: {}, ux: {}, theme: {} },
      pool: shuffleArray(templates),
    });
    const url = new URL(window.location.href);
    url.searchParams.delete('board');
    window.history.replaceState({}, '', url.toString());
  };

  const currentBoardCode = useMemo(() => serializeState(board), [board]);
  const currentBoardLink = useMemo(() => {
    if (!currentBoardCode) return "";
    const url = new URL(window.location.href);
    url.searchParams.set('board', currentBoardCode);
    return url.toString();
  }, [currentBoardCode]);

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };

  const handleImport = (text: string) => {
    const deserialized = deserializeState(text.trim());
    if (deserialized) {
      setBoard({
        classification: deserialized.classification || [],
        grid: deserialized.grid || { strategy: {}, mechanics: {}, ux: {}, theme: {} },
        pool: initialPool,
      });
      setShowImportModal(false);
      setImportText("");
    } else {
      alert("Invalid board data. Please check and try again.");
    }
  };

  const exportToFile = () => {
    const data = JSON.stringify({ c: board.classification, g: board.grid }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tandem-learning-board.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.c && json.g) {
          setBoard({
            classification: json.c,
            grid: json.g,
            pool: initialPool
          });
          alert("Board loaded successfully!");
        }
      } catch (err) {
        alert("Failed to read file. Make sure it is a valid board file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    if (isTemplate(activeId)) {
        return INITIAL_CARDS.find(c => `template-${c.id}` === activeId) || null;
    }
    const allInstances = [
        ...board.classification,
        ...Object.values(board.grid).flatMap(cols => Object.values(cols).flat())
    ];
    return allInstances.find(c => c.id === activeId) || null;
  }, [activeId, board]);

  const isBlobUrl = window.location.protocol === 'blob:';

  return (
    <div className="min-h-screen pr-72">
      <header className="px-6 py-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-50">
        <div className="flex-1 flex gap-2">
          {/* File Menu Style Buttons */}
          <button 
            onClick={resetGame} 
            className="group flex items-center gap-2 px-3 py-2 text-[10px] font-black text-gray-400 hover:text-[#1e6fb3] transition-all uppercase tracking-widest bg-gray-50 rounded-lg"
            title="Start a new empty board"
          >
            <FilePlus className="w-3.5 h-3.5" />
            New
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-gray-400 hover:text-[#1e6fb3] transition-all uppercase tracking-widest bg-gray-50 rounded-lg"
            title="Load board from a file"
          >
            <Upload className="w-3.5 h-3.5" />
            Open
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importFromFile} className="hidden" />

          <button 
            onClick={exportToFile}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-gray-400 hover:text-[#1e6fb3] transition-all uppercase tracking-widest bg-gray-50 rounded-lg"
            title="Download this board as a file"
          >
            <Download className="w-3.5 h-3.5" />
            Save
          </button>
        </div>

        <TandemLogo />

        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-[#1e6fb3] text-white hover:bg-[#155a94] shadow-md hover:shadow-lg transition-all uppercase tracking-widest rounded-xl"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Board
          </button>
        </div>
      </header>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[#1e2d4d] mb-2">Share Board</h2>
            <p className="text-gray-500 text-sm mb-6">Choose a method to share your board with others.</p>

            <div className="space-y-6">
              {/* File Export (New Primary Method) */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <FileJson className="w-5 h-5 text-[#1e6fb3]" />
                  <h3 className="font-bold text-[#1e2d4d] text-sm uppercase tracking-wide">Method 1: File Transfer (Best)</h3>
                </div>
                <p className="text-xs text-[#1e2d4d]/70 mb-4 leading-relaxed">Download a board file and send it directly to your friend. They can use the "Open" button to load it.</p>
                <button 
                  onClick={exportToFile}
                  className="w-full flex items-center justify-center gap-2 bg-white text-[#1e6fb3] py-2.5 rounded-xl border border-[#1e6fb3]/20 font-bold text-xs hover:bg-blue-100 transition-all uppercase tracking-widest"
                >
                  <Download className="w-4 h-4" />
                  Download .json file
                </button>
              </div>

              {/* Option 2: Code */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Method 2: Board Code</label>
                <div className="flex gap-2">
                  <input readOnly value={currentBoardCode || ""} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 font-mono outline-none" />
                  <button onClick={() => copyToClipboard(currentBoardCode || "", 'code')} className={`px-4 rounded-xl transition-all ${isCopied === 'code' ? 'bg-green-500 text-white' : 'bg-gray-100 text-[#1e2d4d] hover:bg-gray-200'}`}>
                    {isCopied === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Option 3: Link (with disclaimer) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Method 3: Shareable Link</label>
                <div className="flex gap-2">
                  <input readOnly value={currentBoardLink} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 outline-none" />
                  <button onClick={() => copyToClipboard(currentBoardLink, 'link')} className={`px-4 rounded-xl transition-all ${isCopied === 'link' ? 'bg-green-500 text-white' : 'bg-gray-100 text-[#1e2d4d] hover:bg-gray-200'}`}>
                    {isCopied === 'link' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {isBlobUrl && (
                  <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-[10px] leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Links only work if you publish this app to a website (like Vercel). For now, use <strong>Method 1 or 2</strong> to share between laptops.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowImportModal(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[#1e2d4d] mb-2 text-center">Import Board</h2>
            <p className="text-gray-500 text-sm mb-6 text-center">Paste a board code below to load its configuration.</p>

            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste code here..."
              className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-mono outline-none focus:ring-2 focus:ring-[#1e6fb3]/20 mb-6 resize-none"
            />

            <button 
              onClick={() => handleImport(importText)}
              disabled={!importText.trim()}
              className="w-full bg-[#1e6fb3] text-white py-4 rounded-2xl font-bold hover:bg-[#155a94] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Board
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1700px] mx-auto p-8">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="board-texture flex flex-col gap-6 p-10 rounded-[2.5rem] border border-gray-200">
            {CATEGORIES.map((cat) => (
              <BoardRow
                key={cat.id}
                id={cat.id}
                label={cat.label}
                subLabel={cat.subLabel}
                board={board}
              />
            ))}
          </div>

          <PoolContainer cards={board.pool} />

          <DragOverlay dropAnimation={null}>
            {activeId && activeCard ? (
              <div className="px-5 py-3 bg-white border-2 border-[#1e2d4d] rounded-2xl shadow-2xl flex items-center justify-center min-w-[140px] transform rotate-2 pointer-events-none">
                <span className="text-sm font-bold text-[#1e2d4d]">{activeCard.text}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};

export default App;
