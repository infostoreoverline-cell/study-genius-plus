import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000/api/studio';

type View = 'studio' | 'figures' | 'archive' | 'settings';
type Provider = 'gemini' | 'deepseek';

type Profile = {
  id: string;
  name: string;
  focus: string;
  rules: string[];
};

type Project = {
  id: string;
  title: string;
  profileId: string;
  createdAt: string;
  sourcesCount: number;
  outputsCount: number;
  lastGeneratedAt: string | null;
};

type Source = {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  status: string;
  anomalies: string[];
  createdAt: string;
  unitsCount: number;
  charsCount: number;
};

type StudyOutput = {
  id: string;
  projectId: string;
  sourceId: string;
  title: string;
  profileId: string;
  mode: string;
  provider: string;
  model: string;
  content: string;
  createdAt: string;
  sourceName: string | null;
  projectTitle: string | null;
  visualsCount: number;
};

type StudyVisual = {
  id: string;
  outputId: string;
  projectId: string;
  sourceId: string;
  title: string;
  kind: 'concept-map' | 'study-flow' | 'term-frequency' | string;
  svg: string;
  altText: string;
  caption: string;
  createdAt: string;
};

type SettingsStatus = {
  configured: boolean;
  provider: Provider;
  model: string;
  source: 'environment' | 'session' | 'none';
};

