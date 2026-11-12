import type { ComponentType } from 'react';
import { PREVIEW_MS } from '../config';
import type { AnswerMap, DailyChallenge, RoundId } from '../types';
import { AngleBoard } from './AngleBoard';
import { CenterBoard } from './CenterBoard';
import { DistanceBoard } from './DistanceBoard';
import { HalfBoard } from './HalfBoard';
import { ShapeBoard } from './ShapeBoard';
import type { RoundBoardProps } from './types';

export interface RoundDefinition<K extends RoundId = RoundId> {
  id: K;
  Board: ComponentType<RoundBoardProps<K>>;
  /** Memory rounds show the target once for this many ms before input. */
  previewMs?: number;
  /** Starting answer, or null if the player must place it first. */
  initialAnswer: (c: DailyChallenge) => AnswerMap[K] | null;
}

export const ROUNDS: { [K in RoundId]: RoundDefinition<K> } = {
  center: { id: 'center', Board: CenterBoard, initialAnswer: () => null },
  half: { id: 'half', Board: HalfBoard, initialAnswer: () => null },
  angle: { id: 'angle', Board: AngleBoard, previewMs: PREVIEW_MS.angle, initialAnswer: () => null },
  distance: {
    id: 'distance',
    Board: DistanceBoard,
    initialAnswer: (c) => ({ distance: c.distance.startDistance }),
  },
  shape: {
    id: 'shape',
    Board: ShapeBoard,
    previewMs: PREVIEW_MS.shape,
    initialAnswer: (c) => ({ points: c.shape.start }),
  },
};

export type { RoundBoardProps, RoundMode } from './types';
