import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from './request-with-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'vaultiq-api',
      audience: 'vaultiq-client',
    });
  }

  /**
   * Called on every request after JWT signature is verified.
   * We re-validate the user still exists and is active in DB
   * so revoked/deleted users are rejected even with a valid token.
   */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists or has been deactivated');
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}
