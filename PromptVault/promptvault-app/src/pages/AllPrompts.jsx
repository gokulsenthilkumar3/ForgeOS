import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import Layout from '../components/layout/Layout';
import PromptGrid from '../components/prompts/PromptGrid';
import FilterSidebar from '../components/filters/FilterSidebar';
import { usePromptStore } from '../store/usePromptStore';
import { useUIStore } from '../store/useUIStore';

export default function AllPrompts() {
  const { prompts } = usePromptStore();
  const { searchQuery, activeFilters, sortBy, sortDir } = useUIStore();
  const [searchParams] = useSearchParams();

  const quickFilter = searchParams.get('filter'); // 'favorites' | 'pinned'

  const fuse = useMemo(() => new Fuse(prompts, {
    keys: ['title', 'content', 'description', 'tags'],
    threshold: 0.4,
    includeScore: true,
  }), [prompts]);

  const filtered = useMemo(() => {
    let results = prompts;

    // Quick URL filter (favorites / pinned)
    if (quickFilter === 'favorites') {
      results = results.filter((p) => p.isFavorite);
    } else if (quickFilter === 'pinned') {
      results = results.filter((p) => p.isPinned);
    }

    // Fuzzy search
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery);
      const matchedIds = new Set(fuseResults.map((r) => r.item.id));
      results = results.filter((p) => matchedIds.has(p.id));
    }

    // Filter: favorites
    if (activeFilters.favorites) results = results.filter((p) => p.isFavorite);

    // Filter: pinned
    if (activeFilters.pinned) results = results.filter((p) => p.isPinned);

    // Filter: collection
    if (activeFilters.collection) results = results.filter((p) => p.collectionId === activeFilters.collection);

    // Filter: models
    if (activeFilters.models.length > 0) results = results.filter((p) => activeFilters.models.includes(p.model));

    // Filter: tags
    if (activeFilters.tags.length > 0) {
      results = results.filter((p) =>
        activeFilters.tags.every((tag) => p.tags?.includes(tag))
      );
    }

    // Filter: rating
    if (activeFilters.rating) results = results.filter((p) => (p.rating || 0) >= activeFilters.rating);

    // Sort
    results = [...results].sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Always put pinned first
    results = [
      ...results.filter((p) => p.isPinned),
      ...results.filter((p) => !p.isPinned),
    ];

    return results;
  }, [prompts, searchQuery, activeFilters, sortBy, sortDir, quickFilter, fuse]);

  const pageTitle = quickFilter === 'favorites' ? 'Favorites' : quickFilter === 'pinned' ? 'Pinned' : 'All Prompts';

  return (
    <Layout title={`${pageTitle} (${filtered.length})`}>
      <div className="prompt-content-area">
        {/* Filter Sidebar */}
        <FilterSidebar />

        {/* Main Content */}
        <div className="prompt-main">
          {/* Results count */}
          <div style={{ marginBottom: 20, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          <PromptGrid prompts={filtered} />
        </div>
      </div>
    </Layout>
  );
}
