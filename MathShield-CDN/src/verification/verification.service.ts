import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ChallengeService, Challenge } from '../challenge/challenge.service';
import { RiskService } from '../risk/risk.service';
import { TokenService, VerificationToken } from '../token/token.service';
import { BehaviorService, BehaviorData } from '../behavior/behavior.service';
import { AnalyticsService } from '../analytics/analytics.service';

export { BehaviorData } from '../behavior/behavior.service';

export interface VerificationRequest {
  challengeId: string;
  answer: string | number;
  timeTaken: number; // in milliseconds
  behaviorData?: BehaviorData;
  riskFactors?: any;
}

export interface RequestIdentity { ip?: string; userAgent?: string }

export interface VerificationResult {
  success: boolean;
  confidence: number; // 0-100
  intelligenceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  feedback: {
    correct: boolean;
    timeBonus: number;
    behaviorBonus: number;
    riskPenalty: number;
  };
  reasoning: string[];
  adaptiveIntelligenceScore: {
    score: number;
    confidence: number;
    riskLevel: string;
    expiresAt: Date;
  };
  token?: VerificationToken; // JWT token for backend verification
  explanation?: string; // Educational explanation of the answer
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  constructor(
    private readonly challengeService: ChallengeService,
    private readonly riskService: RiskService,
    private readonly tokenService: TokenService,
    private readonly behaviorService: BehaviorService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async verifyResponse(request: VerificationRequest, identity: RequestIdentity = {}): Promise<VerificationResult> {
    if (!request || typeof request.challengeId !== 'string' || !request.challengeId.trim() ||
        (typeof request.answer !== 'string' && typeof request.answer !== 'number') ||
        !String(request.answer).trim() || !Number.isFinite(request.timeTaken) || request.timeTaken < 0) {
      throw new BadRequestException('Valid challengeId, answer and timeTaken are required');
    }
    // Get the challenge
    const challenge = await this.challengeService.getChallengeById(request.challengeId);
    if (!challenge) {
      throw new Error('Challenge not found or expired');
    }

    // Verify challenge signature to prevent tampering
    if (challenge.signature) {
      const isValidSignature = this.tokenService.verifyChallengeSignature(
        challenge.id,
        challenge.type,
        challenge.difficulty,
        challenge.signature
      );
      if (!isValidSignature) {
        throw new UnauthorizedException('Challenge signature verification failed - possible tampering detected');
      }
    }

    // Calculate base correctness
    const isCorrect = this.checkAnswer(challenge, request.answer);
    
    // Calculate time-based scoring
    const timeScore = this.calculateTimeScore(challenge, request.timeTaken);
    
    // Calculate behavior-based scoring via BehaviorService
    const behaviorAnalysis = this.behaviorService.analyze(request.behaviorData);
    const behaviorScore = behaviorAnalysis.score;
    
    // Calculate risk-based adjustment
    let riskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (request.riskFactors || identity.ip || identity.userAgent) {
      const riskAnalysis = this.riskService.calculateRiskScore({ ...request.riskFactors, ip: identity.ip, userAgent: identity.userAgent });
      riskScore = riskAnalysis.score;
      riskLevel = riskAnalysis.level;
    }

    // Calculate overall confidence and intelligence scores
    const baseConfidence = isCorrect ? 60 : 20;
    const timeBonus = timeScore * 0.2;
    const behaviorBonus = behaviorScore * 0.15;
    const riskPenalty = riskScore * 0.05;

    const confidence = Math.min(100, Math.max(0, 
      baseConfidence + timeBonus + behaviorBonus - riskPenalty
    ));

    const intelligenceScore = this.calculateIntelligenceScore(
      challenge,
      isCorrect,
      request.timeTaken,
      behaviorScore,
      riskScore
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      isCorrect,
      timeScore,
      behaviorScore,
      riskScore,
      challenge
    );

    // Generate adaptive intelligence score
    const adaptiveScore = this.generateAdaptiveIntelligenceScore(
      intelligenceScore,
      confidence,
      riskLevel
    );

    // Clean up challenge
    await this.challengeService.removeChallenge(request.challengeId);

    // Generate JWT token for successful verifications
    let token: VerificationToken | undefined;
    if (isCorrect && confidence > 50) {
      token = await this.tokenService.generateVerificationToken(
        challenge.id,
        challenge.type,
        challenge.difficulty,
        Math.round(intelligenceScore),
        Math.round(confidence),
        riskLevel
      );
    }

    try {
      await this.analyticsService.recordVerification({
        challengeId: challenge.id,
        challengeType: challenge.type,
        difficulty: challenge.difficulty,
        success: isCorrect && confidence > 50,
        timeTaken: request.timeTaken,
        riskScore,
        riskLevel,
        confidence: Math.round(confidence),
        intelligenceScore: Math.round(intelligenceScore),
        behaviorData: request.behaviorData,
        ip: identity.ip,
        userAgent: identity.userAgent,
      });
    } catch (error) {
      // Do not turn a completed, consumed challenge into a false failure.
      this.logger.error('Could not record verification analytics', error instanceof Error ? error.stack : String(error));
    }

    return {
      success: isCorrect && confidence > 50,
      confidence: Math.round(confidence),
      intelligenceScore: Math.round(intelligenceScore),
      riskLevel,
      feedback: {
        correct: isCorrect,
        timeBonus: Math.round(timeBonus),
        behaviorBonus: Math.round(behaviorBonus),
        riskPenalty: Math.round(riskPenalty),
      },
      reasoning,
      adaptiveIntelligenceScore: adaptiveScore,
      token,
      explanation: challenge.explanation,
    };
  }

  private checkAnswer(challenge: Challenge, answer: string | number): boolean {
    const correctAnswer = challenge.answer.toString().toLowerCase().trim();
    const userAnswer = answer.toString().toLowerCase().trim();
    
    // Exact match for numbers
    if (!isNaN(Number(correctAnswer)) && !isNaN(Number(userAnswer))) {
      return Math.abs(parseFloat(correctAnswer) - parseFloat(userAnswer)) < 0.01;
    }
    
    // String match with tolerance
    return correctAnswer === userAnswer;
  }

  private calculateTimeScore(challenge: Challenge, timeTaken: number): number {
    const timeLimit = challenge.timeLimit * 1000; // Convert to milliseconds
    const optimalTime = timeLimit * 0.6; // 60% of time limit is optimal
    
    if (timeTaken <= optimalTime) {
      return 100; // Perfect timing
    } else if (timeTaken <= timeLimit) {
      // Linear decrease from optimal to time limit
      const ratio = (timeTaken - optimalTime) / (timeLimit - optimalTime);
      return 100 - (ratio * 50); // Down to 50
    } else {
      // Over time limit - exponential decrease
      const overTime = timeTaken - timeLimit;
      const ratio = overTime / timeLimit;
      return Math.max(0, 50 - (ratio * 50));
    }
  }

  private calculateIntelligenceScore(
    challenge: Challenge,
    isCorrect: boolean,
    timeTaken: number,
    behaviorScore: number,
    riskScore: number
  ): number {
    let score = 0;

    // Base points for difficulty
    score += challenge.points * 10;

    // Correctness bonus
    if (isCorrect) {
      score += 30;
    }

    // Time bonus (faster = smarter)
    const timeRatio = timeTaken / (challenge.timeLimit * 1000);
    if (timeRatio < 0.5) score += 20;
    else if (timeRatio < 0.8) score += 10;

    // Behavior bonus
    score += (behaviorScore / 100) * 15;

    // Risk penalty
    score -= (riskScore / 100) * 10;

    return Math.min(100, Math.max(0, score));
  }

  private generateReasoning(
    isCorrect: boolean,
    timeScore: number,
    behaviorScore: number,
    riskScore: number,
    challenge: Challenge
  ): string[] {
    const reasoning: string[] = [];

    if (isCorrect) {
      reasoning.push('Answer is correct');
    } else {
      reasoning.push('Answer is incorrect');
    }

    if (timeScore > 80) {
      reasoning.push('Excellent timing');
    } else if (timeScore > 60) {
      reasoning.push('Good timing');
    } else if (timeScore < 30) {
      reasoning.push('Unusual timing pattern');
    }

    if (behaviorScore > 80) {
      reasoning.push('Natural human behavior');
    } else if (behaviorScore > 60) {
      reasoning.push('Mostly natural behavior');
    } else if (behaviorScore < 40) {
      reasoning.push('Suspicious behavior patterns');
    }

    if (riskScore > 70) {
      reasoning.push('High risk factors detected');
    } else if (riskScore > 40) {
      reasoning.push('Moderate risk factors');
    }

    return reasoning;
  }

  private generateAdaptiveIntelligenceScore(
    intelligenceScore: number,
    confidence: number,
    riskLevel: 'low' | 'medium' | 'high'
  ) {
    // Score valid for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      score: intelligenceScore,
      confidence: confidence,
      riskLevel: riskLevel,
      expiresAt: expiresAt,
    };
  }
}
