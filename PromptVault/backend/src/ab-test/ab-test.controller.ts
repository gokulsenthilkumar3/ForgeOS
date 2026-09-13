import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AbTestService } from './ab-test.service';
import { CreateAbTestDto } from './dto/create-ab-test.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('prompts/:promptId/ab-tests')
export class AbTestController {
  constructor(private readonly abTestService: AbTestService) {}

  /** POST /prompts/:promptId/ab-tests — run a new A/B test */
  @Post()
  run(
    @Param('promptId') promptId: string,
    @Body() dto: CreateAbTestDto,
    @CurrentUser() user: any,
  ) {
    return this.abTestService.run(promptId, dto, user.id);
  }

  /** GET /prompts/:promptId/ab-tests — list all tests for a prompt */
  @Get()
  findAll(@Param('promptId') promptId: string) {
    return this.abTestService.findAll(promptId);
  }

  /** GET /prompts/:promptId/ab-tests/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.abTestService.findOne(id);
  }

  /** PATCH /prompts/:promptId/ab-tests/:id/winner — mark winner */
  @Patch(':id/winner')
  setWinner(
    @Param('id') id: string,
    @Body('winner') winner: 'a' | 'b' | 'tie',
  ) {
    return this.abTestService.setWinner(id, winner);
  }
}
