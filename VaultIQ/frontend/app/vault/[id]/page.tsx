"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import Shell from "@/components/Shell";
import RoleGuard from "@/components/RoleGuard";

export default function EntryDetailView() {
  const params = useParams();
  const router = useRouter();
  const { entries, deleteEntry } = useVault();
  
  const [entry, setEntry] = useState<any>(null);

  useEffect(() => {
    if (entries && params.id) {
      const found = entries.find((e) => e.id === params.id);
      if (found) {
        setEntry(found);
      }
    }
  }, [entries, params.id]);

  if (!entry) {
    return (
      <RoleGuard roles={['ADMIN', 'USER']}>
        <Shell>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Loading entry...</p>
          </div>
        </Shell>
      </RoleGuard>
    );
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this entry?")) {
      await deleteEntry(entry.id);
      router.push("/vault");
    }
  };

  return (
    <RoleGuard roles={['ADMIN', 'USER']}>
      <Shell>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">{entry.title}</h1>
            <p className="page-subtitle">{entry.type}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary">Edit</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>

        <div className="card">
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">Username</label>
            <input type="text" className="input" value={entry.username || ""} readOnly />
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">Website</label>
            <input type="text" className="input" value={entry.websiteUrl || ""} readOnly />
          </div>

          <div className="input-group">
            <label className="input-label">Decrypted Data</label>
            <textarea 
              className="input mono" 
              style={{ minHeight: '100px', resize: 'vertical' }}
              readOnly 
              value={JSON.stringify(entry.decryptedData, null, 2)} 
            />
          </div>
        </div>
      </Shell>
    </RoleGuard>
  );
}
