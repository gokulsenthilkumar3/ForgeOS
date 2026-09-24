import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { VerificationEntity } from '../entities/verification.entity';

export interface AnalyticsData {
  totalVerifications: number;
  successRate: number;
  averageSolveTime: number;
  botTrafficPercentage: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  challengeTypeStats: {
    arithmetic: number;
    algebra: number;
    logic: number;
    sequence: number;
  };
  attackPatterns: {
    highFrequencyIps: string[];
    suspiciousUserAgents: string[];
    commonFailureReasons: string[];
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  verifications: number;
  successes: number;
  failures: number;
  averageTime: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(VerificationEntity)
    private verificationRepository: Repository<VerificationEntity>,
  ) {}

  async recordVerification(data: {
    challengeId: string;
    difficulty: string;
    success: boolean;
    timeTaken: number;
    riskScore: number;
    challengeType: string;
    ip?: string;
    userAgent?: string;
    confidence?: number;
    intelligenceScore?: number;
    riskLevel?: string;
    behaviorData?: any;
  }): Promise<void> {
    const verification = this.verificationRepository.create({
      ...data,
      challengeId: data.challengeId,
      challengeType: data.challengeType,
      difficulty: data.difficulty,
      confidence: data.confidence || 0,
      intelligenceScore: data.intelligenceScore || 0,
      riskLevel: data.riskLevel || 'low',
      behaviorData: data.behaviorData,
    });

    await this.verificationRepository.save(verification);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const totalVerifications = await this.verificationRepository.count();
    if (totalVerifications === 0) {
      return this.getEmptyAnalytics();
    }

    const successes = await this.verificationRepository.count({ where: { success: true } });
    const successRate = (successes / totalVerifications) * 100;
    
    const avgTimeResult = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('AVG(verification.timeTaken)', 'avg')
      .getRawOne();
    const averageSolveTime = parseFloat(avgTimeResult.avg) || 0;
    
    // Calculate bot traffic percentage (high risk scores)
    const highRiskCount = await this.verificationRepository.count({ where: { riskScore: MoreThanOrEqual(70) } });
    const botTrafficPercentage = (highRiskCount / totalVerifications) * 100;

    // Risk distribution
    const [lowRisk, mediumRisk, highRisk] = await Promise.all([
      this.verificationRepository.count({ where: { riskLevel: 'low' } }),
      this.verificationRepository.count({ where: { riskLevel: 'medium' } }),
      this.verificationRepository.count({ where: { riskLevel: 'high' } }),
    ]);

    // Challenge type statistics
    const [arithmetic, algebra, logic, sequence] = await Promise.all([
      this.verificationRepository.count({ where: { challengeType: 'arithmetic' } }),
      this.verificationRepository.count({ where: { challengeType: 'algebra' } }),
      this.verificationRepository.count({ where: { challengeType: 'logic' } }),
      this.verificationRepository.count({ where: { challengeType: 'sequence' } }),
    ]);

    // Attack patterns
    const attackPatterns = await this.analyzeAttackPatterns();

    return {
      totalVerifications,
      successRate: Math.round(successRate * 100) / 100,
      averageSolveTime: Math.round(averageSolveTime),
      botTrafficPercentage: Math.round(botTrafficPercentage * 100) / 100,
      riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
      challengeTypeStats: { arithmetic, algebra, logic, sequence },
      attackPatterns,
    };
  }

  async getTimeSeriesData(hours: number = 24): Promise<TimeSeriesData[]> {
    const bucketCount = Number.isFinite(hours) ? Math.min(168, Math.max(1, Math.trunc(hours))) : 24;
    const now = new Date();
    const currentHour = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
    const cutoff = new Date(currentHour - (bucketCount - 1) * 3_600_000);
    
    const recentVerifications = await this.verificationRepository
      .createQueryBuilder('verification')
      .where('verification.createdAt >= :cutoff', { cutoff })
      .getMany();
    
    // Use absolute UTC-hour timestamps, not hour-of-day (which collides across days).
    const hourlyData = new Map<number, TimeSeriesData>();

    for (let i = 0; i < bucketCount; i++) {
      const hourKey = cutoff.getTime() + i * 3_600_000;
      hourlyData.set(hourKey, {
        timestamp: new Date(hourKey),
        verifications: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
      });
    }

    recentVerifications.forEach(verification => {
      const hourKey = Math.floor(verification.createdAt.getTime() / 3_600_000) * 3_600_000;
      const hourData = hourlyData.get(hourKey);

      if (hourData) {
        const oldCount = hourData.verifications;
        hourData.averageTime = (hourData.averageTime * oldCount + verification.timeTaken) / (oldCount + 1);
        hourData.verifications++;
        if (verification.success) {
          hourData.successes++;
        } else {
          hourData.failures++;
        }
      }
    });

    return Array.from(hourlyData.values());
  }

  private getEmptyAnalytics(): AnalyticsData {
    return {
      totalVerifications: 0,
      successRate: 0,
      averageSolveTime: 0,
      botTrafficPercentage: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 },
      challengeTypeStats: { arithmetic: 0, algebra: 0, logic: 0, sequence: 0 },
      attackPatterns: {
        highFrequencyIps: [],
        suspiciousUserAgents: [],
        commonFailureReasons: [],
      },
    };
  }

  private async analyzeAttackPatterns() {
    // High frequency IPs
    const ipCounts = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('verification.ip', 'ip')
      .addSelect('COUNT(*)', 'count')
      .where('verification.ip IS NOT NULL')
      .groupBy('verification.ip')
      .having('COUNT(*) > 10')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const highFrequencyIps = ipCounts.map(item => item.ip);

    // Suspicious user agents
    const userAgentCounts = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('verification.userAgent', 'userAgent')
      .addSelect('COUNT(*)', 'count')
      .where('verification.userAgent IS NOT NULL')
      .groupBy('verification.userAgent')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    const suspiciousUserAgents = userAgentCounts
      .filter(item => this.isSuspiciousUserAgent(item.userAgent))
      .map(item => item.userAgent);

    // Common failure reasons (simplified)
    const commonFailureReasons = [
      'Incorrect answer',
      'Timeout',
      'Suspicious behavior',
      'High risk score',
    ];

    return {
      highFrequencyIps,
      suspiciousUserAgents,
      commonFailureReasons,
    };
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}
