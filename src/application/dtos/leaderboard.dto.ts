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

export interface GetGlobalLeaderboardInput {
  top?: number;
  /** The requesting user's id, if authenticated — used to flag `isMe`. */
  currentUserId?: string;
}

export interface PlayerStandingOutput {
  rank: number;
  userId: string;
  displayName: string;
  mangos: number;
  levelsCompleted: number;
  isMe: boolean;
}
