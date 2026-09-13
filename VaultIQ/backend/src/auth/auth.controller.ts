import {
  Body,
  Controller,
  Post,
  Get,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  masterPassword!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  masterPassword!: string;
}

class RefreshDto {
  @IsString()
  refresh_token!: string;
}

class RecoverDto {
  @IsEmail()
  email!: string;

  @IsString()
  recoveryCode!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newMasterPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.fullName, dto.masterPassword);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.masterPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('recover')
  @HttpCode(HttpStatus.OK)
  async recover(@Body() dto: RecoverDto) {
    return this.authService.recoverAccount(dto.email, dto.recoveryCode, dto.newMasterPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    await this.authService.revokeAllTokens(req.user.userId);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return { userId: req.user.userId, email: req.user.email, role: req.user.role };
  }
}
