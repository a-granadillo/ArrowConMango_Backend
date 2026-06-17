export interface SyncProgressInput {
  completed: string[];
  best: Record<string, { moves: number; timeMs: number }>;
}

export interface ProgressOutput {
  userId: string;
  completed: string[];
  best: Record<string, { moves: number; timeMs: number; value: number }>;
}
