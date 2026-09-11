import React, { useState, useEffect } from 'react';

export const Sources = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const projectId = 'test-project'; // hardcoded for M06

  const loadSources = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/sources/project/${projectId}`);
      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    try {
      await fetch('http://localhost:3000/api/sources', {
        method: 'POST',
        body: formData
      });
      setFile(null);
      loadSources();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Fonti e Ingestione</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Carica nuova fonte</h3>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={handleUpload} disabled={!file}>Carica</button>
      </div>

      <h3>Fonti del progetto</h3>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome File</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Anomalie</th>
          </tr>
        </thead>
        <tbody>
          {sources.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #ccc' }}>
              <td>{s.id.substring(0, 8)}...</td>
              <td>{s.file_name}</td>
              <td>{s.mime_type}</td>
              <td>{s.status}</td>
              <td>{s.anomalies_json}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
