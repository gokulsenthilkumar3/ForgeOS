import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ChallengeModule } from '../challenge/challenge.module';
import { RiskModule } from '../risk/risk.module';
import { TokenModule } from '../token/token.module';
import { BehaviorModule } from '../behavior/behavior.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [ChallengeModule, RiskModule, TokenModule, BehaviorModule, AnalyticsModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
