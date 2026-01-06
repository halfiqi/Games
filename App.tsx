
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TandemLogo, INITIAL_POOL_CARDS } from './constants';
import { BoardState, Card, CATEGORIES } from './types';
import BoardRow from './components/BoardRow';
import DraggableCard from './components/DraggableCard';
import { Share2, Check, Download, Upload, X, Copy, Info, FilePlus, ExternalLink, AlertCircle, Link } from 'lucide-react';

const isPoolTemplate = (id: string) => id.startsWith('p');
const generateInstanceId = (baseId: string) => `inst-${baseId}-${Math.random().toString(36).substring(2, 9)}`;

// Robust base64 for URLs - using shorthands to keep URLs short
const serializeBoard = (state: BoardState) => {
  try {
    const data = { c: state.classification || [], g: state.grid || {} };
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) { 
    console.error("Failed to serialize board", e);
    return null; 
  }
};

const deserializeBoard = (encoded: string): Partial<BoardState> | null => {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(base64)));
    const data = JSON.parse(json);
    return { 
      classification: data.c || [], 
      grid: data.g || { strategy: {}, mechanics: {}, ux: {}, theme: {} } 
    };
  } catch (e) { 
    console.error("Failed to deserialize board", e);
    return null; 
  }
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [board, setBoard] = useState<BoardState>(() => {
    // 1. Try URL parameters
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('b');
    if (shared) {
      const decoded = deserializeBoard(shared);
      if (decoded) {
        return {
          classification: decoded.classification || [],
          grid: decoded.grid || { strategy: {}, mechanics: {}, ux: {}, theme: {} },
          pool: INITIAL_POOL_CARDS
        } as BoardState;
      }
    }

    // 2. Try LocalStorage
    const saved = localStorage.getItem('tandem_architect_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Correctly map c -> classification and g -> grid from the shorthand used in save
        return {
          classification: parsed.c || [],
          grid: parsed.g || { strategy: {}, mechanics: {}, ux: {}, theme: {} },
          pool: INITIAL_POOL_CARDS,
        };
      } catch (e) {
        console.error("Failed to parse saved board", e);
      }
    }

    // 3. Fallback to default
    return {
      classification: [],
      grid: { strategy: {}, mechanics: {}, ux: {}, theme: {} },
      pool: INITIAL_POOL_CARDS,
    };
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  useEffect(() => {
    localStorage.setItem('tandem_architect_v3', JSON.stringify({ 
      c: board.classification || [], 
      g: board.grid || {} 
    }));
  }, [board.classification, board.grid]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((id: string, currentState: BoardState) => {
    if (id === 'pool' || (currentState.pool && currentState.pool.some(c => c.id === id))) return { row: 'pool' };
    if (id === 'classification' || (currentState.classification && currentState.classification.some(c => c.id === id))) return { row: 'classification' };
    if (id.includes('::')) {
      const [row, col] = id.split('::');
      return { row, col };
    }
    const grid = currentState.grid || {};
    for (const [row, cols] of Object.entries(grid)) {
      for (const [col, cards] of Object.entries(cols)) {
        if (Array.isArray(cards) && cards.some(c => c.id === id)) return { row, col };
      }
    }
    return null;
  }, []);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || isPoolTemplate(active.id as string)) return;
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    setBoard(prev => {
      const activeLoc = findContainer(activeIdStr, prev);
      const overLoc = findContainer(overIdStr, prev);
      if (!activeLoc || !overLoc || (activeLoc.row === overLoc.row && activeLoc.col === overLoc.col)) return prev;

      const activeCard = activeLoc.row === 'classification'
        ? (prev.classification || []).find(c => c.id === activeIdStr)
        : prev.grid[activeLoc.row!]?.[activeLoc.col!]?.find(c => c.id === activeIdStr);

      if (!activeCard) return prev;
      const next = { ...prev, grid: { ...prev.grid }, classification: [...(prev.classification || [])] };
      
      if (activeLoc.row === 'classification') {
        next.classification = next.classification.filter(c => c.id !== activeIdStr);
      } else if (activeLoc.col) {
        next.grid[activeLoc.row!] = { ...next.grid[activeLoc.row!], [activeLoc.col!]: (next.grid[activeLoc.row!][activeLoc.col!] || []).filter(c => c.id !== activeIdStr) };
      }

      if (overLoc.row === 'classification') {
        next.classification.push(activeCard);
      } else if (overLoc.col) {
        next.grid[overLoc.row!] = { ...next.grid[overLoc.row!], [overLoc.col!]: [...(next.grid[overLoc.row!][overLoc.col!] || []), activeCard] };
      }
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const activeIdStr = active.id as string;
    if (!over) { setActiveId(null); return; }

    setBoard(prev => {
      const overLoc = findContainer(over.id as string, prev);
      const next = { ...prev };

      if (isPoolTemplate(activeIdStr)) {
        if (overLoc && overLoc.row !== 'pool') {
          const original = INITIAL_POOL_CARDS.find(c => c.id === activeIdStr);
          if (original) {
            const instance = { ...original, id: generateInstanceId(activeIdStr) };
            if (overLoc.row === 'classification') {
              next.classification = [...(next.classification || []), instance];
            } else if (overLoc.col) {
              const rowGrid = next.grid[overLoc.row!] || {};
              next.grid[overLoc.row!] = { ...rowGrid, [overLoc.col!]: [...(rowGrid[overLoc.col!] || []), instance] };
            }
          }
        }
      } else {
        const activeLoc = findContainer(activeIdStr, prev);
        if (activeLoc && overLoc && activeLoc.row === overLoc.row && activeLoc.col === overLoc.col) {
          if (activeLoc.row === 'classification') {
            const oldIdx = next.classification.findIndex(c => c.id === activeIdStr);
            const newIdx = next.classification.findIndex(c => c.id === (over.id as string));
            next.classification = arrayMove(next.classification, oldIdx, newIdx);
          } else if (activeLoc.col) {
            const cards = [...(next.grid[activeLoc.row!][activeLoc.col!] || [])];
            const oldIdx = cards.findIndex(c => c.id === activeIdStr);
            const newIdx = cards.findIndex(c => c.id === (over.id as string));
            next.grid[activeLoc.row!] = { ...next.grid[activeLoc.row!], [activeLoc.col!]: arrayMove(cards, oldIdx, newIdx) };
          }
        }
      }
      return next;
    });
    setActiveId(null);
  };

  const deleteCard = useCallback((cardId: string, rowId: string, colId?: string) => {
    setBoard(prev => {
      const next = { ...prev, grid: { ...prev.grid }, classification: [...(prev.classification || [])] };
      if (rowId === 'classification') {
        next.classification = next.classification.filter(c => c.id !== cardId);
        Object.keys(next.grid).forEach(r => { 
          if (next.grid[r][cardId]) delete next.grid[r][cardId]; 
        });
      } else if (colId) {
        next.grid[rowId] = { ...next.grid[rowId], [colId]: (next.grid[rowId][colId] || []).filter(c => c.id !== cardId) };
      }
      return next;
    });
  }, []);

  const resetBoard = () => {
    if (!confirm("Clear this entire board?")) return;
    setBoard({
      classification: [],
      grid: { strategy: {}, mechanics: {}, ux: {}, theme: {} },
      pool: INITIAL_POOL_CARDS
    });
    window.history.replaceState({}, '', window.location.pathname);
  };

  const exportJson = () => {
    const data = JSON.stringify({ c: board.classification, g: board.grid }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; 
    a.download = `tandem-board-${new Date().toISOString().split('T')[0]}.json`; 
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const json = JSON.parse(re.target?.result as string);
        if (json.c && json.g) setBoard({ classification: json.c, grid: json.g, pool: INITIAL_POOL_CARDS });
        else if (json.classification && json.grid) setBoard({ classification: json.classification, grid: json.grid, pool: INITIAL_POOL_CARDS });
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const boardCode = useMemo(() => serializeBoard(board), [board]);
  
  const shareLink = useMemo(() => {
    const base = window.location.href.split('?')[0];
    if (boardCode) {
      return `${base}?b=${boardCode}`;
    }
    return base;
  }, [boardCode]);

  const copyToClipboard = async (txt: string, type: 'link' | 'code') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(txt);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = txt;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      prompt("Could not copy automatically. Please copy this code:", txt);
    }
  };

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    if (isPoolTemplate(activeId)) return (INITIAL_POOL_CARDS || []).find(c => c.id === activeId) || null;
    const allCards = [
      ...(board.classification || []), 
      ...Object.values(board.grid || {}).flatMap(r => Object.values(r || {}).flat())
    ];
    return allCards.find(c => c.id === activeId) || null;
  }, [activeId, board]);

  const isBlobPreview = window.location.protocol === 'blob:';

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <header className="sticky top-0 z-[100] bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={resetBoard} className="p-3.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all" title="Reset Board"><FilePlus className="w-6 h-6" /></button>
          <div className="w-px h-10 bg-gray-200 mx-2" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2.5 px-6 py-3 text-xs font-black text-gray-500 hover:bg-gray-100 rounded-[1.2rem] transition-all uppercase tracking-widest border border-gray-100 shadow-sm"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={exportJson} className="flex items-center gap-2.5 px-6 py-3 text-xs font-black text-gray-500 hover:bg-gray-100 rounded-[1.2rem] transition-all uppercase tracking-widest border border-gray-100 shadow-sm"><Download className="w-4 h-4" /> Export</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importJson} className="hidden" />
        </div>

        <TandemLogo />

        <button 
          onClick={() => setShowShareModal(true)} 
          className="flex items-center gap-3 px-10 py-4 bg-[#1e6fb3] text-white rounded-2xl font-black text-[13px] shadow-2xl hover:bg-[#165a94] transition-all uppercase tracking-[0.2em] transform active:scale-95"
        >
          <Share2 className="w-5 h-5" /> Share Game
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-16 custom-scrollbar">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="board-texture p-16 rounded-[5rem] border border-gray-200 flex flex-col gap-12 min-w-fit shadow-2xl relative">
              {CATEGORIES.map(cat => (
                <BoardRow key={cat.id} id={cat.id} label={cat.label} subLabel={cat.subLabel} board={board} onDeleteCard={deleteCard} />
              ))}
            </div>

            <aside className="fixed right-0 top-0 w-80 h-screen bg-white/95 backdrop-blur-xl border-l border-gray-100 shadow-[-15px_0_40px_rgba(0,0,0,0.05)] z-[90] flex flex-col">
              <div className="p-10 border-b border-gray-50">
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Component Pool</h3>
                <p className="text-[11px] text-gray-400 font-medium italic opacity-70">Infinite Architect Palette</p>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4 pb-24">
                <SortableContext items={(board.pool || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {(board.pool || []).map(card => (
                    <DraggableCard key={card.id} id={card.id} text={card.text} />
                  ))}
                </SortableContext>
              </div>
            </aside>

            <DragOverlay dropAnimation={null}>
              {activeCard && (
                <div className="px-10 py-5 bg-white border-2 border-[#1e2d4d] text-[#1e2d4d] rounded-2xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] font-bold transform rotate-6 min-w-[180px] text-center scale-110">
                  {activeCard.text}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </main>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-[200] bg-[#1e2d4d]/70 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-14 relative animate-in zoom-in duration-300">
            <button onClick={() => setShowShareModal(false)} className="absolute top-10 right-10 p-4 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X className="w-7 h-7" /></button>
            
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-black text-[#1e2d4d] mb-3">Share Your Architecture</h2>
              <p className="text-gray-500 font-medium text-lg">Send this board to your team or client.</p>
            </div>

            <div className="space-y-10">
              {isBlobPreview && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Share Preview</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      You are in a preview window. The generated link contains your board data but will only work permanently once you deploy to <strong>GitHub Pages</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="group">
                <div className="flex justify-between items-center mb-4">
                   <label className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-[#1e6fb3] transition-colors">Direct Share Link</label>
                   {isBlobPreview && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Temporary URL</span>}
                </div>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input 
                      readOnly 
                      value={shareLink} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-3xl px-7 py-5 text-sm text-gray-600 outline-none focus:ring-4 focus:ring-[#1e6fb3]/10 pr-12" 
                    />
                    <Link className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  </div>
                  <button 
                    onClick={() => copyToClipboard(shareLink, 'link')} 
                    className={`px-10 rounded-3xl transition-all shadow-xl ${copiedType === 'link' ? 'bg-green-500 text-white' : 'bg-[#1e6fb3] text-white hover:bg-[#165a94] transform active:scale-95'}`}>
                    {copiedType === 'link' ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>
                <p className="mt-4 text-[10px] text-gray-400 italic">This link encodes your board state. Large boards result in longer links.</p>
              </div>

              <div className="p-8 bg-[#f8fafc] rounded-[2.5rem] border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1e6fb3]">Pro Sharing & Backups</label>
                  <span className="text-[10px] bg-[#1e6fb3]/10 text-[#1e6fb3] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Safe</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={exportJson} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-3xl hover:border-[#1e6fb3] hover:shadow-xl transition-all group">
                    <Download className="w-8 h-8 text-gray-400 group-hover:text-[#1e6fb3] mb-3" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600">Save as File</span>
                    <span className="text-[9px] text-gray-400 mt-1">Export to .json</span>
                  </button>
                  
                  <button onClick={() => copyToClipboard(boardCode || '', 'code')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-3xl hover:border-[#1e6fb3] hover:shadow-xl transition-all group">
                    {copiedType === 'code' ? <Check className="w-8 h-8 text-green-500 mb-3" /> : <Copy className="w-8 h-8 text-gray-400 group-hover:text-[#1e6fb3] mb-3" />}
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600">{copiedType === 'code' ? 'Copied!' : 'Copy Code'}</span>
                    <span className="text-[9px] text-gray-400 mt-1">Raw transfer data</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-gray-100 flex justify-center">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm font-black text-gray-400 hover:text-[#1e2d4d] transition-colors uppercase tracking-widest">
                Host permanently on GitHub Pages <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
