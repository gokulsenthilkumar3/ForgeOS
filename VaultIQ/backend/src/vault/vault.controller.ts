import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';
import { VaultService } from './vault.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

enum VaultEntryType {
  PASSWORD = 'PASSWORD',
  CARD = 'CARD',
  NOTE = 'NOTE',
  DOCUMENT = 'DOCUMENT',
  IDENTITY = 'IDENTITY',
}

class CreateEntryDto {
  @IsEnum(VaultEntryType)
  type!: VaultEntryType;

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  websiteUrl?: string;

  @IsOptional() @IsString()
  username?: string;

  @IsString()
  encryptedData!: string;

  @IsString()
  iv!: string;

  @IsOptional() @IsNumber()
  strengthScore?: number;

  @IsOptional() @IsNumber()
  passwordLength?: number;

  @IsOptional() @IsBoolean()
  hasUppercase?: boolean;

  @IsOptional() @IsBoolean()
  hasLowercase?: boolean;

  @IsOptional() @IsBoolean()
  hasNumbers?: boolean;

  @IsOptional() @IsBoolean()
  hasSymbols?: boolean;

  @IsOptional() @IsBoolean()
  hasTwoFactor?: boolean;

  @IsOptional() @IsString()
  twoFactorProvider?: string;

  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @IsOptional() @IsArray()
  collectionIds?: string[];

  @IsOptional() @IsArray()
  tagIds?: string[];
}

class UpdateEntryDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  websiteUrl?: string;

  @IsOptional() @IsString()
  username?: string;

  @IsOptional() @IsString()
  encryptedData?: string;

  @IsOptional() @IsString()
  iv?: string;

  @IsOptional() @IsNumber()
  strengthScore?: number;

  @IsOptional() @IsNumber()
  passwordLength?: number;

  @IsOptional() @IsBoolean()
  hasUppercase?: boolean;

  @IsOptional() @IsBoolean()
  hasLowercase?: boolean;

  @IsOptional() @IsBoolean()
  hasNumbers?: boolean;

  @IsOptional() @IsBoolean()
  hasSymbols?: boolean;

  @IsOptional() @IsBoolean()
  hasTwoFactor?: boolean;

  @IsOptional() @IsString()
  twoFactorProvider?: string;

  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @IsOptional() @IsArray()
  collectionIds?: string[];

  @IsOptional() @IsArray()
  tagIds?: string[];

  @IsOptional() @IsBoolean()
  passwordChanged?: boolean;
}

class CreateCollectionDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  icon?: string;

  @IsOptional() @IsString()
  color?: string;
}

class CreateTagDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  color?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  // Entries
  @Get()
  getEntries(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('collectionId') collectionId?: string,
    @Query('tagId') tagId?: string,
    @Query('favorite') favorite?: string,
    @Query('search') search?: string,
  ) {
    return this.vaultService.getEntries(req.user.userId, {
      type,
      collectionId,
      tagId,
      isFavorite: favorite === 'true',
      search,
    });
  }

  @Get('score')
  getSecurityScore(@Request() req: any) {
    return this.vaultService.getSecurityScore(req.user.userId);
  }

  @Get('audit')
  getAuditLog(@Request() req: any, @Query('limit') limit?: string) {
    return this.vaultService.getAuditLog(req.user.userId, limit ? parseInt(limit) : 50);
  }

  @Get(':id')
  getEntry(@Request() req: any, @Param('id') id: string) {
    return this.vaultService.getEntry(req.user.userId, id);
  }

  @Post()
  createEntry(@Request() req: any, @Body() dto: CreateEntryDto) {
    return this.vaultService.createEntry(req.user.userId, dto);
  }

  @Put(':id')
  updateEntry(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateEntryDto) {
    return this.vaultService.updateEntry(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteEntry(@Request() req: any, @Param('id') id: string) {
    return this.vaultService.deleteEntry(req.user.userId, id);
  }

  // Collections
  @Get('collections/list')
  getCollections(@Request() req: any) {
    return this.vaultService.getCollections(req.user.userId);
  }

  @Post('collections')
  createCollection(@Request() req: any, @Body() dto: CreateCollectionDto) {
    return this.vaultService.createCollection(req.user.userId, dto);
  }

  @Delete('collections/:id')
  deleteCollection(@Request() req: any, @Param('id') id: string) {
    return this.vaultService.deleteCollection(req.user.userId, id);
  }

  // Tags
  @Get('tags/list')
  getTags(@Request() req: any) {
    return this.vaultService.getTags(req.user.userId);
  }

  @Post('tags')
  createTag(@Request() req: any, @Body() dto: CreateTagDto) {
    return this.vaultService.createTag(req.user.userId, dto);
  }
}
