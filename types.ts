
export interface Card {
  id: string;
  text: string;
}

export type CategoryId = 'classification' | 'strategy' | 'mechanics' | 'ux' | 'theme' | 'pool';

export interface BoardState {
  classification: Card[];
  // grid[rowId][classificationCardId] = Card[]
  grid: Record<string, Record<string, Card[]>>;
  pool: Card[];
}

export const CATEGORIES: { id: CategoryId; label: string; subLabel?: string }[] = [
  { id: 'classification', label: 'Learning', subLabel: 'Classification' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'ux', label: 'User Experience' },
  { id: 'theme', label: 'Theme', subLabel: '& Example' },
];
