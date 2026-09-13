import { usePromptStore, AI_MODELS } from '../../store/usePromptStore';
import { useUIStore } from '../../store/useUIStore';
import { useCollectionStore } from '../../store/useCollectionStore';
import { X, Filter } from 'lucide-react';

const COLLECTION_COLOR_MAP = {
  1: '#8b5cf6', 2: '#06b6d4', 3: '#10b981', 4: '#f59e0b', 5: '#ec4899', 6: '#f97316',
};

export default function FilterSidebar() {
  const { prompts } = usePromptStore();
  const { activeFilters, toggleTagFilter, toggleModelFilter, setFilter, clearFilters } = useUIStore();
  const { collections } = useCollectionStore();

  // Collect all unique tags across prompts
  const allTags = [...new Set(prompts.flatMap((p) => p.tags || []))].sort();
  const usedModels = [...new Set(prompts.map((p) => p.model).filter(Boolean))];

  const hasActiveFilters = activeFilters.tags.length > 0 || activeFilters.models.length > 0 ||
    activeFilters.collection || activeFilters.favorites || activeFilters.pinned || activeFilters.rating;

  return (
    <aside className="filter-sidebar">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Filter size={14} />
          Filters
        </div>
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div>
        <p className="filter-section-title">Quick</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            className={`filter-tag ${activeFilters.favorites ? 'active' : ''}`}
            onClick={() => setFilter('favorites', !activeFilters.favorites)}
            id="filter-favorites"
          >
            ⭐ Favorites only
          </button>
          <button
            className={`filter-tag ${activeFilters.pinned ? 'active' : ''}`}
            onClick={() => setFilter('pinned', !activeFilters.pinned)}
            id="filter-pinned"
          >
            📌 Pinned only
          </button>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div>
          <p className="filter-section-title">Collections</p>
          <div className="filter-tags-list">
            {collections.map((coll) => (
              <button
                key={coll.id}
                id={`filter-coll-${coll.id}`}
                className={`filter-tag ${activeFilters.collection === coll.id ? 'active' : ''}`}
                onClick={() => setFilter('collection', activeFilters.collection === coll.id ? null : coll.id)}
                style={{ borderColor: activeFilters.collection === coll.id ? COLLECTION_COLOR_MAP[coll.colorId] : undefined }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLLECTION_COLOR_MAP[coll.colorId], flexShrink: 0 }} />
                {coll.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Models */}
      {usedModels.length > 0 && (
        <div>
          <p className="filter-section-title">AI Model</p>
          <div className="filter-tags-list">
            {usedModels.map((modelId) => {
              const model = AI_MODELS.find((m) => m.id === modelId);
              if (!model) return null;
              return (
                <button
                  key={modelId}
                  id={`filter-model-${modelId}`}
                  className={`filter-tag ${activeFilters.models.includes(modelId) ? 'active' : ''}`}
                  onClick={() => toggleModelFilter(modelId)}
                >
                  {model.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <p className="filter-section-title">Tags</p>
          <div className="filter-tags-list">
            {allTags.map((tag) => (
              <button
                key={tag}
                id={`filter-tag-${tag}`}
                className={`filter-tag ${activeFilters.tags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      <div>
        <p className="filter-section-title">Min Rating</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              id={`filter-rating-${r}`}
              className={`filter-tag ${activeFilters.rating === r ? 'active' : ''}`}
              onClick={() => setFilter('rating', activeFilters.rating === r ? null : r)}
              style={{ padding: '4px 8px' }}
            >
              {'⭐'.repeat(r)}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
