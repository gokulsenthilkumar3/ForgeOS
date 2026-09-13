import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VaultService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Vault Entries
  // -------------------------------------------------------------------------

  async getEntries(userId: string, filters?: {
    type?: string;
    collectionId?: string;
    tagId?: string;
    isFavorite?: boolean;
    search?: string;
  }) {
    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.isFavorite) where.isFavorite = true;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { websiteUrl: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.collectionId) {
      where.collections = { some: { collectionId: filters.collectionId } };
    }
    if (filters?.tagId) {
      where.tags = { some: { tagId: filters.tagId } };
    }

    const entries = await this.prisma.vaultEntry.findMany({
      where,
      include: {
        collections: { include: { collection: { select: { id: true, name: true, icon: true, color: true } } } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        breachRecords: { where: { resolved: false }, select: { id: true, severity: true, source: true } },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    return entries;
  }

  async getEntry(userId: string, entryId: string) {
    const entry = await this.prisma.vaultEntry.findUnique({
      where: { id: entryId },
      include: {
        collections: { include: { collection: true } },
        tags: { include: { tag: true } },
        breachRecords: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!entry) throw new NotFoundException('Vault entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Access denied');

    // Log that user viewed this entry
    await this.prisma.securityAuditLog.create({
      data: { userId, action: 'VAULT_VIEW', entryId },
    });

    // Update viewed timestamp
    await this.prisma.vaultEntry.update({
      where: { id: entryId },
      data: { passwordViewedAt: new Date() },
    });

    return entry;
  }

  async createEntry(userId: string, data: {
    type: string;
    title: string;
    websiteUrl?: string;
    username?: string;
    encryptedData: string;
    iv: string;
    strengthScore?: number;
    passwordLength?: number;
    hasUppercase?: boolean;
    hasLowercase?: boolean;
    hasNumbers?: boolean;
    hasSymbols?: boolean;
    hasTwoFactor?: boolean;
    twoFactorProvider?: string;
    isFavorite?: boolean;
    collectionIds?: string[];
    tagIds?: string[];
  }) {
    const entry = await this.prisma.vaultEntry.create({
      data: {
        userId,
        type: data.type as any,
        title: data.title,
        websiteUrl: data.websiteUrl,
        username: data.username,
        encryptedData: data.encryptedData,
        iv: data.iv,
        strengthScore: data.strengthScore,
        passwordLength: data.passwordLength,
        hasUppercase: data.hasUppercase,
        hasLowercase: data.hasLowercase,
        hasNumbers: data.hasNumbers,
        hasSymbols: data.hasSymbols,
        hasTwoFactor: data.hasTwoFactor,
        twoFactorProvider: data.twoFactorProvider,
        isFavorite: data.isFavorite ?? false,
        lastPasswordChange: new Date(),
        collections: data.collectionIds?.length
          ? { create: data.collectionIds.map((id) => ({ collectionId: id })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((id) => ({ tagId: id })) }
          : undefined,
      },
    });

    await this.prisma.securityAuditLog.create({
      data: { userId, action: 'VAULT_CREATE', entryId: entry.id },
    });

    return entry;
  }

  async updateEntry(userId: string, entryId: string, data: {
    title?: string;
    websiteUrl?: string;
    username?: string;
    encryptedData?: string;
    iv?: string;
    strengthScore?: number;
    passwordLength?: number;
    hasUppercase?: boolean;
    hasLowercase?: boolean;
    hasNumbers?: boolean;
    hasSymbols?: boolean;
    hasTwoFactor?: boolean;
    twoFactorProvider?: string;
    isFavorite?: boolean;
    collectionIds?: string[];
    tagIds?: string[];
    passwordChanged?: boolean;
  }) {
    const existing = await this.prisma.vaultEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new NotFoundException('Vault entry not found');
    if (existing.userId !== userId) throw new ForbiddenException('Access denied');

    // If collections/tags are provided, replace them
    if (data.collectionIds !== undefined) {
      await this.prisma.vaultEntryCollection.deleteMany({ where: { entryId } });
    }
    if (data.tagIds !== undefined) {
      await this.prisma.vaultEntryTag.deleteMany({ where: { entryId } });
    }

    const entry = await this.prisma.vaultEntry.update({
      where: { id: entryId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.encryptedData !== undefined && { encryptedData: data.encryptedData }),
        ...(data.iv !== undefined && { iv: data.iv }),
        ...(data.strengthScore !== undefined && { strengthScore: data.strengthScore }),
        ...(data.passwordLength !== undefined && { passwordLength: data.passwordLength }),
        ...(data.hasUppercase !== undefined && { hasUppercase: data.hasUppercase }),
        ...(data.hasLowercase !== undefined && { hasLowercase: data.hasLowercase }),
        ...(data.hasNumbers !== undefined && { hasNumbers: data.hasNumbers }),
        ...(data.hasSymbols !== undefined && { hasSymbols: data.hasSymbols }),
        ...(data.hasTwoFactor !== undefined && { hasTwoFactor: data.hasTwoFactor }),
        ...(data.twoFactorProvider !== undefined && { twoFactorProvider: data.twoFactorProvider }),
        ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
        ...(data.passwordChanged && { lastPasswordChange: new Date() }),
        collections: data.collectionIds?.length
          ? { create: data.collectionIds.map((id) => ({ collectionId: id })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((id) => ({ tagId: id })) }
          : undefined,
      },
    });

    await this.prisma.securityAuditLog.create({
      data: { userId, action: 'VAULT_UPDATE', entryId },
    });

    return entry;
  }

  async deleteEntry(userId: string, entryId: string) {
    const existing = await this.prisma.vaultEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new NotFoundException('Vault entry not found');
    if (existing.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.vaultEntry.delete({ where: { id: entryId } });

    await this.prisma.securityAuditLog.create({
      data: { userId, action: 'VAULT_DELETE', entryId },
    });

    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // Collections
  // -------------------------------------------------------------------------

  async getCollections(userId: string) {
    return this.prisma.vaultCollection.findMany({
      where: { userId },
      include: { _count: { select: { entries: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCollection(userId: string, data: { name: string; icon?: string; color?: string }) {
    return this.prisma.vaultCollection.create({
      data: { userId, name: data.name, icon: data.icon ?? '📁', color: data.color ?? '#6B7280' },
    });
  }

  async deleteCollection(userId: string, collectionId: string) {
    const col = await this.prisma.vaultCollection.findUnique({ where: { id: collectionId } });
    if (!col || col.userId !== userId) throw new ForbiddenException('Access denied');
    if (col.isDefault) throw new ForbiddenException('Cannot delete default collections');
    await this.prisma.vaultCollection.delete({ where: { id: collectionId } });
    return { deleted: true };
  }

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------

  async getTags(userId: string) {
    return this.prisma.vaultTag.findMany({
      where: { userId },
      include: { _count: { select: { entries: true } } },
    });
  }

  async createTag(userId: string, data: { name: string; color?: string }) {
    return this.prisma.vaultTag.create({
      data: { userId, name: data.name, color: data.color ?? '#6B7280' },
    });
  }

  // -------------------------------------------------------------------------
  // Security Score
  // -------------------------------------------------------------------------

  async getSecurityScore(userId: string) {
    const entries = await this.prisma.vaultEntry.findMany({
      where: { userId, type: 'PASSWORD' },
      include: { breachRecords: { where: { resolved: false } } },
    });

    const total = entries.length;
    if (total === 0) {
      return { score: 100, breakdown: [], totalEntries: 0 };
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let score = 100;
    const breakdown: any[] = [];

    // Weak passwords (< 60 strength score)
    const weak = entries.filter((e) => (e.strengthScore ?? 100) < 60);
    if (weak.length > 0) {
      const deduction = Math.min(weak.length * 5, 30);
      score -= deduction;
      breakdown.push({ type: 'weak', count: weak.length, deduction, entries: weak.map((e) => ({ id: e.id, title: e.title })) });
    }

    // Reused passwords - detect by same length + same strength score pattern (basic approximation)
    const passwordGroups = new Map<string, any[]>();
    for (const e of entries) {
      const key = `${e.passwordLength ?? 0}-${e.strengthScore ?? 0}-${e.hasUppercase}-${e.hasLowercase}-${e.hasNumbers}-${e.hasSymbols}`;
      if (!passwordGroups.has(key)) passwordGroups.set(key, []);
      passwordGroups.get(key)!.push(e);
    }
    const reused = [...passwordGroups.values()].filter((g) => g.length > 1).flat();
    if (reused.length > 0) {
      const deduction = Math.min(Math.floor(reused.length / 2) * 5, 25);
      score -= deduction;
      breakdown.push({ type: 'reused', count: reused.length, deduction, entries: reused.map((e) => ({ id: e.id, title: e.title })) });
    }

    // Stale passwords (not changed in 90 days)
    const stale = entries.filter(
      (e) => e.lastPasswordChange && e.lastPasswordChange < ninetyDaysAgo,
    );
    if (stale.length > 0) {
      const deduction = Math.min(stale.length * 3, 20);
      score -= deduction;
      breakdown.push({ type: 'stale', count: stale.length, deduction, entries: stale.map((e) => ({ id: e.id, title: e.title })) });
    }

    // No 2FA
    const noTwoFactor = entries.filter((e) => !e.hasTwoFactor);
    if (noTwoFactor.length > 0) {
      const deduction = Math.min(noTwoFactor.length * 2, 15);
      score -= deduction;
      breakdown.push({ type: 'no2fa', count: noTwoFactor.length, deduction, entries: noTwoFactor.map((e) => ({ id: e.id, title: e.title })) });
    }

    // Breached
    const breached = entries.filter((e) => e.breachRecords.length > 0);
    if (breached.length > 0) {
      const deduction = Math.min(breached.length * 10, 40);
      score -= deduction;
      breakdown.push({ type: 'breached', count: breached.length, deduction, entries: breached.map((e) => ({ id: e.id, title: e.title })) });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      totalEntries: total,
      weakCount: weak.length,
      reusedCount: reused.length,
      staleCount: stale.length,
      noTwoFactorCount: noTwoFactor.length,
      breachedCount: breached.length,
      breakdown,
    };
  }

  // -------------------------------------------------------------------------
  // Audit Log
  // -------------------------------------------------------------------------

  async getAuditLog(userId: string, limit = 50) {
    return this.prisma.securityAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
