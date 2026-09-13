import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, ArrowLeft, Star, Pin, History, Play, Trash2,
  Tag, X, Plus, Zap, Copy, CheckCheck
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import VersionHistory from '../components/prompts/VersionHistory';
import TemplateRunner from '../components/prompts/TemplateRunner';
import { usePromptStore, AI_MODELS, extractVariables } from '../store/usePromptStore';
import { useCollectionStore } from '../store/useCollectionStore';
import toast from 'react-hot-toast';

const RATING_LABELS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];

export default function PromptEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { prompts, addPrompt, updatePrompt, deletePrompt, toggleFavorite, togglePin, ratePrompt } = usePromptStore();
  const { collections } = useCollectionStore();

  const existingPrompt = prompts.find((p) => p.id === id);

  const [form, setForm] = useState({
    title: '',
    content: '',
    description: '',
    tags: [],
    model: 'gpt-4o',
    collectionId: '',
    rating: 0,
  });
  const [newTag, setNewTag] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isNew && existingPrompt) {
      setForm({
        title: existingPrompt.title || '',
        content: existingPrompt.content || '',
        description: existingPrompt.description || '',
        tags: existingPrompt.tags || [],
        model: existingPrompt.model || 'gpt-4o',
        collectionId: existingPrompt.collectionId || '',
        rating: existingPrompt.rating || 0,
      });
    }
  }, [id]);

  const detectedVars = extractVariables(form.content);

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.content.trim()) { toast.error('Prompt content is required'); return; }

    const data = { ...form, collectionId: form.collectionId || null };

    if (isNew) {
      const created = addPrompt(data);
      toast.success('Prompt created!');
      navigate(`/prompt/${created.id}`, { replace: true });
    } else {
      updatePrompt(id, data);
      toast.success('Saved!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete "${form.title}"?`)) {
      deletePrompt(id);
      toast.success('Deleted');
      navigate('/prompts');
    }
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setNewTag('');
  };

  const removeTag = (tag) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(form.content);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const prompt = isNew ? null : existingPrompt;

  return (
    <Layout title={isNew ? 'New Prompt' : 'Edit Prompt'}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} id="back-btn">
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isNew && prompt && (
            <>
              <button
                id="toggle-fav-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => toggleFavorite(id)}
                style={{ color: prompt.isFavorite ? 'var(--accent-secondary)' : undefined }}
              >
                <Star size={15} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
                {prompt.isFavorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <button
                id="toggle-pin-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => togglePin(id)}
                style={{ color: prompt.isPinned ? 'var(--accent-primary)' : undefined }}
              >
                <Pin size={15} />
                {prompt.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                id="history-btn"
                className={`btn btn-sm ${showHistory ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setShowHistory(!showHistory)}
              >
                <History size={15} /> History
              </button>
              <button id="delete-btn" className="btn btn-danger btn-sm" onClick={handleDelete}>
                <Trash2 size={15} /> Delete
              </button>
            </>
          )}
          <button
            id="copy-content-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleCopy}
          >
            {copied ? <CheckCheck size={15} style={{ color: 'var(--accent-green)' }} /> : <Copy size={15} />}
            Copy
          </button>
          {detectedVars.length > 0 && (
            <button
              id="run-template-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowRunner(true)}
            >
              <Play size={15} style={{ color: 'var(--accent-primary)' }} /> Run Template
            </button>
          )}
          <button id="save-btn" className="btn btn-primary" onClick={handleSave}>
            <Save size={15} />
            {saved ? 'Saved ✓' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showHistory ? '1fr 280px' : '1fr', gap: 24 }}>
        {/* Main Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="prompt-title">Title *</label>
            <input
              id="prompt-title"
              className="input"
              style={{ fontSize: '1.125rem', fontWeight: 600 }}
              placeholder="Give your prompt a descriptive name..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="prompt-description">Description</label>
            <input
              id="prompt-description"
              className="input"
              placeholder="Brief description of what this prompt does..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Content */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" htmlFor="prompt-content">
                Prompt Content * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— use {`{{variable}}`} for templates</span>
              </label>
              {detectedVars.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} /> {detectedVars.length} variable{detectedVars.length > 1 ? 's' : ''} detected
                </span>
              )}
            </div>
            <textarea
              id="prompt-content"
              className="textarea"
              style={{ minHeight: 280, fontFamily: "'Monaco', 'Courier New', monospace", fontSize: '0.875rem', lineHeight: 1.7 }}
              placeholder="Write your prompt here. Use {{variable_name}} for dynamic fields..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
            {detectedVars.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {detectedVars.map((v) => (
                  <span key={v} className="badge badge-amber">
                    <Zap size={10} /> {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row: Model + Collection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prompt-model">AI Model</label>
              <select
                id="prompt-model"
                className="select"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prompt-collection">Collection</label>
              <select
                id="prompt-collection"
                className="select"
                value={form.collectionId}
                onChange={(e) => setForm((f) => ({ ...f, collectionId: e.target.value }))}
              >
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="tag-input"
                className="input"
                placeholder="Add tag and press Enter..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <button className="btn btn-secondary" onClick={addTag} id="add-tag-btn">
                <Tag size={14} /> Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {form.tags.map((tag) => (
                  <span key={tag} className="badge badge-violet" style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)}>
                    {tag} <X size={10} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          {!isNew && (
            <div className="form-group">
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    id={`rate-${r}`}
                    className={`btn btn-sm ${form.rating >= r ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => {
                      const newRating = form.rating === r ? 0 : r;
                      setForm((f) => ({ ...f, rating: newRating }));
                      if (!isNew) ratePrompt(id, newRating);
                    }}
                  >
                    ⭐
                  </button>
                ))}
                {form.rating > 0 && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                    {RATING_LABELS[form.rating]}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Usage stats (view only) */}
          {!isNew && prompt && (
            <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>USED</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{prompt.usageCount || 0}×</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>VERSIONS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{(prompt.versions || []).length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>CREATED</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {new Date(prompt.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Version History Panel */}
        {showHistory && prompt && (
          <div className="glass-card" style={{ padding: '20px', alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} style={{ color: 'var(--accent-primary)' }} /> Version History
            </h3>
            <VersionHistory prompt={prompt} />
          </div>
        )}
      </div>

      {/* Template Runner */}
      {showRunner && (
        <TemplateRunner
          prompt={{ ...existingPrompt, content: form.content, variables: detectedVars }}
          onClose={() => setShowRunner(false)}
        />
      )}
    </Layout>
  );
}
