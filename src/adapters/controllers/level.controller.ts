import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLevelUseCase } from '../../application/use-cases/create-level.use-case';
import { GetCommunityLevelsUseCase } from '../../application/use-cases/get-community-levels.use-case';
import { GetLevelsUseCase } from '../../application/use-cases/get-levels.use-case';
import { GetMyLevelsUseCase } from '../../application/use-cases/get-my-levels.use-case';
import { PublishLevelUseCase } from '../../application/use-cases/publish-level.use-case';
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
    private readonly createLevel: CreateLevelUseCase,
    private readonly publishLevel: PublishLevelUseCase,
    private readonly getCommunityLevels: GetCommunityLevelsUseCase,
    private readonly getMyLevels: GetMyLevelsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the campaign level catalogue' })
  @ApiResponse({ status: 200, type: [LevelResponseDto] })
  async getAll(): Promise<LevelResponseDto[]> {
    const result = await this.getLevels.execute();
    return result as unknown as LevelResponseDto[];
  }

  @Get('community')
  @ApiOperation({ summary: 'Get published community levels' })
  @ApiQuery({ name: 'top', required: false, type: Number })
  @ApiResponse({ status: 200, type: [LevelResponseDto] })
  async getCommunity(@Query('top') top?: string): Promise<LevelResponseDto[]> {
    const result = await this.getCommunityLevels.execute({
      top: top ? Number(top) : undefined,
    });
    return result as unknown as LevelResponseDto[];
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get every level (draft or published) authored by the caller',
  })
  @ApiResponse({ status: 200, type: [LevelResponseDto] })
  async getMine(@CurrentUser() userId: string): Promise<LevelResponseDto[]> {
    const result = await this.getMyLevels.execute({ authorId: userId });
    return result as unknown as LevelResponseDto[];
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new community level draft' })
  @ApiResponse({ status: 201, type: LevelResponseDto })
  @ApiResponse({ status: 422, description: 'Level validation failed' })
  async create(
    @Body() dto: UpsertLevelDto,
    @CurrentUser() userId: string,
  ): Promise<LevelResponseDto> {
    const result = await this.createLevel.execute({
      name: dto.name,
      difficulty: dto.difficulty,
      boardSize: dto.boardSize,
      arrows: dto.arrows,
      rules: dto.rules ?? {},
      authorId: userId,
    });
    return result as unknown as LevelResponseDto;
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Edit the caller's own unpublished draft" })
  @ApiParam({ name: 'id', description: 'Level id' })
  @ApiResponse({ status: 200, type: LevelResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Not the level author, or the level is a campaign level',
  })
  @ApiResponse({ status: 409, description: 'The level is already published' })
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

  @Post(':id/publish')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publish the caller's own draft (irreversible)" })
  @ApiParam({ name: 'id', description: 'Level id' })
  @ApiResponse({ status: 201, type: LevelResponseDto })
  @ApiResponse({ status: 403, description: 'Not the level author' })
  @ApiResponse({ status: 409, description: 'Already published' })
  async publish(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<LevelResponseDto> {
    const result = await this.publishLevel.execute({
      levelId: id,
      authorId: userId,
    });
    return result as unknown as LevelResponseDto;
  }
}
