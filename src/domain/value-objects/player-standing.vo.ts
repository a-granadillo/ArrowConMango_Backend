/**
 * «Value Object» PlayerStanding — one row of the global leaderboard.
 */
export class PlayerStanding {
  private constructor(
    private readonly _userId: string,
    private readonly _displayName: string,
    private readonly _mangos: number,
    private readonly _levelsCompleted: number,
  ) {}

  static create(
    userId: string,
    displayName: string,
    mangos: number,
    levelsCompleted: number,
  ): PlayerStanding {
    return new PlayerStanding(userId, displayName, mangos, levelsCompleted);
  }

  get userId(): string {
    return this._userId;
  }

  get displayName(): string {
    return this._displayName;
  }

  get mangos(): number {
    return this._mangos;
  }

  get levelsCompleted(): number {
    return this._levelsCompleted;
  }
}
