import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetGlobalLeaderboardUseCase } from '../../application/use-cases/get-global-leaderboard.use-case';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { SubmitScoreUseCase } from '../../application/use-cases/submit-score.use-case';
import { AuthGuard } from '../aop/auth.guard';
import { CacheInterceptor } from '../aop/cache.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  LevelLeaderboardResponseDto,
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
  //
  // 'global' and 'supervivencia' (added alongside this endpoint) MUST stay
  // declared before the ':nivel' route below — Nest matches routes in
  // declaration order, so a ':nivel' declared first would swallow both as
  // literal level ids.
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

  /** @deprecated Use GET /leaderboard/:nivel — kept for existing frontend clients. */
  @Get()
  @UseInterceptors(new CacheInterceptor(30))
  @ApiOperation({
    summary:
      'Get top scores for a level (deprecated — use GET /leaderboard/:nivel)',
    deprecated: true,
  })
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
    const { top: entries } = await this.getLeaderboard.execute({
      levelId,
      top: top ? parseInt(top, 10) : undefined,
    });
    return entries.map(({ rank, displayName, isMe, ...rest }) => rest);
  }

  @Get(':nivel')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get top scores for a level plus the requesting player's own rank",
  })
  @ApiParam({ name: 'nivel', description: 'Level ID' })
  @ApiQuery({
    name: 'top',
    required: false,
    description: 'Number of entries (default 10)',
  })
  @ApiResponse({ status: 200, type: LevelLeaderboardResponseDto })
  async getByLevel(
    @CurrentUser() userId: string,
    @Param('nivel') levelId: string,
    @Query('top') top?: string,
  ): Promise<LevelLeaderboardResponseDto> {
    return this.getLeaderboard.execute({
      levelId,
      top: top ? parseInt(top, 10) : undefined,
      currentUserId: userId,
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
      data: {
        levelId: dto.levelId,
        moves: dto.moves,
        timeMs: dto.timeMs,
        mode: dto.mode,
      },
    });
  }
}
