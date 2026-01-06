
import React from 'react';
import { Card } from './types';

export const COLUMN_COLORS = [
  '#1e6fb3', // Original Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#84cc16', // Lime
];

export const INITIAL_CARDS: Card[] = [
  { id: 'c1', text: 'Game Based Learning' },
  { id: 'c2', text: 'Gamification' },
  { id: 'c3', text: 'Skills Mastery' },
  { id: 'c4', text: 'Retention' },
  { id: 'c5', text: 'Behavior Change' },
  { id: 'c6', text: 'Avatar/Character' },
  { id: 'c7', text: 'Motivation' },
  { id: 'c8', text: 'Points & Badges' },
  { id: 'c9', text: 'Progress Bar' },
  { id: 'c10', text: 'Branching Story' },
  { id: 'c11', text: 'Challenges' },
  { id: 'c12', text: 'Quizzes' },
  { id: 'c13', text: 'Learning By Failure' },
  { id: 'c14', text: 'Competition' },
  { id: 'c15', text: 'Ranking' },
  { id: 'c16', text: 'Decisions' },
  { id: 'c17', text: 'VR' },
  { id: 'c18', text: 'AR' },
  { id: 'c19', text: 'AI' },
  { id: 'c23', text: 'Lego Serious Play' },
  { id: 'c25', text: 'Flight Simulator' },
  { id: 'c26', text: 'SimCity Game' },
  { id: 'c27', text: 'Starbucks Rewards' },
  { id: 'c28', text: 'LinkedIn Profile Strength' },
  { id: 'c29', text: 'Flight Miles Program' },
];

export const TandemLogo: React.FC = () => (
  <div className="flex justify-center items-center py-4">
    <h1 className="text-3xl md:text-4xl font-extrabold text-[#1e6fb3] tracking-tight text-center">
      Tandem Interactive Learning Board
    </h1>
  </div>
);
