import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetLevelsUseCase } from '../../application/use-cases/get-levels.use-case';
import { UpsertLevelUseCase } from '../../application/use-cases/upsert-level.use-case';
import { AuthGuard } from '../aop/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LevelResponseDto, UpsertLevelDto } from '../dtos/level.dto';

@ApiTags('Levels')
@Controller('levels')
export class LevelController {
  constructor(
    private readonly getLevels: GetLevelsUseCase,
    private readonly upsertLevel: UpsertLevelUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all available levels' })
  @ApiResponse({ status: 200, type: [LevelResponseDto] })
  async getAll(): Promise<LevelResponseDto[]> {
    const result = await this.getLevels.execute();
    return result as unknown as LevelResponseDto[];
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a level definition (admin)' })
  @ApiParam({ name: 'id', description: 'Level id' })
  @ApiResponse({ status: 200, type: LevelResponseDto })
  @ApiResponse({ status: 422, description: 'Level validation failed' })
  async upsert(
    @Param('id') id: string,
    @Body() dto: UpsertLevelDto,
    @CurrentUser() userId: string,
  ): Promise<LevelResponseDto> {
    const result = await this.upsertLevel.execute({
      id,
      name: dto.name,
      difficulty: dto.difficulty,
      boardSize: dto.boardSize,
      arrows: dto.arrows,
      rules: dto.rules ?? {},
      version: dto.version,
      authorId: userId,
    });
    return result as unknown as LevelResponseDto;
  }
}
