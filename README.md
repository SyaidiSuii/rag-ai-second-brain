# AI Second Brain for Developers 🧠💻

Aplikasi pembantu pengaturcaraan berasaskan kecerdasan buatan (AI) yang membantu developer menyimpan memori projek, keputusan lama, menganalisis kod, dan berinteraksi dengan LLM secara selamat menggunakan carian vektor semantik (RAG).

---

## 🌟 Ciri-Ciri Utama Yang Telah Dibina

1.  **Sistem Pengesahan Pengguna & JWT**:
    - Pencincangan kata laluan menggunakan `bcrypt` untuk pendaftaran akaun baru.
    - Pengesahan berasaskan token **JWT** (`pyjwt`) untuk melindungi semua API endpoint projek.
2.  **Konfigurasi LLM Dinamik (Per Projek)**:
    - Sokongan bertukar enjin AI secara dinamik berdasarkan konfigurasi setiap projek (menyokong Google AI Studio Gemini, Ollama tempatan, dan API OpenAI).
3.  **Tugasan Latar Belakang Asinkronus (Redis + Celery)**:
    - Orkestrasi proses pemecahan teks (_chunking_) dan embedding di latar belakang secara asinkronus menggunakan Celery dan Redis.
    - Memaksa protokol RESP2 untuk memastikan kestabilan penuh Celery di persekitaran Windows tempatan.
4.  **Ekstraktor Pelbagai Fail (Txt, Md, Zip, PDF)**:
    - Sokongan fail teks biasa (`.txt` & `.md`).
    - Sokongan fail PDF (`.pdf`) menggunakan pustaka `pypdf`.
    - Sokongan fail arkib ZIP (`.zip`) di mana ia mengekstrak dan menapis fail kod sumber (`.py`, `.js`, `.ts`, `.html`, `.css`, `.dart`, dll).
5.  **Pangkalan Data & Carian Vektor (PostgreSQL + pgvector)**:
    - Carian vektor semantik berasaskan **Cosine Distance** (`cosine_distance`) secara langsung dari pangkalan data PostgreSQL.
6.  **Sembang Pintar RAG Penstriman (Streaming)**:
    - Penstriman respons jawapan AI secara _real-time_ (chunk-by-chunk).
    - Sistem memori perbualan automatik yang menyimpan sejarah sembang di database dan mengaitkannya ke dalam konteks soalan seterusnya.
7.  **Antarmuka Web Premium (Next.js 15 + Vanilla CSS)**:
    - Dashboard bertema _dark-mode glassmorphism_ yang responsif.
    - Bar sisi untuk mengurus projek, membuat sesi sembang baru, dan menavigasi sejarah sembang.
    - Tiga tab utama: **Sembang RAG**, **Pengurus Fail**, dan **Alatan Carian Semantik (Cosine Similarity)**.

---

## 🛠️ Stack Teknologi & Versi Terperinci

Projek ini dibina menggunakan kombinasi stack teknologi berasaskan Python (Backend) dan Next.js (Frontend):

### 🐍 Backend & Persekitaran Runtime

- **Runtime**: Python `3.13.12` (Menyokong Python `3.11+`)
- **Web Framework**: FastAPI `v0.139.2` (dengan Uvicorn `v0.51.0`)
- **Database ORM & Driver**: SQLAlchemy `v2.0.51` & `psycopg2-binary` `v2.9.12`
- **Pangkalan Data Vektor**: `pgvector` `v0.5.0`
- **Background Worker**: Celery `v5.6.3`
- **Message Broker Client**: `redis` `v4.6.0` (Disetkan ke protokol RESP2)
- **Integrasi AI / LLM**: OpenAI Python SDK `v2.46.0` (Menyokong OpenAI, Google Gemini API, & Ollama)
- **Pengesahan & Keselamatan**: `PyJWT` `v2.13.0` & `bcrypt` `v5.0.0`
- **Pemproses Fail PDF**: `pypdf` `v6.14.2`
- **Pengurusan Tetapan**: `pydantic` `v2.13.4` & `pydantic-settings` `v2.14.2`

### 🗄️ Pangkalan Data & Message Broker

- **Database**: PostgreSQL 15+ (bersama ekstensi `pgvector`)
- **Message Broker**: Redis Server `v5.0.14` (Port `6379`)

### 🌐 Frontend (Web UI)

- **Framework**: Next.js `v16.2.10` (App Router)
- **UI Library**: React `v19.2.4` & React DOM `v19.2.4`
- **Bahasa**: TypeScript `v5.x`
- **Linter**: ESLint `v9.x` (`eslint-config-next` `v16.2.10`)
- **Styling**: Vanilla CSS (Custom Design System, Dark Mode & Glassmorphism, Tanpa Tailwind)

---

## 🚀 Cara Menjalankan Projek

### 📦 1. Persediaan Database & Redis

- Pastikan PostgreSQL anda aktif dan mempunyai extension `pgvector` dipasang.
- Lancarkan Redis Server tempatan anda (Default port: `6379`).

### 🐍 2. Jalankan Backend (FastAPI + Celery)

Buka dua terminal berasingan di dalam folder root projek (`D:\Projek\ai_second_brain`):

**Terminal 1 (FastAPI Server):**

```bash
# Aktifkan virtual environment
.\venv\Scripts\activate

# Lancarkan pelayan FastAPI (boleh diakses via localhost & LAN)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

_API Docs akan sedia di: `http://127.0.0.1:8000/docs` atau `http://<IP-Komputer>:8000/docs`_

**Terminal 2 (Celery Worker):**

```bash
# Aktifkan virtual environment
.\venv\Scripts\activate

# Lancarkan Celery Worker (Mod solo di Windows)
celery -A app.core.celery_app worker --loglevel=info -P solo
```

---

### 🌐 3. Jalankan Frontend (Next.js)

Buka terminal ketiga di bawah folder `frontend`:

**Terminal 3 (Next.js Web UI):**

```bash
# Masuk ke folder frontend
cd frontend

# Jalankan pelayan pembangunan Next.js
npm run dev
```

_Aplikasi web akan sedia di: `http://localhost:3000`_

---
