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
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [toast, setToast] = useState<{ title: string; time: string; message: string } | null>({
    title: "Antigravity",
    time: "just now",
    message: "Resolving Node.js CPU Overhead",
  });

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
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-left">
            <div className="sidebar-logo-box">SB</div>
            <div className="sidebar-brand-text">
              <h2>SecondBrain</h2>
              <p>RAG WORKSPACE</p>
            </div>
          </div>
          <span className="sidebar-version-pill">v2.4</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <h3>CURRENT PROJECT</h3>
            <button
              type="button"
              onClick={() => {
                setActiveProject(null);
                setNewProjName("");
              }}
              className="sidebar-add-btn"
              title="Create New Project"
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
            className="sidebar-select"
          >
            <option value="" disabled>Select Project...</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="sidebar-section chat-sessions-section">
          <div className="sidebar-section-header">
            <h3>CHAT HISTORY</h3>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={!activeProject}
              className="sidebar-add-btn"
              title="New Chat"
            >
              +
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="chat-empty-dashed">
              <div className="chat-empty-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="chat-empty-title">No chat history yet.</div>
              <div className="chat-empty-subtitle">
                Start or select a project to begin conversational retrieval
              </div>
            </div>
          ) : (
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
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <div className="sidebar-user-avatar">DEV</div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">Active Account</div>
              <div className="sidebar-user-status">
                <span className="status-dot-green"></span> Online
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-topbar">
          <div className="topbar-left">
            <div className="topbar-breadcrumb">
              <span className="status-dot-green"></span>
              <span className="topbar-breadcrumb-title">DEVELOPER MEMORY</span>
              <span className="topbar-breadcrumb-slash">/</span>
              <span className="topbar-breadcrumb-project">
                {activeProject ? activeProjectName : "Select a Project to Get Started"}
              </span>
            </div>

            <div className="topbar-stats-group">
              <div className="topbar-stat-pill">
                <span>Projects</span>
                <span className="topbar-stat-count">{projects.length}</span>
              </div>
              <div className="topbar-stat-pill">
                <span>Sessions</span>
                <span className="topbar-stat-count">{sessions.length}</span>
              </div>
              <div className="topbar-stat-pill">
                <span>Files</span>
                <span className="topbar-stat-count">{projectDocs.length}</span>
              </div>
            </div>
          </div>

          <nav className="topbar-tabs" aria-label="Navigasi utama">
            <button
              onClick={() => setActiveTab("chat")}
              className={`topbar-tab-btn ${activeTab === "chat" ? "active" : ""}`}
            >
              RAG Chat
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`topbar-tab-btn ${activeTab === "docs" ? "active" : ""}`}
            >
              File Manager
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`topbar-tab-btn ${activeTab === "search" ? "active" : ""}`}
            >
              Semantic Search
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`topbar-tab-btn ${activeTab === "settings" ? "active" : ""}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              AI Model Settings
            </button>
          </nav>
        </header>

        <section className="tab-body-area">
          {!activeProject ? (
            <div className="hero-setup-grid">
              <div className="hero-left">
                <div className="hero-badge-pill">
                  <span className="status-dot-green"></span>
                  <span>Project Setup</span>
                </div>

                <h1 className="hero-title">
                  Select &<br />
                  Configure<br />
                  Project AI<br />
                  <span className="hero-title-muted">Engine</span>
                </h1>

                <p className="hero-description">
                  Create a new project and select any AI engine (Google Gemini, OpenAI, Claude via OpenRouter, DeepSeek, Groq, or Local Ollama).
                </p>

                <div className="hero-tags-row">
                  <span className="hero-tag">#RAG</span>
                  <span className="hero-tag">#Vectors</span>
                  <span className="hero-tag">#LocalLLM</span>
                </div>
              </div>

              <div className="setup-card">
                <div className="setup-card-header">
                  <div>
                    <h3>Create Project & Select AI Model</h3>
                    <p>Configure LLM endpoints and define your project workspace</p>
                  </div>
                  <button type="button" className="setup-card-icon-btn" title="AI Parameters">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line>
                      <line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line>
                      <line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line>
                      <line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                  </button>
                </div>

                {projectFeedback && (
                  <div className={`feedback ${projectFeedback.type}`} role="status">
                    {projectFeedback.message}
                  </div>
                )}

                <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label className="setup-field-label">Project Name</label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ marginTop: "6px" }}
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder="e.g., E-Commerce Store Project"
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label className="setup-field-label">AI Provider / LLM Model</label>
                      <select
                        value={providerType}
                        onChange={(e) => handleProviderSelect(e.target.value)}
                        className="glass-input"
                        style={{ marginTop: "6px" }}
                      >
                        <option value="google">Google AI Studio (Gemini)</option>
                        <option value="openrouter">OpenRouter (Claude/Llama)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="deepseek">DeepSeek Direct</option>
                        <option value="groq">Groq Console (Fast)</option>
                        <option value="local">Ollama (Offline/Local)</option>
                        <option value="custom">Custom URL</option>
                      </select>
                    </div>

                    <div>
                      <label className="setup-field-label">API Base URL</label>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ marginTop: "6px" }}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="form-group-label-row">
                      <label className="setup-field-label">
                        API Key for {providerType.toUpperCase()}
                      </label>
                      <span className="form-group-encrypted-badge">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Encrypted & stored locally
                      </span>
                    </div>
                    <div className="input-with-icon">
                      <input
                        type={showApiKey ? "text" : "password"}
                        className="glass-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={providerType === "local" ? "Optional for local Ollama" : `Enter your ${providerType} API Key`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="input-toggle-icon"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="setup-field-label">AI Model Name (model_name)</label>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ marginTop: "6px" }}
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: "4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    CREATE PROJECT
                  </button>
                </form>
              </div>
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
                      <div className="form-group-label-row">
                        <label className="setup-field-label">
                          API Key {editProviderType === "local" ? "(Opsional)" : `untuk ${editProviderType.toUpperCase()}`}
                        </label>
                        <span className="form-group-encrypted-badge">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          Encrypted & stored locally
                        </span>
                      </div>
                      <div className="input-with-icon">
                        <input
                          type={showEditApiKey ? "text" : "password"}
                          className="glass-input"
                          value={editApiKey}
                          onChange={(e) => setEditApiKey(e.target.value)}
                          placeholder="Biarkan kosong untuk mengekalkan API Key sedia ada"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditApiKey(!showEditApiKey)}
                          className="input-toggle-icon"
                          title={showEditApiKey ? "Hide API key" : "Show API key"}
                        >
                          {showEditApiKey ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                      </div>
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

      {toast && (
        <div className="toast-floating-card">
          <div className="toast-badge-box">A</div>
          <div className="toast-content">
            <div className="toast-header-row">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-time">{toast.time}</span>
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="toast-close-btn"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
