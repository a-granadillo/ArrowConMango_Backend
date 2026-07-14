export interface SyncProgressInput {
  completed: string[];
  best: Record<string, { moves: number; timeMs: number }>;
  currentLevel?: number;
}

export interface ProgressOutput {
  userId: string;
  completed: string[];
  best: Record<string, { moves: number; timeMs: number; value: number }>;
  currentLevel: number;
}
