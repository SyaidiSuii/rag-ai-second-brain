"use client";

import { useEffect, useRef, useState } from "react";
import LoginPage from "./components/LoginPage";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

interface Project {
  project_id: string;
  name: string;
  llm_config?: {
    provider: string;
    model: string;
    base_url: string;
  };
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

  const handleProviderSelect = (type: string) => {
    setProviderType(type);
    if (type === "google") {
      setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai/");
      setModelName("gemini-1.5-flash");
    } else if (type === "openai") {
      setBaseUrl("https://api.openai.com/v1");
      setModelName("gpt-4o-mini");
    } else if (type === "openrouter") {
      setBaseUrl("https://openrouter.ai/api/v1");
      setModelName("anthropic/claude-3.5-sonnet");
    } else if (type === "deepseek") {
      setBaseUrl("https://api.deepseek.com/v1");
      setModelName("deepseek-chat");
    } else if (type === "groq") {
      setBaseUrl("https://api.groq.com/openai/v1");
      setModelName("llama-3.3-70b-versatile");
    } else if (type === "local") {
      setBaseUrl("http://localhost:11434/v1");
      setModelName("llama3");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeTab, setActiveTab] = useState<"chat" | "docs" | "search" | "settings">("chat");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ponytail: Tetapan Model & AI Projek
  const [editProjName, setEditProjName] = useState("");
  const [editProviderType, setEditProviderType] = useState("google");
  const [editBaseUrl, setEditBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta/openai/");
  const [editApiKey, setEditApiKey] = useState("");
  const [editModelName, setEditModelName] = useState("gemini-1.5-flash");
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const handleEditProviderSelect = (type: string) => {
    setEditProviderType(type);
    if (type === "google") {
      setEditBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai/");
      setEditModelName("gemini-1.5-flash");
    } else if (type === "openai") {
      setEditBaseUrl("https://api.openai.com/v1");
      setEditModelName("gpt-4o-mini");
    } else if (type === "openrouter") {
      setEditBaseUrl("https://openrouter.ai/api/v1");
      setEditModelName("anthropic/claude-3.5-sonnet");
    } else if (type === "deepseek") {
      setEditBaseUrl("https://api.deepseek.com/v1");
      setEditModelName("deepseek-chat");
    } else if (type === "groq") {
      setEditBaseUrl("https://api.groq.com/openai/v1");
      setEditModelName("llama-3.3-70b-versatile");
    } else if (type === "local") {
      setEditBaseUrl("http://localhost:11434/v1");
      setEditModelName("llama3");
    }
  };

  const [projectFeedback, setProjectFeedback] = useState<Feedback | null>(null);
  const [docsFeedback, setDocsFeedback] = useState<Feedback | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<Feedback | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
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
    if (activeProject) {
      const current = projects.find((p) => p.project_id === activeProject);
      if (current) {
        setEditProjName(current.name || "");
        if (current.llm_config) {
          setEditProviderType(current.llm_config.provider || "google");
          setEditBaseUrl(current.llm_config.base_url || "");
          setEditModelName(current.llm_config.model || "");
          setEditApiKey("");
        }
      }
    }
  }, [activeProject, projects]);

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



  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    setToken(null);
    setProjects([]);
    setActiveProject(null);
  };

  const fetchProjects = async (targetProjectId?: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return handleLogout();

      const data = await res.json();
      setProjects(data);
      if (targetProjectId) {
        setActiveProject(targetProjectId);
      } else if (data.length > 0 && !activeProject) {
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
      await fetchProjects(data.project_id);
      setActiveProject(data.project_id);
      setProjectFeedback({ type: "success", message: "Projek berjaya dicipta." });
    } catch (err: unknown) {
      setProjectFeedback({ type: "error", message: getErrorMessage(err) });
    }
  };

  // ponytail: Kemas kini tetapan AI & model projek aktif
  const handleUpdateProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setSettingsFeedback(null);
    setIsUpdatingSettings(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${activeProject}/llm-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editProjName,
          provider_type: editProviderType,
          base_url: editBaseUrl,
          api_key: editApiKey || undefined,
          model_name: editModelName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal mengemas kini tetapan projek");

      setEditApiKey("");
      await fetchProjects(activeProject);
      setSettingsFeedback({ type: "success", message: "Model & Tetapan AI berjaya dikemas kini!" });
    } catch (err: unknown) {
      setSettingsFeedback({ type: "error", message: getErrorMessage(err) });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // ponytail: Padam projek
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Adakah anda pasti mahu memadam projek ini beserta fail dan sejarah sembangnya?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal memadam projek");
      }
      setActiveProject(null);
      await fetchProjects();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chats/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal memadam sesi sembang");
      }

      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
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
      <LoginPage
        backendUrl={BACKEND_URL}
        onLoginSuccess={(newToken) => setToken(newToken)}
      />
    );
  }

  const currentProject = projects.find((p) => p.project_id === activeProject);
  const activeProjectName = currentProject?.name || "Pilih Projek untuk Bermula";
  const activeProjectModel = currentProject?.llm_config?.model || null;

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
          <div className="section-header">
            <h3>Projek semasa</h3>
            <button
              onClick={() => {
                setActiveProject(null);
                setNewProjName("");
              }}
              className="new-chat-btn"
              title="Cipta Projek Baru"
            >
              +
            </button>
          </div>
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
              <div key={s.session_id} style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setActiveSession(s.session_id)}
                  className={`chat-session-item ${activeSession === s.session_id ? "active" : ""}`}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <span className="item-marker">CH</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Adakah anda pasti mahu memadam sesi sembang ini?")) {
                      handleDeleteSession(s.session_id);
                    }
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(225, 121, 114, 0.7)",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    lineHeight: 1
                  }}
                  title="Padam Sesi Sembang"
                >
                  🗑️
                </button>
              </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="eyebrow">Developer memory</span>
              {activeProjectModel && (
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  title="Klik untuk ubah model AI"
                  style={{
                    fontSize: "11px",
                    background: "rgba(153, 194, 107, 0.15)",
                    color: "#b7df84",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(183, 223, 132, 0.3)",
                    fontFamily: "var(--font-code)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  🤖 {activeProjectModel} <span style={{ opacity: 0.7, fontSize: "10px" }}>✎</span>
                </button>
              )}
            </div>
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
            <button onClick={() => setActiveTab("settings")} className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}>
              ⚙️ Tetapan Model AI
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
                <span className="eyebrow">Setup Projek</span>
                <h2>Pilih & Sediakan Enjin AI Projek</h2>
                <p>Cipta projek baharu dan pilih mana-mana enjin AI (Google Gemini, OpenAI, Claude via OpenRouter, DeepSeek, Groq, atau Ollama Tempatan).</p>
              </div>

              <form onSubmit={handleCreateProject} className="create-project-inline">
                <h3>Cipta Projek & Pilih AI Model</h3>
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
                    <label>Penyedia AI / LLM Model</label>
                    <select
                      value={providerType}
                      onChange={(e) => handleProviderSelect(e.target.value)}
                      className="glass-input"
                    >
                      <option value="google">Google AI Studio (Gemini 1.5/2.0)</option>
                      <option value="openrouter">OpenRouter (Claude 3.5 / DeepSeek R1 / Llama)</option>
                      <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                      <option value="deepseek">DeepSeek Direct (deepseek-chat)</option>
                      <option value="groq">Groq Console (llama-3.3-70b - Fast)</option>
                      <option value="local">Ollama Tempatan (Offline / Local)</option>
                      <option value="custom">Custom (Manual Base URL)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Base URL API</label>
                    <input type="text" className="glass-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    API Key {providerType === "local" ? "(Opsional)" : `untuk ${providerType.toUpperCase()}`}
                  </label>
                  <input
                    type="password"
                    className="glass-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={providerType === "local" ? "Kosongkan untuk Ollama" : `Masukkan API Key ${providerType} anda`}
                  />
                </div>

                <div className="form-group">
                  <label>Nama Model AI (`model_name`)</label>
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

              {activeTab === "settings" && (
                <div className="glass-panel" style={{ padding: "32px", maxWidth: "800px", margin: "0 auto", overflowY: "auto", width: "100%" }}>
                  <div style={{ marginBottom: "24px" }}>
                    <span className="eyebrow">Konfigurasi Projek</span>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", marginTop: "4px" }}>Tetapan Model & Enjin AI</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
                      Tukar pembekal AI, tukar model (cth: GPT-4o, Claude 3.5, Gemini, DeepSeek, Ollama), atau kemas kini API Key untuk projek semasa.
                    </p>
                  </div>

                  {settingsFeedback && (
                    <div className={`feedback ${settingsFeedback.type}`} role="status" style={{ marginBottom: "20px" }}>
                      {settingsFeedback.message}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProjectSettings} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div className="form-group">
                      <label>Nama Projek</label>
                      <input
                        type="text"
                        className="glass-input"
                        value={editProjName}
                        onChange={(e) => setEditProjName(e.target.value)}
                        placeholder="Nama projek anda"
                        required
                      />
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Penyedia AI / LLM Model</label>
                        <select
                          value={editProviderType}
                          onChange={(e) => handleEditProviderSelect(e.target.value)}
                          className="glass-input"
                        >
                          <option value="google">Google AI Studio (Gemini 1.5/2.0)</option>
                          <option value="openrouter">OpenRouter (Claude 3.5 / DeepSeek R1 / Llama)</option>
                          <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                          <option value="deepseek">DeepSeek Direct (deepseek-chat)</option>
                          <option value="groq">Groq Console (llama-3.3-70b - Fast)</option>
                          <option value="local">Ollama Tempatan (Offline / Local)</option>
                          <option value="custom">Custom (Manual Base URL)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Base URL API</label>
                        <input
                          type="text"
                          className="glass-input"
                          value={editBaseUrl}
                          onChange={(e) => setEditBaseUrl(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        API Key {editProviderType === "local" ? "(Opsional)" : `untuk ${editProviderType.toUpperCase()}`}
                      </label>
                      <input
                        type="password"
                        className="glass-input"
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                        placeholder="Biarkan kosong untuk mengekalkan API Key sedia ada"
                      />
                    </div>

                    <div className="form-group">
                      <label>Nama Model AI (`model_name`)</label>
                      <input
                        type="text"
                        className="glass-input"
                        value={editModelName}
                        onChange={(e) => setEditModelName(e.target.value)}
                        required
                      />
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>Pilihan Cepat:</span>
                        {[
                          "gemini-1.5-flash",
                          "gemini-2.0-flash",
                          "gpt-4o",
                          "gpt-4o-mini",
                          "anthropic/claude-3.5-sonnet",
                          "deepseek/deepseek-r1",
                          "deepseek-chat",
                          "llama-3.3-70b-versatile",
                          "llama3"
                        ].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setEditModelName(m)}
                            style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              border: "1px solid var(--border)",
                              background: editModelName === m ? "var(--accent-primary)" : "rgba(255,255,255,0.05)",
                              color: editModelName === m ? "#000" : "var(--text-secondary)",
                              cursor: "pointer",
                              fontWeight: editModelName === m ? "700" : "normal"
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "16px", alignItems: "center", justifyContent: "space-between" }}>
                      <button type="submit" className="btn-primary" disabled={isUpdatingSettings}>
                        {isUpdatingSettings ? "Mengemas kini..." : "💾 Simpan & Kemas Kini Model AI"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(activeProject)}
                        style={{
                          background: "rgba(225, 121, 114, 0.15)",
                          color: "var(--accent-danger)",
                          border: "1px solid rgba(225, 121, 114, 0.3)",
                          padding: "10px 16px",
                          borderRadius: "var(--radius-control)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600"
                        }}
                      >
                        🗑️ Padam Projek
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
