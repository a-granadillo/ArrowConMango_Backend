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
import {
  NodeDefinition,
  LevelRules,
} from '../../domain/entities/level-definition.entity';
import { AuthGuard } from '../aop/auth.guard';
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
  @ApiParam({ name: 'id', description: 'Level UUID' })
  @ApiResponse({ status: 200, type: LevelResponseDto })
  @ApiResponse({ status: 422, description: 'Level graph validation failed' })
  async upsert(
    @Param('id') id: string,
    @Body() dto: UpsertLevelDto,
  ): Promise<LevelResponseDto> {
    const result = await this.upsertLevel.execute({
      id,
      nodes: dto.nodes as NodeDefinition[],
      edges: dto.edges,
      rules: (dto.rules ?? {}) as LevelRules,
      version: dto.version,
    });
    return result as unknown as LevelResponseDto;
  }
}
