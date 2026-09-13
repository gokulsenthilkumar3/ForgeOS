import { History, RotateCcw } from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function VersionHistory({ prompt }) {
  const { revertToVersion } = usePromptStore();
  const versions = [...(prompt.versions || [])].reverse();

  if (versions.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <History size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          No versions yet. Edit and save to create history.
        </p>
      </div>
    );
  }

  const handleRevert = (version) => {
    if (confirm(`Revert to ${version.label}? Current content will be saved as a new version.`)) {
      revertToVersion(prompt.id, version);
      toast.success(`Reverted to ${version.label}`);
    }
  };

  return (
    <div>
      {/* Current version */}
      <div className="version-item current">
        <div className="version-dot" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Current Version
          </div>
          <div className="version-meta">{timeAgo(prompt.updatedAt)}</div>
        </div>
        <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>Live</span>
      </div>

      {versions.map((version) => (
        <div
          key={version.id}
          className="version-item"
          onClick={() => handleRevert(version)}
          title={`Click to revert to ${version.label}`}
          id={`version-${version.id}`}
        >
          <div className="version-dot" style={{ background: 'var(--accent-primary)', opacity: 0.5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {version.label}
            </div>
            <div className="version-meta">{timeAgo(version.savedAt)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {version.content?.slice(0, 60)}...
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            title={`Revert to ${version.label}`}
            onClick={(e) => { e.stopPropagation(); handleRevert(version); }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
