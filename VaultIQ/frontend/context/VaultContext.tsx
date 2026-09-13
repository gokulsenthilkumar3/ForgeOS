'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { deriveEncryptionKey, encryptPayload, decryptPayload, VaultEntryPayload } from '../lib/crypto';
import { vaultApi } from '../lib/api';
import { analyzePasswordStrength } from '../lib/passwordStrength';
import { useAuth } from './AuthContext';

export interface VaultEntry {
  id: string;
  type: 'PASSWORD' | 'CARD' | 'NOTE' | 'DOCUMENT' | 'IDENTITY';
  title: string;
  websiteUrl?: string;
  username?: string;
  isFavorite: boolean;
  strengthScore?: number;
  hasTwoFactor: boolean;
  lastPasswordChange?: string;
  createdAt: string;
  updatedAt: string;
  encryptedData: string;
  iv: string;
  collections: Array<{ collection: { id: string; name: string; icon: string; color: string } }>;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
  breachRecords: Array<{ id: string; severity: string; source: string }>;
  // decrypted payload (available after decryptEntry is called)
  decrypted?: VaultEntryPayload;
}

export interface SecurityScore {
  score: number;
  totalEntries: number;
  weakCount: number;
  reusedCount: number;
  staleCount: number;
  noTwoFactorCount: number;
  breachedCount: number;
  breakdown: any[];
}

interface VaultContextType {
  entries: VaultEntry[];
  loading: boolean;
  encryptionReady: boolean;
  securityScore: SecurityScore | null;
  initializeEncryption: (masterPassword: string, salt: string) => Promise<void>;
  lockVault: () => void;
  decryptEntry: (entry: VaultEntry) => Promise<VaultEntryPayload>;
  addEntry: (data: {
    type: VaultEntry['type'];
    title: string;
    websiteUrl?: string;
    username?: string;
    payload: VaultEntryPayload;
    isFavorite?: boolean;
    collectionIds?: string[];
    tagIds?: string[];
  }) => Promise<VaultEntry>;
  updateEntry: (id: string, updates: Partial<Parameters<VaultContextType['addEntry']>[0]> & { passwordChanged?: boolean }) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
  refreshScore: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType>({} as VaultContextType);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encryptionReady = !!encryptionKey;

  // Auto-lock timer
  const resetLockTimer = useCallback(() => {
    if (!user || user.autoLockMinutes === 0) return;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      lockVault();
    }, user.autoLockMinutes * 60 * 1000);
  }, [user]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetLockTimer));
    return () => events.forEach((e) => window.removeEventListener(e, resetLockTimer));
  }, [resetLockTimer]);

  const initializeEncryption = async (masterPassword: string, salt: string) => {
    const key = await deriveEncryptionKey(masterPassword, salt);
    setEncryptionKey(key);
    resetLockTimer();
    await refreshEntries(key);
    await refreshScore();
  };

  const lockVault = () => {
    setEncryptionKey(null);
    setEntries([]);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
  };

  const refreshEntries = async (key?: CryptoKey) => {
    const k = key ?? encryptionKey;
    if (!k) return;
    setLoading(true);
    try {
      const data = await vaultApi.getEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  const refreshScore = async () => {
    try {
      const score = await vaultApi.getSecurityScore();
      setSecurityScore(score);
    } catch {}
  };

  const decryptEntry = async (entry: VaultEntry): Promise<VaultEntryPayload> => {
    if (!encryptionKey) throw new Error('Vault is locked');
    return decryptPayload(entry.encryptedData, entry.iv, encryptionKey);
  };

  const addEntry = async (data: {
    type: VaultEntry['type'];
    title: string;
    websiteUrl?: string;
    username?: string;
    payload: VaultEntryPayload;
    isFavorite?: boolean;
    collectionIds?: string[];
    tagIds?: string[];
  }): Promise<VaultEntry> => {
    if (!encryptionKey) throw new Error('Vault is locked');

    const { encryptedData, iv } = await encryptPayload(data.payload, encryptionKey);

    // Analyze password strength for metadata
    const strength = data.payload.password
      ? analyzePasswordStrength(data.payload.password)
      : null;

    const created = await vaultApi.createEntry({
      type: data.type,
      title: data.title,
      websiteUrl: data.websiteUrl,
      username: data.username,
      encryptedData,
      iv,
      strengthScore: strength?.score,
      passwordLength: data.payload.password?.length,
      hasUppercase: strength?.hasUppercase,
      hasLowercase: strength?.hasLowercase,
      hasNumbers: strength?.hasNumbers,
      hasSymbols: strength?.hasSymbols,
      isFavorite: data.isFavorite ?? false,
      collectionIds: data.collectionIds,
      tagIds: data.tagIds,
    });

    setEntries((prev) => [created, ...prev]);
    await refreshScore();
    return created;
  };

  const updateEntry = async (id: string, updates: any) => {
    if (!encryptionKey) throw new Error('Vault is locked');

    const payload: Record<string, any> = {};

    if (updates.payload) {
      const { encryptedData, iv } = await encryptPayload(updates.payload, encryptionKey);
      payload.encryptedData = encryptedData;
      payload.iv = iv;

      if (updates.payload.password) {
        const s = analyzePasswordStrength(updates.payload.password);
        payload.strengthScore = s.score;
        payload.passwordLength = updates.payload.password.length;
        payload.hasUppercase = s.hasUppercase;
        payload.hasLowercase = s.hasLowercase;
        payload.hasNumbers = s.hasNumbers;
        payload.hasSymbols = s.hasSymbols;
      }
    }

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.websiteUrl !== undefined) payload.websiteUrl = updates.websiteUrl;
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.isFavorite !== undefined) payload.isFavorite = updates.isFavorite;
    if (updates.collectionIds !== undefined) payload.collectionIds = updates.collectionIds;
    if (updates.tagIds !== undefined) payload.tagIds = updates.tagIds;
    if (updates.passwordChanged) payload.passwordChanged = true;

    const updated = await vaultApi.updateEntry(id, payload);
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    await refreshScore();
  };

  const deleteEntry = async (id: string) => {
    await vaultApi.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await refreshScore();
  };

  const toggleFavorite = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    await updateEntry(id, { isFavorite: !entry.isFavorite });
  };

  return (
    <VaultContext.Provider value={{
      entries, loading, encryptionReady, securityScore,
      initializeEncryption, lockVault, decryptEntry,
      addEntry, updateEntry, deleteEntry, toggleFavorite,
      refreshEntries: () => refreshEntries(), refreshScore,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
