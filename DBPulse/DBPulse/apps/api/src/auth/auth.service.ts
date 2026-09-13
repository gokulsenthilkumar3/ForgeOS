import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly supabase;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  /** Sign in via Supabase auth — returns our own JWT for API use */
  async signIn(email: string, password: string): Promise<{ accessToken: string; expiresIn: number }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: data.user.id,
      email: data.user.email ?? email,
      role: data.user.role ?? 'authenticated',
    };

    return {
      accessToken: this.jwt.sign(payload),
      expiresIn: 86400,
    };
  }

  /** Verify a token and return payload — used by JwtStrategy */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  signToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }
}
