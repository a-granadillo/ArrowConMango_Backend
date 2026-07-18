import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const CARDINAL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
const HEX_DIRECTIONS = ['n', 'ne', 'se', 's', 'sw', 'nw'] as const;
const BOARD_SHAPES = ['grid2d', 'hex'] as const;

/**
 * Rectangular boards carry {rows, cols}; hexagonal boards carry {radius}
 * instead — the two are mutually exclusive, discriminated by the level's
 * `shape` field (see UpsertLevelDto.shape).
 */
export class BoardSizeDto {
  @ApiPropertyOptional({ description: 'Required when shape is "grid2d"' })
  @ValidateIf((o: BoardSizeDto) => o.radius === undefined)
  @IsInt()
  @Min(1)
  rows?: number;

  @ApiPropertyOptional({ description: 'Required when shape is "grid2d"' })
  @ValidateIf((o: BoardSizeDto) => o.radius === undefined)
  @IsInt()
  @Min(1)
  cols?: number;

  @ApiPropertyOptional({ description: 'Required when shape is "hex"' })
  @ValidateIf((o: BoardSizeDto) => o.rows === undefined)
  @IsInt()
  @Min(0)
  radius?: number;
}

/**
 * Rectangular nodes carry {row, col}; hexagonal (axial) nodes carry {q, r}
 * instead — mutually exclusive, per the level's `shape`.
 */
export class BoardNodeDto {
  @ApiPropertyOptional({ description: 'Required when shape is "grid2d"' })
  @ValidateIf((o: BoardNodeDto) => o.q === undefined)
  @IsInt()
  row?: number;

  @ApiPropertyOptional({ description: 'Required when shape is "grid2d"' })
  @ValidateIf((o: BoardNodeDto) => o.r === undefined)
  @IsInt()
  col?: number;

  @ApiPropertyOptional({ description: 'Required when shape is "hex"' })
  @ValidateIf((o: BoardNodeDto) => o.row === undefined)
  @IsInt()
  q?: number;

  @ApiPropertyOptional({ description: 'Required when shape is "hex"' })
  @ValidateIf((o: BoardNodeDto) => o.col === undefined)
  @IsInt()
  r?: number;
}

export class TrajectorySegmentDto {
  @ApiProperty({ enum: [...CARDINAL_DIRECTIONS, ...HEX_DIRECTIONS] })
  @IsIn([...CARDINAL_DIRECTIONS, ...HEX_DIRECTIONS])
  direction!:
    (typeof CARDINAL_DIRECTIONS)[number] | (typeof HEX_DIRECTIONS)[number];

  @ApiProperty()
  @IsInt()
  @Min(1)
  length!: number;
}

export class TrajectoryDto {
  @ApiProperty({ type: [TrajectorySegmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrajectorySegmentDto)
  segments!: TrajectorySegmentDto[];
}

export class ArrowDefinitionDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => BoardNodeDto)
  startNode!: BoardNodeDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TrajectoryDto)
  trajectory!: TrajectoryDto;

  @ApiProperty()
  @IsBoolean()
  isSwitchable!: boolean;
}

export class LevelRulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeLimitSeconds?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxMistakes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRotation?: boolean | null;
}

export class UpsertLevelDto {
  @ApiPropertyOptional({
    description: 'Level ID. Generated if omitted.',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  difficulty!: string;

  @ApiPropertyOptional({
    description: 'Board coordinate system (defaults to "grid2d")',
    enum: BOARD_SHAPES,
  })
  @IsOptional()
  @IsIn(BOARD_SHAPES)
  shape?: (typeof BOARD_SHAPES)[number];

  @ApiProperty()
  @ValidateNested()
  @Type(() => BoardSizeDto)
  boardSize!: BoardSizeDto;

  @ApiProperty({ type: [ArrowDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArrowDefinitionDto)
  arrows!: ArrowDefinitionDto[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  rules?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  version?: number;
}

export class LevelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  difficulty!: string;

  @ApiProperty({ enum: BOARD_SHAPES })
  shape!: (typeof BOARD_SHAPES)[number];

  @ApiProperty()
  boardSize!: { rows?: number; cols?: number; radius?: number };

  @ApiProperty()
  arrows!: unknown[];

  @ApiProperty()
  rules!: Record<string, unknown>;

  @ApiProperty()
  version!: number;

  @ApiProperty({ nullable: true })
  authorId!: string | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty({ nullable: true })
  publishedAt!: Date | null;
}
