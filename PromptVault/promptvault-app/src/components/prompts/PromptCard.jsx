import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, Pin, Copy, Trash2, Edit, MoreVertical,
  Play, Clock, Zap, CheckCheck, Copy as Duplicate, GitBranch
} from 'lucide-react';
import { usePromptStore, AI_MODELS } from '../../store/usePromptStore';
import { useCollectionStore } from '../../store/useCollectionStore';
import toast from 'react-hot-toast';
import TemplateRunner from './TemplateRunner';

const TAG_COLORS = ['badge-violet', 'badge-amber', 'badge-cyan', 'badge-green', 'badge-pink', 'badge-orange'];

function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function ModelBadge({ modelId }) {
  const model = AI_MODELS.find((m) => m.id === modelId);
  if (!model) return null;
  return (
    <span className={`card-model-icon ${model.color}`} title={model.label}>
      {model.short}
    </span>
  );
}

function RatingDots({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(r => (
        <span
          key={r}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: r <= rating ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.12)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </span>
  );
}

export default function PromptCard({ prompt, index = 0 }) {
  const navigate = useNavigate();
  const { toggleFavorite, togglePin, deletePrompt, recordUsage, duplicatePrompt } = usePromptStore();
  const { collections } = useCollectionStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [copied, setCopied] = useState(false);

  const collection = collections.find((c) => c.id === prompt.collectionId);
  const hasVars = prompt.variables && prompt.variables.length > 0;
  const charCount = prompt.content?.length || 0;

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    recordUsage(prompt.id);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Delete "${prompt.title}"?`)) {
      deletePrompt(prompt.id);
      toast.success('Prompt deleted');
    }
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    duplicatePrompt(prompt.id);
    toast.success('Prompt duplicated!');
  };

  const handleRun = (e) => {
    e.stopPropagation();
    if (hasVars) {
      setShowRunner(true);
    } else {
      handleCopy(e);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <>
      <article
        className={`glass-card prompt-card p-5 ${prompt.isPinned ? 'pinned' : ''}`}
        style={{ animationDelay: `${index * 40}ms` }}
        onClick={() => navigate(`/prompt/${prompt.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/prompt/${prompt.id}`)}
        aria-label={`Open prompt: ${prompt.title}`}
        id={`prompt-card-${prompt.id}`}
      >
        {/* Gradient top accent for pinned */}
        {prompt.isPinned && <div className="card-pin-bar" />}

        {/* Card Header */}
        <div className="card-header">
          <ModelBadge modelId={prompt.model} />
          <h3 className="card-title">{prompt.title}</h3>
          <button
            id={`fav-btn-${prompt.id}`}
            className="btn btn-ghost btn-icon btn-sm fav-indicator"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(prompt.id); }}
            title={prompt.isFavorite ? 'Remove favorite' : 'Add to favorites'}
            style={{ color: prompt.isFavorite ? 'var(--accent-secondary)' : 'var(--text-muted)', flexShrink: 0 }}
          >
            <Star size={15} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Description / Content Preview */}
        <p className="card-body">
          {prompt.description || prompt.content}
        </p>

        {/* Tags */}
        {prompt.tags?.length > 0 && (
          <div className="card-tags">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={`badge ${getTagColor(tag)}`}>{tag}</span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="badge badge-gray">+{prompt.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Template vars indicator */}
        {hasVars && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10, fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
            <Zap size={12} />
            <span>{prompt.variables.length} variable{prompt.variables.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Footer */}
        <div className="card-footer">
          <div className="card-meta">
            <Clock size={11} />
            {timeAgo(prompt.updatedAt)}
            {prompt.usageCount > 0 && (
              <>
                <span>·</span>
                <span>{prompt.usageCount}×</span>
              </>
            )}
            {prompt.rating > 0 && (
              <>
                <span>·</span>
                <RatingDots rating={prompt.rating} />
              </>
            )}
            {collection && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--accent-primary)', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.name}</span>
              </>
            )}
          </div>

          <div className="card-actions">
            <button
              id={`copy-btn-${prompt.id}`}
              className="btn btn-ghost btn-icon btn-sm"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <CheckCheck size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
            </button>

            <button
              id={`run-btn-${prompt.id}`}
              className="btn btn-ghost btn-icon btn-sm"
              onClick={handleRun}
              title={hasVars ? 'Fill variables & run' : 'Copy & run'}
              style={{ color: 'var(--accent-primary)' }}
            >
              <Play size={14} />
            </button>

            <div style={{ position: 'relative' }}>
              <button
                id={`menu-btn-${prompt.id}`}
                className="btn btn-ghost btn-icon btn-sm"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                title="More options"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); navigate(`/prompt/${prompt.id}`); setShowMenu(false); }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); togglePin(prompt.id); setShowMenu(false); }}>
                    <Pin size={14} /> {prompt.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button className="dropdown-item" onClick={handleDuplicate}>
                    <GitBranch size={14} /> Duplicate
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleDelete}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Char count bar */}
        <div className="card-char-bar">
          <div
            className="card-char-fill"
            style={{ width: `${Math.min((charCount / 2000) * 100, 100)}%` }}
          />
        </div>
      </article>

      {showRunner && (
        <TemplateRunner prompt={prompt} onClose={() => setShowRunner(false)} />
      )}
    </>
  );
}
