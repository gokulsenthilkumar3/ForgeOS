import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tier: string;
    salt: string;
    totpEnabled: boolean;
    autoLockMinutes: number;
    themePreference: string;
  };
}

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  async register(
    email: string,
    fullName: string,
    masterPassword: string,
  ): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (masterPassword.length < 12) {
      throw new BadRequestException('Master password must be at least 12 characters');
    }

    const masterPasswordHash = await bcrypt.hash(masterPassword, this.BCRYPT_ROUNDS);
    const salt = randomBytes(16).toString('hex'); // client-side key derivation salt
    const recoveryCode = randomBytes(10).toString('hex').toUpperCase();
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        masterPasswordHash,
        salt,
        recoveryCodeHash,
        role: 'USER',
        tier: 'FREE',
      },
    });

    // Create default collections
    await this.prisma.vaultCollection.createMany({
      data: [
        { userId: user.id, name: 'Login Credentials', icon: '🔑', isDefault: true, sortOrder: 0 },
        { userId: user.id, name: 'Financial', icon: '💳', isDefault: false, sortOrder: 1 },
        { userId: user.id, name: 'Work', icon: '💼', isDefault: false, sortOrder: 2 },
        { userId: user.id, name: 'Social Media', icon: '📱', isDefault: false, sortOrder: 3 },
      ],
    });

    await this.logAudit(user.id, 'LOGIN', null);

    const response = await this.issueTokens(user);
    return {
      ...response,
      // Send recovery code once — user must save it
      user: { ...response.user, recoveryCode } as any,
    };
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  async login(email: string, masterPassword: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Constant-time fail to prevent enumeration
      await bcrypt.hash(masterPassword, this.BCRYPT_ROUNDS);
      throw new UnauthorizedException('Invalid email or master password');
    }

    const valid = await bcrypt.compare(masterPassword, user.masterPasswordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or master password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAudit(user.id, 'LOGIN', null);
    return this.issueTokens(user);
  }

  // -------------------------------------------------------------------------
  // Token refresh (rotation)
  // -------------------------------------------------------------------------

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid, expired, or already used');
    }

    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revoked: true },
    });

    const user = stored.user;
    const access_token = this.jwtService.sign(this.buildPayload(user), {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    const newRaw = this.generateRawRefreshToken();
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(newRaw), expiresAt },
    });

    return { access_token, refresh_token: newRaw, expires_in: this.ACCESS_TOKEN_TTL };
  }

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  async revokeAllTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    await this.logAudit(userId, 'LOGOUT', null);
  }

  // -------------------------------------------------------------------------
  // Recovery
  // -------------------------------------------------------------------------

  async recoverAccount(
    email: string,
    recoveryCode: string,
    newMasterPassword: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.recoveryCodeHash) {
      throw new UnauthorizedException('Invalid recovery code');
    }

    const valid = await bcrypt.compare(recoveryCode.toUpperCase(), user.recoveryCodeHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid recovery code');
    }

    if (newMasterPassword.length < 12) {
      throw new BadRequestException('Master password must be at least 12 characters');
    }

    const newHash = await bcrypt.hash(newMasterPassword, this.BCRYPT_ROUNDS);
    const newSalt = randomBytes(16).toString('hex');
    const newRecoveryCode = randomBytes(10).toString('hex').toUpperCase();
    const newRecoveryHash = await bcrypt.hash(newRecoveryCode, this.BCRYPT_ROUNDS);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { masterPasswordHash: newHash, salt: newSalt, recoveryCodeHash: newRecoveryHash },
    });

    await this.logAudit(user.id, 'RECOVERY_CODE_USED', null);

    const response = await this.issueTokens(updated);
    return { ...response, user: { ...response.user, newRecoveryCode } as any };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private buildPayload(user: { id: string; email: string; role: string }) {
    return { email: user.email, sub: user.id, role: user.role };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateRawRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private async issueTokens(user: any): Promise<AuthResponse> {
    const payload = this.buildPayload(user);
    const access_token = this.jwtService.sign(payload, { expiresIn: this.ACCESS_TOKEN_TTL });
    const rawRefresh = this.generateRawRefreshToken();
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(rawRefresh), expiresAt },
    });

    return {
      access_token,
      refresh_token: rawRefresh,
      expires_in: this.ACCESS_TOKEN_TTL,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tier: user.tier,
        salt: user.salt,
        totpEnabled: user.totpEnabled,
        autoLockMinutes: user.autoLockMinutes,
        themePreference: user.themePreference,
      },
    };
  }

  private async logAudit(userId: string, action: string, entryId: string | null) {
    await this.prisma.securityAuditLog.create({
      data: { userId, action: action as any, entryId },
    });
  }
}
