
import React from 'react';
import { Card } from './types';

export const COLUMN_COLORS = [
  '#1e6fb3', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

export const INITIAL_POOL_CARDS: Card[] = [
  { id: 'p1', text: 'Game Based Learning' },
  { id: 'p2', text: 'Gamification' },
  { id: 'p3', text: 'Skills Mastery' },
  { id: 'p4', text: 'Retention' },
  { id: 'p5', text: 'Behavior Change' },
  { id: 'p6', text: 'Avatar/Character' },
  { id: 'p7', text: 'Motivation' },
  { id: 'p8', text: 'Points & Badges' },
  { id: 'p9', text: 'Progress Bar' },
  { id: 'p10', text: 'Branching Story' },
  { id: 'p11', text: 'Challenges' },
  { id: 'p12', text: 'Quizzes' },
  { id: 'p13', text: 'Simulations' },
  { id: 'p14', text: 'VR / AR' },
  { id: 'p15', text: 'AI Feedback' },
  { id: 'p16', text: 'Duolingo Streaks' },
  { id: 'p17', text: 'Starbucks Rewards' },
  { id: 'p18', text: 'Competition' },
  { id: 'p19', text: 'Ranking' },
  { id: 'p20', text: 'Social Learning' },
];

export const TandemLogo: React.FC = () => (
  <div className="flex flex-col items-center select-none group cursor-default">
    <h1 className="text-3xl font-black text-[#1e6fb3] tracking-tighter uppercase leading-none group-hover:scale-105 transition-transform">
      Tandem
    </h1>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] mt-1">
      Learning Architect
    </span>
  </div>
);
