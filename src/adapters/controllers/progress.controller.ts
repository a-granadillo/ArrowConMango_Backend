import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetProgressUseCase } from '../../application/use-cases/get-progress.use-case';
import { SyncProgressUseCase } from '../../application/use-cases/sync-progress.use-case';
import { AuthGuard } from '../../infrastructure/aop/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ProgressResponseDto, SyncProgressDto } from '../dtos/progress.dto';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(
    private readonly getProgress: GetProgressUseCase,
    private readonly syncProgress: SyncProgressUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated player's progress" })
  @ApiResponse({ status: 200, type: ProgressResponseDto })
  async get(@CurrentUser() userId: string): Promise<ProgressResponseDto> {
    return this.getProgress.execute(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Sync progress from client (idempotent)' })
  @ApiResponse({ status: 200, type: ProgressResponseDto })
  async sync(
    @CurrentUser() userId: string,
    @Body() dto: SyncProgressDto,
  ): Promise<ProgressResponseDto> {
    return this.syncProgress.execute({
      userId,
      data: { completed: dto.completed, best: dto.best },
    });
  }
}
