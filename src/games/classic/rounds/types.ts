import type { AnswerMap, DailyChallenge, RoundId, RoundResult } from '../types';

export type RoundMode = 'ready' | 'preview' | 'input' | 'result';

export interface RoundBoardProps<K extends RoundId> {
  challenge: DailyChallenge;
  mode: RoundMode;
  answer: AnswerMap[K] | null;
  onChange: (answer: AnswerMap[K]) => void;
  onSubmit: () => void;
  result: RoundResult | null;
}
