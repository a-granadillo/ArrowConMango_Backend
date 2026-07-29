import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GuestLoginUseCase } from '../../application/use-cases/guest-login.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import {
  GuestLoginDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
} from '../dtos/auth.dto';

// Stricter than the app-wide default (60/min) — credential stuffing and
// guest-token farming both look like a burst of POST /auth/* requests.
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly guestLogin: GuestLoginUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player account' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
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

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guest login: exchange a client UUID for a JWT' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async guest(@Body() dto: GuestLoginDto): Promise<LoginResponseDto> {
    return this.guestLogin.execute({
      uuid: dto.uuid,
      displayName: dto.displayName,
    });
  }
}
