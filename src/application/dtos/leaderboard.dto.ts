export interface SubmitScoreInput {
  levelId: string;
  moves: number;
  timeMs: number;
}

export interface ScoreEntryOutput {
  userId: string;
  levelId: string;
  moves: number;
  timeMs: number;
  value: number;
  at: string;
}
