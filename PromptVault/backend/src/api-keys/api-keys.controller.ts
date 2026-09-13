import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { UpsertApiKeyDto } from './dto/upsert-api-key.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /** GET /api-keys — list stored keys (hints only, never raw keys) */
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.apiKeysService.findAll(user.id);
  }

  /** POST /api-keys — save or update an API key */
  @Post()
  upsert(@Body() dto: UpsertApiKeyDto, @CurrentUser() user: any) {
    return this.apiKeysService.upsert(user.id, dto.provider, dto.api_key);
  }

  /** DELETE /api-keys/:provider — remove an API key */
  @Delete(':provider')
  remove(@Param('provider') provider: string, @CurrentUser() user: any) {
    return this.apiKeysService.remove(user.id, provider);
  }
}
