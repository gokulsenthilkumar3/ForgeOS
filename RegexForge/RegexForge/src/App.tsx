import { useState, useEffect } from 'react';
import { runRegex } from './lib/regex';
import { decodeState } from './lib/share';

export default function App() {
  const initial = decodeState();
  const [pattern, setPattern] = useState(initial.pattern);
  const [flags, setFlags] = useState(initial.flags);
  const [input, setInput] = useState(initial.input);

  const matches = runRegex(pattern, flags, input);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 RegexForge</h1>
      <input
        className="w-full border rounded p-2 font-mono mb-2"
        placeholder="Enter regex pattern..."
        value={pattern}
        onChange={e => setPattern(e.target.value)}
      />
      <textarea
        className="w-full border rounded p-2 font-mono mb-2 h-32"
        placeholder="Test string..."
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <p className="text-sm text-gray-600">{matches.length} match(es) found</p>
    </main>
  );
}
