import PromptCard from './PromptCard';
import { useUIStore } from '../../store/useUIStore';
import { BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PromptGrid({ prompts }) {
  const { viewMode } = useUIStore();
  const navigate = useNavigate();

  if (prompts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <BookOpen size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h3 className="empty-state-title">No prompts found</h3>
        <p className="empty-state-subtitle">
          Create your first prompt or adjust your filters to find what you're looking for.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/prompt/new')} id="empty-new-prompt-btn">
          <Plus size={15} /> Create Prompt
        </button>
      </div>
    );
  }

  return (
    <div className={viewMode === 'list' ? 'prompts-list' : 'prompts-grid'}>
      {prompts.map((prompt, index) => (
        <PromptCard key={prompt.id} prompt={prompt} index={index} />
      ))}
    </div>
  );
}
