import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdatePlayerNameUseCase } from '../../application/use-cases/update-player-name.use-case';
import { AuthGuard } from '../../infrastructure/aop/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthResponseDto, UpdatePlayerNameDto } from '../dtos/auth.dto';

@ApiTags('Player')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('player')
export class PlayerController {
  constructor(private readonly updatePlayerName: UpdatePlayerNameUseCase) {}

  @Patch('me')
  @ApiOperation({ summary: 'Rename the authenticated player' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async renameMe(
    @CurrentUser() userId: string,
    @Body() dto: UpdatePlayerNameDto,
  ): Promise<AuthResponseDto> {
    return this.updatePlayerName.execute({
      userId,
      displayName: dto.displayName,
    });
  }
}
