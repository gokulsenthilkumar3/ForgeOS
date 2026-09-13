import { useParams } from 'react-router-dom';
import { useCollectionStore } from '../store/useCollectionStore';
import { usePromptStore } from '../store/usePromptStore';
import Layout from '../components/layout/Layout';
import PromptGrid from '../components/prompts/PromptGrid';
import { Folder } from 'lucide-react';

const COLLECTION_COLOR_MAP = {
  1: '#8b5cf6', 2: '#06b6d4', 3: '#10b981', 4: '#f59e0b', 5: '#ec4899', 6: '#f97316',
};

export default function CollectionView() {
  const { id } = useParams();
  const { collections } = useCollectionStore();
  const { prompts } = usePromptStore();

  const collection = collections.find((c) => c.id === id);
  const collectionPrompts = prompts.filter((p) => p.collectionId === id);
  const color = collection ? COLLECTION_COLOR_MAP[collection.colorId] : 'var(--accent-primary)';

  if (!collection) {
    return (
      <Layout title="Collection Not Found">
        <div className="empty-state">
          <div className="empty-state-icon"><Folder size={32} /></div>
          <h3 className="empty-state-title">Collection not found</h3>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={collection.name}>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={22} style={{ color }} />
            </div>
            <h1 className="page-header-title" style={{ margin: 0 }}>{collection.name}</h1>
          </div>
          {collection.description && (
            <p className="page-header-subtitle">{collection.description}</p>
          )}
        </div>
        <span className="badge badge-gray">{collectionPrompts.length} prompt{collectionPrompts.length !== 1 ? 's' : ''}</span>
      </div>

      <PromptGrid prompts={collectionPrompts} />
    </Layout>
  );
}
