import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetGlobalLeaderboardUseCase } from '../../application/use-cases/get-global-leaderboard.use-case';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { SubmitScoreUseCase } from '../../application/use-cases/submit-score.use-case';
import { AuthGuard } from '../../infrastructure/aop/auth.guard';
import { CacheInterceptor } from '../../infrastructure/aop/cache.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  PlayerStandingResponseDto,
  ScoreEntryResponseDto,
  SubmitScoreDto,
} from '../dtos/leaderboard.dto';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly getLeaderboard: GetLeaderboardUseCase,
    private readonly submitScore: SubmitScoreUseCase,
    private readonly getGlobalLeaderboard: GetGlobalLeaderboardUseCase,
  ) {}

  // Not cached: CacheInterceptor keys by req.url only (no auth awareness),
  // and this response is personalized per user via `isMe` — caching it would
  // leak one user's `isMe: true` row into every other user's response for
  // the cache TTL.
  @Get('global')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the global ranking by total mangos' })
  @ApiQuery({
    name: 'top',
    required: false,
    description: 'Number of entries (default 20)',
  })
  @ApiResponse({ status: 200, type: [PlayerStandingResponseDto] })
  async getGlobal(
    @CurrentUser() userId: string,
    @Query('top') top?: string,
  ): Promise<PlayerStandingResponseDto[]> {
    return this.getGlobalLeaderboard.execute({
      top: top ? parseInt(top, 10) : undefined,
      currentUserId: userId,
    });
  }

  @Get()
  @UseInterceptors(new CacheInterceptor(30))
  @ApiOperation({ summary: 'Get top scores for a level' })
  @ApiQuery({ name: 'level', required: true, description: 'Level ID' })
  @ApiQuery({
    name: 'top',
    required: false,
    description: 'Number of entries (default 10)',
  })
  @ApiResponse({ status: 200, type: [ScoreEntryResponseDto] })
  async get(
    @Query('level') levelId: string,
    @Query('top') top?: string,
  ): Promise<ScoreEntryResponseDto[]> {
    return this.getLeaderboard.execute({
      levelId,
      top: top ? parseInt(top, 10) : undefined,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a score to the leaderboard' })
  @ApiResponse({ status: 201, type: ScoreEntryResponseDto })
  async submit(
    @CurrentUser() userId: string,
    @Body() dto: SubmitScoreDto,
  ): Promise<ScoreEntryResponseDto> {
    return this.submitScore.execute({
      userId,
      data: { levelId: dto.levelId, moves: dto.moves, timeMs: dto.timeMs },
    });
  }
}
