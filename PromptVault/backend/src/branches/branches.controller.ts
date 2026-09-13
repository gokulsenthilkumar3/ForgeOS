import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('prompts/:promptId/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /** GET /prompts/:promptId/branches */
  @Get()
  findAll(@Param('promptId') promptId: string) {
    return this.branchesService.findAll(promptId);
  }

  /** GET /prompts/:promptId/branches/:name */
  @Get(':name')
  findOne(
    @Param('promptId') promptId: string,
    @Param('name') name: string,
  ) {
    return this.branchesService.findOne(promptId, name);
  }

  /** POST /prompts/:promptId/branches */
  @Post()
  create(
    @Param('promptId') promptId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.create(promptId, dto);
  }

  /** POST /prompts/:promptId/branches/:name/rollback/:versionId */
  @Post(':name/rollback/:versionId')
  rollback(
    @Param('promptId') promptId: string,
    @Param('name') name: string,
    @Param('versionId') versionId: string,
  ) {
    return this.branchesService.rollback(promptId, name, versionId);
  }

  /** DELETE /prompts/:promptId/branches/:name */
  @Delete(':name')
  remove(
    @Param('promptId') promptId: string,
    @Param('name') name: string,
  ) {
    return this.branchesService.remove(promptId, name);
  }
}
