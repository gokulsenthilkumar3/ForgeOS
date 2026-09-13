import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from './nanoid';

const COLLECTION_COLORS = [
  { id: 1, hex: '#8b5cf6' },
  { id: 2, hex: '#06b6d4' },
  { id: 3, hex: '#10b981' },
  { id: 4, hex: '#f59e0b' },
  { id: 5, hex: '#ec4899' },
  { id: 6, hex: '#f97316' },
];

export { COLLECTION_COLORS };

const SEED_COLLECTIONS = [
  {
    id: 'coll-1',
    name: 'Development',
    description: 'All coding and development prompts',
    colorId: 1,
    icon: 'Code2',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'coll-2',
    name: 'Content Writing',
    description: 'Blog posts, emails, and marketing copy',
    colorId: 4,
    icon: 'PenTool',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'coll-3',
    name: 'SEO & Marketing',
    description: 'Search optimization and marketing prompts',
    colorId: 3,
    icon: 'TrendingUp',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useCollectionStore = create(
  persist(
    (set, get) => ({
      collections: SEED_COLLECTIONS,
      colors: COLLECTION_COLORS,

      addCollection: (data) => {
        const newCollection = {
          id: nanoid(),
          createdAt: new Date().toISOString(),
          colorId: 1,
          icon: 'Folder',
          ...data,
        };
        set((state) => ({ collections: [...state.collections, newCollection] }));
        return newCollection;
      },

      updateCollection: (id, updates) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCollection: (id) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        }));
      },
    }),
    { name: 'promptvault-collections' }
  )
);
