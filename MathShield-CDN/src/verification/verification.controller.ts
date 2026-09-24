import { Controller, Post, Body, HttpException, HttpStatus, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VerificationService, VerificationRequest, VerificationResult } from './verification.service';
import { TokenService, TokenPayload } from '../token/token.service';
import { Public } from '../common/guards/api-key.guard';

@Controller('api/verification')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('verify')
  @Public()
  async verifyResponse(@Body() request: VerificationRequest, @Req() httpRequest: Request): Promise<VerificationResult> {
    try {
      return await this.verificationService.verifyResponse(request, {
        ip: httpRequest.ip,
        userAgent: httpRequest.get('user-agent')?.slice(0, 512),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Challenge not found or expired') {
        throw new HttpException('Challenge not found or expired', HttpStatus.NOT_FOUND);
      }
      if (error instanceof HttpException) throw error;
      console.error('[Verification Error]', error);
      throw new HttpException('Verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify a JWT token (for backend validation without calling the challenge API)
   */
  @Post('verify-token')
  async verifyToken(@Body() body: { token: string }): Promise<TokenPayload> {
    try {
      return await this.tokenService.verifyToken(body.token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Decode a token without verifying (for inspection purposes)
   */
  @Post('decode-token')
  decodeToken(@Body() body: { token: string }): TokenPayload | null {
    return this.tokenService.decodeToken(body.token);
  }
}
