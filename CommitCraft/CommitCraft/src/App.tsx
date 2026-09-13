import { useState } from 'react';
import { generateCommitMessage } from './lib/generate';
import { getApiKey, addToHistory } from './lib/storage';

const TYPES = ['feat', 'fix', 'chore', 'refactor', 'docs', 'test', 'style', 'perf'];

export default function App() {
  const [diff, setDiff] = useState('');
  const [type, setType] = useState('feat');
  const [scope, setScope] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const msg = await generateCommitMessage(diff, type, scope, getApiKey());
      setOutput(msg);
      addToHistory(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🤖 CommitCraft</h1>
      <textarea
        className="w-full border rounded p-2 font-mono h-40 mb-3"
        placeholder="Paste your git diff here..."
        value={diff}
        onChange={e => setDiff(e.target.value)}
      />
      <div className="flex gap-3 mb-4">
        <select className="border rounded p-2" value={type} onChange={e => setType(e.target.value)}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          className="border rounded p-2 flex-1"
          placeholder="scope (optional)"
          value={scope}
          onChange={e => setScope(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 rounded disabled:opacity-50"
          onClick={handleGenerate}
          disabled={loading || !diff}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
      {output && (
        <div className="bg-gray-100 rounded p-3 font-mono text-sm">
          {output}
          <button
            className="ml-4 text-blue-600 text-xs"
            onClick={() => navigator.clipboard.writeText(output)}
          >
            Copy
          </button>
        </div>
      )}
    </main>
  );
}
