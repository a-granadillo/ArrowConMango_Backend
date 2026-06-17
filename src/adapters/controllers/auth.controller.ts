import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { AuthResponseDto, LoginDto, LoginResponseDto, RegisterDto } from '../dtos/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      username: dto.username,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive a JWT token' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginHandler(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.login.execute({ email: dto.email, password: dto.password });
  }
}
