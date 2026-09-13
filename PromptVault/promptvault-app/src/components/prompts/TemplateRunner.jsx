import { useState } from 'react';
import { Zap, Copy, ExternalLink, CheckCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import { AI_MODELS } from '../../store/usePromptStore';
import { usePromptStore } from '../../store/usePromptStore';
import toast from 'react-hot-toast';

export default function TemplateRunner({ prompt, onClose }) {
  const { recordUsage } = usePromptStore();
  const [values, setValues] = useState(
    Object.fromEntries((prompt.variables || []).map((v) => [v, '']))
  );
  const [copied, setCopied] = useState(false);

  const filledContent = prompt.content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = values[key.trim()];
    return val || `{{${key}}}`;
  });

  const allFilled = (prompt.variables || []).every((v) => values[v]?.trim());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(filledContent);
    recordUsage(prompt.id);
    setCopied(true);
    toast.success('Prompt copied!');
    setTimeout(() => { setCopied(false); }, 2000);
  };

  const handleOpenInModel = (model) => {
    if (!model.url) return;
    recordUsage(prompt.id);
    const encoded = encodeURIComponent(filledContent);
    // Best-effort URL - many AI tools don't support pre-filled prompts via URL
    window.open(model.url, '_blank');
    navigator.clipboard.writeText(filledContent);
    toast.success(`Copied! Paste in ${model.label}`);
  };

  return (
    <Modal
      title={`Run: ${prompt.title}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            id="copy-filled-btn"
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={!allFilled}
          >
            {copied ? <><CheckCheck size={15} /> Copied!</> : <><Copy size={15} /> Copy Prompt</>}
          </button>
        </>
      }
    >
      {/* Variable Fill Fields */}
      {(prompt.variables || []).length > 0 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Fill in the template variables below:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {(prompt.variables || []).map((varName) => (
              <div key={varName} className="variable-field">
                <span className="variable-name">{'{{'}  {varName} {'}}'}</span>
                <input
                  id={`var-${varName}`}
                  className="input"
                  placeholder={`Enter ${varName}...`}
                  value={values[varName] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [varName]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>PREVIEW</p>
        </div>
        <div
          className="code-block"
          style={{ maxHeight: 240, overflowY: 'auto' }}
          dangerouslySetInnerHTML={{
            __html: filledContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\{\{([^}]+)\}\}/g, (_, key) => `<span class="highlight-var">{{${key}}}</span>`)
          }}
        />
      </div>

      {/* Open in AI Model */}
      <div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
          OPEN IN AI MODEL
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AI_MODELS.filter((m) => m.url).map((model) => (
            <button
              key={model.id}
              id={`open-in-${model.id}`}
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenInModel(model)}
            >
              <ExternalLink size={13} />
              {model.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
