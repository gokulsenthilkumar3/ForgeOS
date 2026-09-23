import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ChallengeService, Challenge, ChallengeRequest } from './challenge.service';
import { Public } from '../common/guards/api-key.guard';

@Controller('api/challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post('generate')
  @Public()
  async generateChallenge(@Body() request: ChallengeRequest): Promise<Omit<Challenge, 'answer'>> {
    try {
      const { answer: _answer, ...publicChallenge } = await this.challengeService.generateChallenge(request);
      return publicChallenge;
    } catch (error) {
      throw new HttpException('Failed to generate challenge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Public()
  async getChallenge(@Param('id') id: string): Promise<Omit<Challenge, 'answer'>> {
    const challenge = await this.challengeService.getChallengeById(id);
    if (!challenge) {
      throw new HttpException('Challenge not found', HttpStatus.NOT_FOUND);
    }
    const { answer: _answer, ...publicChallenge } = challenge;
    return publicChallenge;
  }
}
