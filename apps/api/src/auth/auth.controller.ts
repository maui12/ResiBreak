import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/roles.js';
import {AuthService} from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 intentos por minuto
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
        return this.auth.login(dto.rut, dto.password);
  }
}
