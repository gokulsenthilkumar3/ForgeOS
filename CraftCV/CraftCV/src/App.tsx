import { useState, useEffect } from 'react';
import { loadResume, saveResume } from './lib/storage';
import { ResumeData } from './types/resume';

export default function App() {
  const [resume, setResume] = useState<ResumeData>(loadResume);

  useEffect(() => {
    saveResume(resume);
  }, [resume]);

  return (
    <main className="flex h-screen">
      <div className="w-1/2 p-6 overflow-y-auto border-r">
        <h1 className="text-2xl font-bold mb-4">📝 CraftCV Editor</h1>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Full Name"
          value={resume.personal.name}
          onChange={e => setResume(r => ({ ...r, personal: { ...r.personal, name: e.target.value } }))}
        />
        {/* More fields to be added */}
      </div>
      <div className="w-1/2 p-6 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div className="border bg-white p-6 shadow">
          <h3 className="text-2xl font-bold">{resume.personal.name || 'Your Name'}</h3>
          <p className="text-gray-500">{resume.personal.email}</p>
        </div>
      </div>
    </main>
  );
}
