import { useState } from 'react';

// Basic page components
function Archive() { return <div><h2>Archive</h2><p>Saved jobs and previous results will appear here.</p></div>; }
function NewJob() { return <div><h2>New Job</h2><p>Start a new generation job.</p></div>; }
function Workspace() { return <div><h2>Workspace</h2><p>Current generation status.</p></div>; }
function Figures() { return <div><h2>Figures</h2><p>Generated SVG figures.</p></div>; }
function Settings() { return <div><h2>Settings</h2><p>API keys and configuration.</p></div>; }

function App() {
  const [currentPage, setCurrentPage] = useState('new');

  const pages: Record<string, React.ReactNode> = {
    'archive': <Archive />,
    'new': <NewJob />,
    'workspace': <Workspace />,
    'figures': <Figures />,
    'settings': <Settings />
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: '200px', backgroundColor: '#f0f0f0', padding: '1rem' }}>
        <h1>Study Genius+</h1>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><button onClick={() => setCurrentPage('new')}>New Job</button></li>
          <li><button onClick={() => setCurrentPage('workspace')}>Workspace</button></li>
          <li><button onClick={() => setCurrentPage('archive')}>Archive</button></li>
          <li><button onClick={() => setCurrentPage('figures')}>Figures</button></li>
          <li><button onClick={() => setCurrentPage('settings')}>Settings</button></li>
        </ul>
      </nav>
      <main style={{ padding: '2rem', flex: 1 }}>
        {pages[currentPage]}
      </main>
    </div>
  );
}

export default App;