function App() {
  const [view, setView] = useState<View>('studio');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [outputs, setOutputs] = useState<StudyOutput[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<StudyOutput | null>(null);
  const [visuals, setVisuals] = useState<StudyVisual[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [profileId, setProfileId] = useState('generale');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [settings, setSettings] = useState<SettingsStatus>({
    configured: false,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    source: 'none'
  });
  const [settingsProvider, setSettingsProvider] = useState<Provider>('gemini');
  const [settingsModel, setSettingsModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<'project' | 'upload' | 'generate' | 'settings' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === (activeProject?.profileId ?? profileId)) ?? null,
    [activeProject?.profileId, profileId, profiles]
  );

  const loadVisuals = useCallback(async (outputId: string | null) => {
    if (!outputId) {
      setVisuals([]);
      return;
    }
    const payload = await requestJson<{ visuals: StudyVisual[] }>(`/outputs/${outputId}/visuals`);
    setVisuals(payload.visuals);
  }, []);

  const loadProjectData = useCallback(async (projectId: string) => {
    const [sourcePayload, outputPayload] = await Promise.all([
      requestJson<{ sources: Source[] }>(`/projects/${projectId}/sources`),
      requestJson<{ outputs: StudyOutput[] }>(`/projects/${projectId}/outputs`)
    ]);
    setSources(sourcePayload.sources);
    setOutputs(outputPayload.outputs);
    setSelectedSourceId((current) => sourcePayload.sources.some((source) => source.id === current)
      ? current
      : sourcePayload.sources[0]?.id ?? '');
    const nextOutput = outputPayload.outputs[0] ?? null;
    setSelectedOutput(nextOutput);
    await loadVisuals(nextOutput?.id ?? null);
  }, [loadVisuals]);

  const refreshProjects = useCallback(async () => {
    const payload = await requestJson<{ projects: Project[] }>('/projects');
    setProjects(payload.projects);
    return payload.projects;
  }, []);

  useEffect(() => {
    let active = true;
    const initialise = async () => {
      try {
        const [profilePayload, projectPayload, settingsPayload] = await Promise.all([
          requestJson<{ profiles: Profile[] }>('/profiles'),
          requestJson<{ projects: Project[] }>('/projects'),
          requestJson<SettingsStatus>('/settings')
        ]);
        if (!active) return;
        setProfiles(profilePayload.profiles);
        setProjects(projectPayload.projects);
        setSettings(settingsPayload);
        setSettingsProvider(settingsPayload.provider);
        setSettingsModel(settingsPayload.model);
        if (profilePayload.profiles.some((profile) => profile.id === 'generale')) setProfileId('generale');

        const firstProject = projectPayload.projects[0];
        if (firstProject) {
          setActiveProjectId(firstProject.id);
          await loadProjectData(firstProject.id);
        }
      } catch (initialisationError) {
        if (active) setError(readError(initialisationError));
      }
    };
    void initialise();
    return () => { active = false; };
  }, [loadProjectData]);

  const selectProject = async (project: Project) => {
    setError(null);
    setNotice(null);
    setActiveProjectId(project.id);
    setSelectedOutput(null);
    try {
      await loadProjectData(project.id);
    } catch (loadError) {
      setError(readError(loadError));
    }
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('project');
    setError(null);
    setNotice(null);
    try {
      const payload = await requestJson<{ project: Project }>('/projects', {
        method: 'POST',
        body: JSON.stringify({ title: projectTitle, profileId })
      });
      setProjects((current) => [payload.project, ...current]);
      setActiveProjectId(payload.project.id);
      setSources([]);
      setOutputs([]);
      setSelectedSourceId('');
      setSelectedOutput(null);
      setVisuals([]);
      setProjectTitle('');
      setNotice('Progetto creato. Ora carica una fonte di studio.');
    } catch (creationError) {
      setError(readError(creationError));
    } finally {
      setBusy(null);
    }
  };

  const uploadSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject || !selectedFile) return;
    setBusy('upload');
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('projectId', activeProject.id);
      form.append('file', selectedFile);
      const payload = await requestJson<{ source: Source }>('/sources', { method: 'POST', body: form });
      setSources((current) => [payload.source, ...current]);
      setSelectedSourceId(payload.source.id);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshProjects();
      setNotice(`Fonte caricata: ${payload.source.fileName}`);
    } catch (uploadError) {
      setError(readError(uploadError));
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!activeProject || !selectedSourceId) return;
    setBusy('generate');
    setError(null);
    setNotice(null);
    try {
      const payload = await requestJson<{ output: StudyOutput; visuals: StudyVisual[] }>('/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject.id,
          sourceId: selectedSourceId,
          profileId: activeProject.profileId,
          useAi: useAi && settings.configured
        })
      });
      setOutputs((current) => [payload.output, ...current]);
      setSelectedOutput(payload.output);
      setVisuals(payload.visuals);
      await refreshProjects();
      setView('studio');
      setNotice(useAi && settings.configured
        ? `Riassunto AI e ${payload.visuals.length} visuali SVG generati e salvati nell’archivio locale.`
        : `Riassunto demo e ${payload.visuals.length} visuali SVG generati e salvati nell’archivio.`);
    } catch (generationError) {
      setError(readError(generationError));
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('settings');
    setError(null);
    setNotice(null);
    try {
      const payload = await requestJson<SettingsStatus>('/settings', {
        method: 'POST',
        body: JSON.stringify({ provider: settingsProvider, model: settingsModel, apiKey })
      });
      setSettings(payload);
      setApiKey('');
      setUseAi(true);
      setNotice('Provider configurato per questa sessione. La chiave non viene salvata sul disco.');
    } catch (settingsError) {
      setError(readError(settingsError));
    } finally {
      setBusy(null);
    }
  };

  const downloadOutput = async () => {
    if (!selectedOutput) return;
    await downloadBlob(
      `/outputs/${selectedOutput.id}/download`,
      `${safeFileName(selectedOutput.title)}-riassunto.md`,
      'Download Markdown non disponibile.',
      setError
    );
  };

  const downloadPdf = async () => {
    if (!selectedOutput) return;
    await downloadBlob(
      `/outputs/${selectedOutput.id}/download/pdf`,
      `${safeFileName(selectedOutput.title)}-riassunto.pdf`,
      'Download PDF non disponibile.',
      setError
    );
  };

  const downloadVisual = async (visual: StudyVisual) => {
    await downloadBlob(
      `/visuals/${visual.id}/download`,
      `${safeFileName(visual.title)}.svg`,
      'Download SVG non disponibile.',
      setError
    );
  };

  const openFigures = () => {
    if (!selectedOutput) return;
    setView('figures');
  };

  const selectOutput = async (output: StudyOutput, destination: View = 'studio') => {
    setError(null);
    setNotice(null);
    setSelectedOutput(output);
    setView(destination);
    try {
      await loadVisuals(output.id);
    } catch (visualError) {
      setError(readError(visualError));
    }
  };

  const printOutputWithVisuals = () => {
    if (!selectedOutput) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Il browser ha bloccato la finestra di stampa. Consenti i popup e riprova.');
      return;
    }
    printWindow.document.write(buildPrintDocument(selectedOutput, visuals));
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 220);
  };

  const copyOutput = async () => {
    if (!selectedOutput) return;
    try {
      await navigator.clipboard.writeText(selectedOutput.content);
      setNotice('Riassunto copiato negli appunti.');
    } catch {
      setError('Impossibile copiare automaticamente. Puoi selezionare il testo nel documento.');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S+</div>
          <div>
            <strong>StudyGenius+</strong>
            <span>local-first workspace</span>
          </div>
        </div>
        <nav aria-label="Navigazione principale">
          <NavButton active={view === 'studio'} label="Studio" icon="✦" onClick={() => setView('studio')} />
          <NavButton active={view === 'figures'} label="Mappe e grafici" icon="◌" onClick={() => setView('figures')} />
          <NavButton active={view === 'archive'} label="Archivio" icon="▣" onClick={() => setView('archive')} />
          <NavButton active={view === 'settings'} label="Impostazioni" icon="⚙" onClick={() => setView('settings')} />
        </nav>
        <div className="sidebar-footnote">
          <span className="status-dot" />
          Dati sul tuo computer
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{view === 'studio' ? 'Nuovo materiale di studio' : view === 'figures' ? 'Visuali generate dalla fonte' : view === 'archive' ? 'Risultati salvati' : 'Generazione AI facoltativa'}</p>
            <h1>{view === 'studio' ? 'Il tuo spazio di studio' : view === 'figures' ? 'Mappe e grafici' : view === 'archive' ? 'Archivio locale' : 'Impostazioni'}</h1>
          </div>
          {activeProject && <div className="active-project-pill">{activeProject.title}</div>}
        </header>

        {(notice || error) && (
          <div className={`message ${error ? 'message-error' : 'message-success'}`} role="status">
            <span>{error ? '!' : '✓'}</span>
            <p>{error ?? notice}</p>
            <button type="button" aria-label="Chiudi messaggio" onClick={() => { setError(null); setNotice(null); }}>×</button>
          </div>
        )}

        {view === 'studio' && (
          <section className="page-grid">
            <div className="setup-column">
              <section className="card project-card">
                <div className="card-heading">
                  <span className="step-number">1</span>
                  <div>
                    <h2>Crea un progetto</h2>
                    <p>Una materia, un esame o un argomento alla volta.</p>
                  </div>
                </div>
                <form className="form-stack" onSubmit={createProject}>
                  <label>
                    Titolo
                    <input
                      value={projectTitle}
                      onChange={(event) => setProjectTitle(event.target.value)}
                      placeholder="Es. Meccanica razionale — esame di giugno"
                      maxLength={120}
                      required
                    />
                  </label>
                  <label>
                    Profilo disciplinare
                    <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
                      {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                    </select>
                  </label>
                  <button className="button button-secondary" type="submit" disabled={busy === 'project'}>
                    {busy === 'project' ? 'Creo il progetto…' : 'Crea progetto'}
                  </button>
                </form>
              </section>

              <section className="card source-card">
                <div className="card-heading">
                  <span className="step-number">2</span>
                  <div>
                    <h2>Carica una fonte</h2>
                    <p>PDF con testo selezionabile, TXT o Markdown — fino a 15 MB.</p>
                  </div>
                </div>
                <form className="form-stack" onSubmit={uploadSource}>
                  <label className={`file-picker ${activeProject ? '' : 'is-disabled'}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                      disabled={!activeProject || busy === 'upload'}
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                    <span className="file-icon">↥</span>
                    <span>{selectedFile ? selectedFile.name : activeProject ? 'Scegli un file' : 'Crea prima un progetto'}</span>
                    <small>{selectedFile ? formatBytes(selectedFile.size) : 'Il file non viene inviato fuori dal tuo computer in modalità demo.'}</small>
                  </label>
                  <button className="button button-secondary" type="submit" disabled={!activeProject || !selectedFile || busy === 'upload'}>
                    {busy === 'upload' ? 'Estraggo il testo…' : 'Carica fonte'}
                  </button>
                </form>
              </section>

              <section className="card generate-card">
                <div className="card-heading">
                  <span className="step-number">3</span>
                  <div>
                    <h2>Genera il riassunto</h2>
                    <p>Un primo output leggibile e scaricabile in Markdown.</p>
                  </div>
                </div>
                <div className="form-stack">
                  <label>
                    Fonte da elaborare
                    <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)} disabled={!activeProject || sources.length === 0}>
                      <option value="">{sources.length ? 'Seleziona una fonte' : 'Nessuna fonte caricata'}</option>
                      {sources.map((source) => <option key={source.id} value={source.id}>{source.fileName}</option>)}
                    </select>
                  </label>
                  <label className={`toggle-row ${settings.configured ? '' : 'is-disabled'}`}>
                    <input
                      type="checkbox"
                      checked={useAi && settings.configured}
                      disabled={!settings.configured}
                      onChange={(event) => setUseAi(event.target.checked)}
                    />
                    <span>
                      <strong>Usa il provider AI configurato</strong>
                      <small>{settings.configured ? `${settings.provider} · ${settings.model}` : 'Non configurato: verrà usata la modalità demo locale.'}</small>
                    </span>
                  </label>
                  <button className="button button-primary" type="button" onClick={() => void generate()} disabled={!activeProject || !selectedSourceId || busy === 'generate'}>
                    {busy === 'generate' ? 'Creo il riassunto…' : useAi && settings.configured ? 'Genera con AI' : 'Genera in modalità demo'}
                  </button>
                </div>
              </section>
            </div>

            <section className="workspace-panel" aria-label="Risultato di studio">
              {selectedOutput ? (
                <article className="result-card">
                  <header className="result-header">
                    <div>
                      <p className="eyebrow">{selectedOutput.provider === 'demo' ? 'Output locale' : `Output ${selectedOutput.provider}`}</p>
                      <h2>{selectedOutput.title}</h2>
                      <p className="result-meta">{selectedOutput.sourceName ?? 'Fonte'} · {formatDate(selectedOutput.createdAt)}</p>
                    </div>
                    <div className="result-actions">
                      <button type="button" onClick={() => void copyOutput()}>Copia</button>
                      <button type="button" onClick={() => void downloadOutput()}>Scarica .md</button>
                      <button type="button" onClick={() => void downloadPdf()}>Scarica PDF</button>
                      <button type="button" onClick={printOutputWithVisuals}>PDF con SVG</button>
                      <button type="button" onClick={openFigures}>Mappe ({visuals.length})</button>
                    </div>
                  </header>
                  <MarkdownDocument content={selectedOutput.content} />
                  <VisualPreview visuals={visuals} onDownload={downloadVisual} onOpen={openFigures} />
                </article>
              ) : (
                <div className="empty-workspace">
                  <div className="empty-icon">⌁</div>
                  <h2>{activeProject ? 'Il prossimo risultato apparirà qui' : 'Inizia da un progetto'}</h2>
                  <p>{activeProject
                    ? 'Carica una fonte e genera il primo riassunto. Ogni output resterà disponibile nell’archivio locale.'
                    : 'Crea un progetto sulla sinistra per organizzare appunti, dispense e riassunti.'}
                  </p>
                  {activeProfile && <div className="profile-note"><strong>Profilo attivo:</strong> {activeProfile.name} — {activeProfile.focus}</div>}
                </div>
              )}
            </section>
          </section>
        )}

        {view === 'figures' && (
          <section className="figures-page card">
            <div className="figure-page-heading">
              <div>
                <p className="eyebrow">Generazione locale e verificabile</p>
                <h2>{selectedOutput ? `Visuali di ${selectedOutput.title}` : 'Scegli un riassunto'}</h2>
                <p>Le mappe e il grafico sono derivati dal testo estratto. Il grafico mostra occorrenze nel documento, non dati inventati della materia.</p>
              </div>
              {outputs.length > 0 && (
                <label className="output-selector">
                  Riassunto
                  <select
                    value={selectedOutput?.id ?? ''}
                    onChange={(event) => {
                      const output = outputs.find((candidate) => candidate.id === event.target.value);
                      if (output) void selectOutput(output, 'figures');
                    }}
                  >
                    {outputs.map((output) => <option key={output.id} value={output.id}>{output.sourceName ?? output.title}</option>)}
                  </select>
                </label>
              )}
            </div>
            {selectedOutput ? (
              <VisualGallery visuals={visuals} onDownload={downloadVisual} />
            ) : (
              <div className="empty-figures">
                <div className="empty-icon">◌</div>
                <h2>Ancora nessuna visuale</h2>
                <p>Genera un riassunto a partire da una fonte: StudyGenius+ creerà mappe, uno schema di studio e un grafico di frequenza dei concetti.</p>
              </div>
            )}
          </section>
        )}

        {view === 'archive' && (
          <section className="archive-layout">
            <div className="card archive-projects">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Progetti</p>
                  <h2>Le tue raccolte</h2>
                </div>
                <span>{projects.length}</span>
              </div>
              <div className="project-list">
                {projects.length === 0 && <p className="muted">Non hai ancora creato progetti.</p>}
                {projects.map((project) => (
                  <button className={`project-list-item ${project.id === activeProjectId ? 'is-active' : ''}`} key={project.id} type="button" onClick={() => void selectProject(project)}>
                    <strong>{project.title}</strong>
                    <span>{project.sourcesCount} fonti · {project.outputsCount} riassunti</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="card archive-outputs">
              <div className="section-title">
                <div>
                  <p className="eyebrow">{activeProject?.title ?? 'Seleziona un progetto'}</p>
                  <h2>Riassunti salvati</h2>
                </div>
                <span>{outputs.length}</span>
              </div>
              <div className="output-list">
                {!activeProject && <p className="muted">Seleziona un progetto per vederne i risultati.</p>}
                {activeProject && outputs.length === 0 && <p className="muted">Questo progetto non contiene ancora riassunti.</p>}
                {outputs.map((output) => (
                  <button className={`output-list-item ${output.id === selectedOutput?.id ? 'is-active' : ''}`} key={output.id} type="button" onClick={() => void selectOutput(output)}>
                    <span className="output-badge">{output.provider === 'demo' ? 'Demo' : 'AI'}</span>
                    <div>
                      <strong>{output.sourceName ?? output.title}</strong>
                      <span>{formatDate(output.createdAt)} · {output.model}</span>
                    </div>
                    <span className="chevron">›</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'settings' && (
          <section className="settings-layout">
            <div className="card settings-card">
              <p className="eyebrow">Opzionale</p>
              <h2>Provider AI</h2>
              <p className="settings-intro">Senza configurazione, StudyGenius+ funziona in modalità demo locale. Se inserisci una chiave, viene mantenuta soltanto nella memoria del server fino al riavvio.</p>
              <form className="form-stack" onSubmit={saveSettings}>
                <label>
                  Provider
                  <select value={settingsProvider} onChange={(event) => {
                    const provider = event.target.value as Provider;
                    setSettingsProvider(provider);
                    setSettingsModel(provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat');
                  }}>
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </label>
                <label>
                  Modello
                  <input value={settingsModel} onChange={(event) => setSettingsModel(event.target.value)} placeholder="Nome del modello" required />
                </label>
                <label>
                  Chiave API
                  <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Incolla la chiave solo sul tuo computer" autoComplete="off" required />
                </label>
                <button className="button button-primary" type="submit" disabled={busy === 'settings'}>
                  {busy === 'settings' ? 'Configuro…' : 'Configura per questa sessione'}
                </button>
              </form>
            </div>
            <aside className="settings-status card">
              <p className="eyebrow">Stato attuale</p>
              <h2>{settings.configured ? 'Provider pronto' : 'Solo modalità demo'}</h2>
              <dl>
                <div><dt>Provider</dt><dd>{settings.configured ? settings.provider : '—'}</dd></div>
                <div><dt>Modello</dt><dd>{settings.configured ? settings.model : '—'}</dd></div>
                <div><dt>Origine</dt><dd>{settings.source === 'environment' ? '.env locale' : settings.source === 'session' ? 'sessione corrente' : 'nessuna chiave'}</dd></div>
              </dl>
              <p className="small-note">Puoi anche impostare la chiave in un file <code>.env</code>, seguendo il README. Non incollare mai chiavi in GitHub o in una chat.</p>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'is-active' : ''}`} type="button" onClick={onClick}><span>{icon}</span>{label}</button>;
}

function MarkdownDocument({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{inlineMarkdown(paragraph.join(' '))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`l-${blocks.length}`}>{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</ul>);
      list = [];
    }
  };

  for (const rawLine of content.split(/\r?\n/gu)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = inlineMarkdown(heading[2]);
      if (level === 1) blocks.push(<h1 key={`h-${blocks.length}`}>{text}</h1>);
      else if (level === 2) blocks.push(<h2 key={`h-${blocks.length}`}>{text}</h2>);
      else blocks.push(<h3 key={`h-${blocks.length}`}>{text}</h3>);
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={`q-${blocks.length}`}>{inlineMarkdown(line.slice(2))}</blockquote>);
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return <div className="markdown-document">{blocks}</div>;
}

function VisualPreview({ visuals, onDownload, onOpen }: {
  visuals: StudyVisual[];
  onDownload: (visual: StudyVisual) => Promise<void>;
  onOpen: () => void;
}) {
  if (visuals.length === 0) {
    return <section className="visual-preview-empty"><strong>Visuali non disponibili per questo output.</strong><span>Rigenera il riassunto per creare mappe e grafici SVG.</span></section>;
  }
  return (
    <section className="visual-preview">
      <div className="visual-preview-heading">
        <div>
          <p className="eyebrow">SVG generati dalla fonte</p>
          <h3>Mappe e grafici per il ripasso</h3>
        </div>
        <button type="button" onClick={onOpen}>Apri galleria</button>
      </div>
      <VisualGallery visuals={visuals} onDownload={onDownload} />
    </section>
  );
}

function VisualGallery({ visuals, onDownload }: {
  visuals: StudyVisual[];
  onDownload: (visual: StudyVisual) => Promise<void>;
}) {
  if (visuals.length === 0) return <p className="muted visual-gallery-empty">Questa generazione non contiene ancora visuali. Rigenera l’output per crearle.</p>;
  return (
    <div className="visual-gallery">
      {visuals.map((visual) => (
        <article className="visual-card" key={visual.id}>
          <div className="visual-card-topline">
            <span>{visualKindLabel(visual.kind)}</span>
            <button type="button" onClick={() => void onDownload(visual)}>Scarica SVG</button>
          </div>
          <img className="visual-image" src={svgDataUrl(visual.svg)} alt={visual.altText} />
          <div className="visual-card-copy">
            <h3>{visual.title}</h3>
            <p>{visual.caption}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function inlineMarkdown(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`)/gu).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error('Non riesco a raggiungere il server. Avvialo con npm run dev:server e riprova.');
  }
  const data = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Operazione non riuscita.');
  return data as T;
}

async function downloadBlob(path: string, fileName: string, unavailableMessage: string, setError: (message: string | null) => void): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(unavailableMessage);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (downloadError) {
    setError(readError(downloadError));
  }
}

function svgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function visualKindLabel(kind: StudyVisual['kind']): string {
  if (kind === 'concept-map') return 'Mappa concettuale';
  if (kind === 'study-flow') return 'Schema di studio';
  if (kind === 'term-frequency') return 'Grafico di frequenza';
  return 'Visuale di studio';
}

function buildPrintDocument(output: StudyOutput, visuals: StudyVisual[]): string {
  const visualHtml = visuals.map((visual) => `
    <section class="visual">
      <img src="${escapeHtml(svgDataUrl(visual.svg))}" alt="${escapeHtml(visual.altText)}" />
      <h2>${escapeHtml(visual.title)}</h2>
      <p>${escapeHtml(visual.caption)}</p>
    </section>`).join('');
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(output.title)} — StudyGenius+</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { color: #233449; font: 11pt/1.58 Arial, sans-serif; }
    header { border-bottom: 2px solid #1c7f78; margin-bottom: 18px; padding-bottom: 11px; }
    h1 { color: #173d52; font-size: 24pt; margin: 0 0 4px; }
    h2 { color: #1c5960; font-size: 15pt; margin: 23px 0 8px; }
    h3 { color: #31546a; font-size: 12pt; margin: 17px 0 6px; }
    p, li { margin: 0 0 8px; }
    blockquote { border-left: 3px solid #6bbeb0; color: #496a71; margin: 10px 0; padding: 7px 11px; background: #f1faf7; }
    ul { padding-left: 20px; }
    .meta { color: #60748b; font-size: 9.5pt; }
    .visual { break-inside: avoid; border-top: 1px solid #d7e3e3; margin-top: 22px; padding-top: 18px; }
    .visual img { display: block; width: 100%; max-height: 168mm; object-fit: contain; }
    .visual p { color: #61748a; font-size: 9.5pt; }
    .footer-note { color: #68798e; font-size: 8.5pt; margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(output.title)}</h1>
    <p class="meta">StudyGenius+ · ${escapeHtml(output.sourceName ?? 'Fonte')} · ${escapeHtml(formatDate(output.createdAt))}</p>
  </header>
  ${printableMarkdown(output.content)}
  ${visualHtml ? `<h2>Mappe e grafici SVG</h2>${visualHtml}` : ''}
  <p class="footer-note">Visuali generate a partire dal testo estratto: confronta sempre formule, tabelle e figure con la fonte originale.</p>
</body>
</html>`;
}

function printableMarkdown(content: string): string {
  const parts: string[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length > 0) {
      parts.push(`<ul>${list.map((item) => `<li>${printableInline(item)}</li>`).join('')}</ul>`);
      list = [];
    }
  };
  for (const rawLine of content.split(/\r?\n/gu)) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading) {
      flushList();
      const tag = `h${heading[1].length}`;
      parts.push(`<${tag}>${printableInline(heading[2])}</${tag}>`);
      continue;
    }
    if (line.startsWith('> ')) {
      flushList();
      parts.push(`<blockquote>${printableInline(line.slice(2))}</blockquote>`);
      continue;
    }
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    parts.push(`<p>${printableInline(line)}</p>`);
  }
  flushList();
  return parts.join('\n');
}

function printableInline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/`([^`]+)`/gu, '<code>$1</code>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileName(value: string): string {
  return value.toLocaleLowerCase('it').replace(/[^a-z0-9]+/gu, '-').replace(/(^-|-$)/gu, '') || 'studygenius';
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Si e verificato un errore inatteso.';
}

export default App;
