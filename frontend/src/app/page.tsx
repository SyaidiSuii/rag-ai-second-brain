"use client";

import { useEffect, useRef, useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

interface Project {
  project_id: string;
  name: string;
}

interface ChatSession {
  session_id: string;
  title: string;
}

interface Message {
  message_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

interface DocFile {
  document_id: string;
  file_name: string;
  file_type: string;
  status: "pending" | "processing" | "processed" | "failed";
  created_at: string;
}

interface SearchResult {
  chunk_id: string;
  source_file: string;
  content: string;
}

type Feedback = {
  type: "success" | "error";
  message: string;
};

const getErrorMessage = (err: unknown) => {
  return err instanceof Error ? err.message : "Tindakan gagal. Sila cuba lagi.";
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [projectDocs, setProjectDocs] = useState<DocFile[]>([]);

  const [newProjName, setNewProjName] = useState("");
  const [providerType, setProviderType] = useState("google");
  const [baseUrl, setBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta/openai/");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-1.5-flash");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeTab, setActiveTab] = useState<"chat" | "docs" | "search">("chat");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [authFeedback, setAuthFeedback] = useState<Feedback | null>(null);
  const [projectFeedback, setProjectFeedback] = useState<Feedback | null>(null);
  const [docsFeedback, setDocsFeedback] = useState<Feedback | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<Feedback | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (activeProject && token) {
      fetchSessions();
      fetchDocuments();
    } else {
      setSessions([]);
      setProjectDocs([]);
      setMessages([]);
      setActiveSession(null);
    }
  }, [activeProject, token]);

  useEffect(() => {
    if (activeSession && token) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeSession, token]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Pendaftaran gagal");

      setAuthFeedback({ type: "success", message: "Akaun berjaya didaftarkan. Sila log masuk." });
      setIsRegisterMode(false);
    } catch (err: unknown) {
      setAuthFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Log masuk gagal");

      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      setAuthFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProjects([]);
    setActiveProject(null);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleLogout();

      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0].project_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setProjectFeedback(null);

    try {
      const url = new URL(`${BACKEND_URL}/api/v1/projects`);
      url.searchParams.append("name", newProjName);
      url.searchParams.append("provider_type", providerType);
      url.searchParams.append("base_url", baseUrl);
      if (apiKey) url.searchParams.append("api_key", apiKey);
      url.searchParams.append("model_name", modelName);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal mencipta projek");

      setNewProjName("");
      setApiKey("");
      fetchProjects();
      setActiveProject(data.project_id);
      setProjectFeedback({ type: "success", message: "Projek berjaya dicipta." });
    } catch (err: unknown) {
      setProjectFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${activeProject}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        setActiveSession(data[0].session_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSession = async () => {
    if (!activeProject) return;
    setProjectFeedback(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${activeProject}/chats`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      fetchSessions();
      setActiveSession(data.session_id);
      setActiveTab("chat");
    } catch (err: unknown) {
      setProjectFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chats/${activeSession}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeSession || isChatLoading) return;

    const userPrompt = inputMessage;
    setInputMessage("");
    setIsChatLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "Membaca fail rujukan..." }]);

    try {
      const url = new URL(`${BACKEND_URL}/api/v1/chats/${activeSession}/messages/rag`);
      url.searchParams.append("prompt", userPrompt);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal berhubung dengan enjin AI");
      if (!response.body) throw new Error("Tiada penstriman respons ditemui");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulatedText,
            };
          }
          return updated;
        });
      }

      fetchSessions();
    } catch (err: unknown) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "system",
            content: `[Ralat RAG: ${getErrorMessage(err)}]`,
          };
        }
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${activeProject}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProjectDocs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !activeProject || isUploading) return;

    setIsUploading(true);
    setDocsFeedback(null);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${activeProject}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal memuat naik fail");

      setUploadFile(null);
      const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      setDocsFeedback({ type: "success", message: "Fail diterima. Penjanaan vektor sedang berjalan di latar belakang." });
      fetchDocuments();
    } catch (err: unknown) {
      setDocsFeedback({ type: "error", message: getErrorMessage(err) });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeProject || isSearching) return;

    setIsSearching(true);
    setSearchFeedback(null);

    try {
      const url = new URL(`${BACKEND_URL}/api/v1/projects/${activeProject}/search`);
      url.searchParams.append("query", searchQuery);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal melakukan carian");

      setSearchResults(data.results || []);
    } catch (err: unknown) {
      setSearchFeedback({ type: "error", message: getErrorMessage(err) });
    } finally {
      setIsSearching(false);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel">
          <div className="logo-header">
            <span className="logo-icon">SB</span>
            <h1>AI Second Brain</h1>
            <p>Memori projek, fail rujukan, dan carian semantik untuk developer.</p>
          </div>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="auth-form">
            <h2>{isRegisterMode ? "Daftar akaun baru" : "Log masuk workspace"}</h2>
            {authFeedback && (
              <div className={`feedback ${authFeedback.type}`} role="status">
                {authFeedback.message}
              </div>
            )}

            <div className="form-group">
              <label>E-mel</label>
              <input
                type="email"
                className="glass-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Kata Laluan</label>
              <input
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata laluan anda"
                required
              />
            </div>

            <button type="submit" className="btn-primary auth-submit">
              {isRegisterMode ? "Daftar Akaun" : "Log Masuk"}
            </button>
          </form>

          <div className="auth-toggle">
            {isRegisterMode ? (
              <p>Sudah mempunyai akaun? <span onClick={() => setIsRegisterMode(false)}>Log masuk di sini</span></p>
            ) : (
              <p>Belum mempunyai akaun? <span onClick={() => setIsRegisterMode(true)}>Daftar akaun baru</span></p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeProjectName = projects.find((p) => p.project_id === activeProject)?.name || "Pilih Projek untuk Bermula";

  return (
    <div className="dashboard-container">
      <aside className="sidebar glass-panel">
        <div className="sidebar-brand">
          <span className="logo-icon">SB</span>
          <div>
            <h2>Second Brain</h2>
            <p>RAG workspace</p>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Projek semasa</h3>
          <select
            value={activeProject || ""}
            onChange={(e) => {
              setActiveProject(e.target.value || null);
              setActiveSession(null);
            }}
            className="glass-input project-selector"
          >
            <option value="" disabled>Pilih Projek...</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="sidebar-section chat-sessions-section">
          <div className="section-header">
            <h3>Sejarah sembang</h3>
            <button onClick={handleCreateSession} className="new-chat-btn" title="Sembang Baru">
              +
            </button>
          </div>
          <div className="chat-sessions-list">
            {sessions.map((s) => (
              <button
                type="button"
                key={s.session_id}
                onClick={() => setActiveSession(s.session_id)}
                className={`chat-session-item ${activeSession === s.session_id ? "active" : ""}`}
              >
                <span className="item-marker">CH</span>{s.title}
              </button>
            ))}
            {sessions.length === 0 && <p className="empty-text">Tiada sejarah sembang.</p>}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">DEV</div>
            <span>Akaun Aktif</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary logout-btn">
            Log Keluar
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header glass-panel">
          <div className="header-project-name">
            <span className="eyebrow">Developer memory</span>
            <h1>{activeProjectName}</h1>
          </div>

          <nav className="tab-navigation" aria-label="Navigasi utama">
            <button onClick={() => setActiveTab("chat")} className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}>
              Sembang RAG
            </button>
            <button onClick={() => setActiveTab("docs")} className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}>
              Pengurus Fail
            </button>
            <button onClick={() => setActiveTab("search")} className={`tab-btn ${activeTab === "search" ? "active" : ""}`}>
              Carian Semantik
            </button>
          </nav>
        </header>

        <div className="metrics-strip">
          <div className="metric glass-panel">
            <span>Projek</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="metric glass-panel">
            <span>Sesi</span>
            <strong>{sessions.length}</strong>
          </div>
          <div className="metric glass-panel">
            <span>Fail</span>
            <strong>{projectDocs.length}</strong>
          </div>
        </div>

        <section className="tab-body">
          {!activeProject ? (
            <div className="no-project-panel glass-panel">
              <div className="empty-state-copy">
                <span className="eyebrow">Setup</span>
                <h2>Sediakan workspace projek pertama</h2>
                <p>Pilih atau cipta projek untuk memulakan pemprosesan dokumen, sembang RAG, dan carian vektor.</p>
              </div>

              <form onSubmit={handleCreateProject} className="create-project-inline">
                <h3>Cipta Projek Pertama Anda</h3>
                {projectFeedback && (
                  <div className={`feedback ${projectFeedback.type}`} role="status">
                    {projectFeedback.message}
                  </div>
                )}

                <div className="form-group">
                  <label>Nama Projek</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="Contoh: Projek Kedai E-Dagang"
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Jenis Pembekal LLM</label>
                    <select
                      value={providerType}
                      onChange={(e) => {
                        setProviderType(e.target.value);
                        if (e.target.value === "google") {
                          setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai/");
                          setModelName("gemini-1.5-flash");
                        } else {
                          setBaseUrl("http://localhost:11434/v1");
                          setModelName("llama3");
                        }
                      }}
                      className="glass-input"
                    >
                      <option value="google">Google AI Studio (Gemini)</option>
                      <option value="local">Ollama tempatan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Base URL API</label>
                    <input type="text" className="glass-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>API Key untuk Google Gemini</label>
                  <input
                    type="password"
                    className="glass-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Masukkan API Key AI Studio anda"
                  />
                </div>

                <div className="form-group">
                  <label>Nama Model AI</label>
                  <input type="text" className="glass-input" value={modelName} onChange={(e) => setModelName(e.target.value)} required />
                </div>

                <button type="submit" className="btn-primary">
                  Cipta Projek
                </button>
              </form>
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                <div className="chat-tab-container glass-panel">
                  {activeSession ? (
                    <>
                      <div className="chat-messages-area">
                        {messages.map((m, idx) => (
                          <div key={m.message_id || idx} className={`message-bubble-wrapper ${m.role}`}>
                            <div className="message-sender-tag">
                              {m.role === "user" ? "Anda" : m.role === "system" ? "Sistem" : "Second Brain AI"}
                            </div>
                            <div className="message-bubble">{m.content}</div>
                          </div>
                        ))}
                        <div ref={messageEndRef} />
                      </div>

                      <form onSubmit={handleSendMessage} className="chat-input-bar">
                        <input
                          type="text"
                          className="glass-input flex-1"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Tanya soalan mengenai kod sumber anda..."
                          disabled={isChatLoading}
                        />
                        <button type="submit" className="btn-primary" disabled={isChatLoading || !inputMessage.trim()}>
                          {isChatLoading ? "Menjana..." : "Hantar"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="empty-chat-state">
                      <h3>Mulakan sesi RAG</h3>
                      <p>Cipta sesi sembang untuk bertanya tentang fail dan keputusan teknikal projek ini.</p>
                      {projectFeedback && (
                        <div className={`feedback ${projectFeedback.type}`} role="status">
                          {projectFeedback.message}
                        </div>
                      )}
                      <button onClick={handleCreateSession} className="btn-primary">
                        Cipta Sesi Sembang
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "docs" && (
                <div className="docs-tab-container">
                  <div className="upload-section glass-panel">
                    <h2>Muat Naik Fail Rujukan Kod</h2>
                    <p>Format yang disokong: .txt, .md, .pdf, dan .zip untuk codebase projek.</p>
                    {docsFeedback && (
                      <div className={`feedback ${docsFeedback.type}`} role="status">
                        {docsFeedback.message}
                      </div>
                    )}

                    <form onSubmit={handleFileUpload} className="upload-form">
                      <input
                        type="file"
                        id="file-upload-input"
                        onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                        accept=".txt,.md,.zip,.pdf"
                        required
                      />
                      <button type="submit" className="btn-primary" disabled={isUploading || !uploadFile}>
                        {isUploading ? "Memuat naik..." : "Muat naik fail"}
                      </button>
                    </form>
                  </div>

                  <div className="docs-list-section glass-panel">
                    <div className="section-header">
                      <h2>Senarai Fail Projek</h2>
                      <button onClick={fetchDocuments} className="btn-secondary btn-sm">
                        Muat semula status
                      </button>
                    </div>

                    <table className="docs-table">
                      <thead>
                        <tr>
                          <th>Nama Fail</th>
                          <th>Jenis</th>
                          <th>Status Vektor</th>
                          <th>Tarikh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectDocs.map((d) => (
                          <tr key={d.document_id}>
                            <td className="file-name-cell">{d.file_name}</td>
                            <td><span className="file-type-badge">{d.file_type.toUpperCase()}</span></td>
                            <td>
                              <span className={`status-badge ${d.status}`}>
                                {d.status === "pending" && "Pending"}
                                {d.status === "processing" && "Processing"}
                                {d.status === "processed" && "Selesai"}
                                {d.status === "failed" && "Gagal"}
                              </span>
                            </td>
                            <td>{new Date(d.created_at).toLocaleString("ms-MY")}</td>
                          </tr>
                        ))}
                        {projectDocs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="empty-row">Tiada fail di dalam projek ini. Muat naik fail pertama untuk mula membina memori.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "search" && (
                <div className="search-tab-container">
                  <div className="search-input-panel glass-panel">
                    <h2>Carian jarak vektor kosinus</h2>
                    <p>Uji chunking dan carian jarak vektor terus dari database projek.</p>
                    {searchFeedback && (
                      <div className="feedback error" role="status">
                        {searchFeedback.message}
                      </div>
                    )}

                    <form onSubmit={handleSemanticSearch} className="search-bar-form">
                      <input
                        type="text"
                        className="glass-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Contoh: Celery background process"
                        required
                      />
                      <button type="submit" className="btn-primary" disabled={isSearching}>
                        {isSearching ? "Mencari..." : "Cari vektor"}
                      </button>
                    </form>
                  </div>

                  <div className="search-results-panel">
                    {searchResults.map((r, idx) => (
                      <div key={r.chunk_id} className="search-result-card glass-panel">
                        <div className="result-card-header">
                          <span className="rank-badge">#{idx + 1}</span>
                          <span className="file-origin-badge">{r.source_file}</span>
                        </div>
                        <div className="result-card-body">
                          <pre>{r.content}</pre>
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && searchQuery && !isSearching && (
                      <div className="no-results glass-panel">
                        Tiada serpihan yang serupa ditemui. Semak semula fail atau cuba frasa carian lain.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
