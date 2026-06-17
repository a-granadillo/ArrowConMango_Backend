import { PlayerProgress } from '../entities/player-progress.entity';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Port (interface)» IProgressRepository
 */
export interface IProgressRepository {
  byUser(userId: UserId): Promise<PlayerProgress | null>;
  save(progress: PlayerProgress): Promise<void>;
}
