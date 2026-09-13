import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      searchQuery: '',
      viewMode: 'grid', // 'grid' | 'list'
      activeFilters: {
        tags: [],
        models: [],
        collection: null,
        favorites: false,
        pinned: false,
        rating: null,
      },
      sidebarOpen: true,
      sortBy: 'updatedAt', // 'updatedAt' | 'createdAt' | 'title' | 'usageCount' | 'rating'
      sortDir: 'desc',
      activeTab: 'all', // 'all' | 'favorites' | 'pinned'

      setSearchQuery: (q) => set({ searchQuery: q }),
      setViewMode: (m) => set({ viewMode: m }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setFilter: (key, value) => set((s) => ({
        activeFilters: { ...s.activeFilters, [key]: value },
      })),

      toggleTagFilter: (tag) => set((s) => {
        const tags = s.activeFilters.tags.includes(tag)
          ? s.activeFilters.tags.filter((t) => t !== tag)
          : [...s.activeFilters.tags, tag];
        return { activeFilters: { ...s.activeFilters, tags } };
      }),

      toggleModelFilter: (model) => set((s) => {
        const models = s.activeFilters.models.includes(model)
          ? s.activeFilters.models.filter((m) => m !== model)
          : [...s.activeFilters.models, model];
        return { activeFilters: { ...s.activeFilters, models } };
      }),

      clearFilters: () => set({
        activeFilters: { tags: [], models: [], collection: null, favorites: false, pinned: false, rating: null },
        searchQuery: '',
      }),

      setSortBy: (by) => set({ sortBy: by }),
      setSortDir: (dir) => set({ sortDir: dir }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'promptvault-ui',
      partialize: (s) => ({ viewMode: s.viewMode, sortBy: s.sortBy, sortDir: s.sortDir }),
    }
  )
);
