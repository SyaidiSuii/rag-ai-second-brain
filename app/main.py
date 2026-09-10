import os
import shutil
import uuid
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, Depends, Query, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn

from app.core.database import SessionLocal, get_db
from app.core.config import settings
from app.services.llm_service import LLMService
from app.models.user import User
from app.models.project import Project, LLMConfig
from app.models.document import Document, Embedding
from app.models.chat import ChatSession, Message
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

app = FastAPI(title="AI Second Brain API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cipta folder simpanan fail sekiranya belum wujud
STORAGE_DIR = "storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

@app.on_event("startup")
def startup_event():
    from app.core.init_db import init_db
    init_db()

# Schema untuk Input Pendaftaran JSON
class UserRegisterSchema(BaseModel):
    email: str
    password: str

# Schema untuk Kemas Kini Tetapan AI & Projek (ponytail)
class LLMConfigUpdateSchema(BaseModel):
    provider_type: str = "google"
    base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    api_key: Optional[str] = None
    model_name: str = "gemini-1.5-flash"
    name: Optional[str] = None

@app.get("/api/v1/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"error: {str(e)}"}

# ==========================================
# 0. SISTEM PENGESAHAN PENGGUNA (AUTH)
# ==========================================

# A. Register / Daftar Akaun Baru
@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterSchema, db: Session = Depends(get_db)):
    # Semak jika e-mel sudah digunakan
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mel ini sudah pun didaftarkan"
        )
    
    try:
        hashed = hash_password(payload.password)
        new_user = User(email=payload.email, password_hash=hashed)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "Pengguna berjaya didaftarkan",
            "user_id": str(new_user.id),
            "email": new_user.email
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mendaftar pengguna: {str(e)}")

# B. Login / Log Masuk (Format Borang OAuth2 - membolehkan Swagger log masuk)
@app.post("/api/v1/auth/login")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = False,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mel atau kata laluan tidak betul"
        )

    token_expiry = timedelta(days=30) if remember_me else timedelta(days=1)    
    access_token = create_access_token(data={"sub": str(user.id)},expires_delta=token_expiry)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ==========================================
# 1. PENGURUSAN PROJEK & DOKUMEN (LINDUNGI DENGAN JWT)
# ==========================================

# Cipta Projek baru (Terikat kepada pengguna logged-in)
@app.post("/api/v1/projects")
def create_project(
    name: str,
    provider_type: str = "openai",
    base_url: str = "https://api.openai.com/v1",
    api_key: str = None,
    model_name: str = "gpt-4o",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        project = Project(name=name, user_id=current_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        
        config = LLMConfig(
            project_id=project.id,
            provider_type=provider_type,
            base_url=base_url,
            api_key=api_key,
            model_name=model_name
        )
        db.add(config)
        db.commit()
        
        return {
            "message": "Projek berjaya dicipta",
            "project_id": str(project.id),
            "owner": current_user.email,
            "llm_config": {
                "provider": provider_type,
                "model": model_name,
                "base_url": base_url
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mencipta projek: {str(e)}")

# Dapatkan senarai projek milikan pengguna semasa sahaja
@app.get("/api/v1/projects")
def list_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    return [
        {
            "project_id": str(p.id),
            "name": p.name,
            "created_at": p.create_at,
            "llm_config": {
                "provider": p.llm_config.provider_type if p.llm_config else "openai",
                "model": p.llm_config.model_name if p.llm_config else "gpt-4o",
                "base_url": p.llm_config.base_url if p.llm_config else ""
            } if p.llm_config else None
        } for p in projects
    ]

# ponytail: Kemas kini model AI & tetapan projek
@app.put("/api/v1/projects/{project_id}/llm-config")
def update_project_llm_config(
    project_id: str,
    payload: LLMConfigUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format ID Projek tidak sah")

    project = db.query(Project).filter(
        Project.id == proj_uuid,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada akses.")

    if payload.name and payload.name.strip():
        project.name = payload.name.strip()

    config = db.query(LLMConfig).filter(LLMConfig.project_id == proj_uuid).first()
    if not config:
        config = LLMConfig(
            project_id=project.id,
            provider_type=payload.provider_type,
            base_url=payload.base_url,
            api_key=payload.api_key,
            model_name=payload.model_name
        )
        db.add(config)
    else:
        config.provider_type = payload.provider_type
        config.base_url = payload.base_url
        config.model_name = payload.model_name
        if payload.api_key is not None and payload.api_key.strip() != "":
            config.api_key = payload.api_key.strip()

    try:
        db.commit()
        db.refresh(project)
        return {
            "message": "Tetapan AI dan Model berjaya dikemas kini",
            "project_id": str(project.id),
            "name": project.name,
            "llm_config": {
                "provider": config.provider_type,
                "model": config.model_name,
                "base_url": config.base_url
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mengemas kini tetapan: {str(e)}")

# ponytail: Padam projek
@app.delete("/api/v1/projects/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format ID Projek tidak sah")

    project = db.query(Project).filter(
        Project.id == proj_uuid,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada akses.")

    try:
        db.delete(project)
        db.commit()
        return {"message": "Projek berjaya dipadam"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memadam projek: {str(e)}")

# Muat naik fail (Pastikan projek adalah milik pengguna logged-in)
@app.post("/api/v1/projects/{project_id}/documents/upload")
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.tasks.ingestion_tasks import process_document
    
    proj_uuid = uuid.UUID(project_id)
    # Tapis mengikut project_id AND user_id pemilik
    project = db.query(Project).filter(Project.id == proj_uuid, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada kebenaran.")

    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ["md", "txt", "zip", "pdf"]:
        raise HTTPException(status_code=400, detail="Hanya format .md, .txt, .zip dan .pdf dibenarkan.")

    doc_id = uuid.uuid4()
    filename_on_disk = f"{doc_id}_{file.filename}"
    file_dest = os.path.join(STORAGE_DIR, filename_on_disk)

    try:
        with open(file_dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as fe:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan fail ke disk: {str(fe)}")

    try:
        db_doc = Document(
            id=doc_id,
            project_id=project.id,
            file_name=file.filename,
            file_type=file_ext,
            storage_path=file_dest,
            status="pending"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        celery_task = process_document.delay(str(db_doc.id))

        return {
            "message": "Dokumen berjaya dimuat naik. Pemprosesan latar belakang bermula.",
            "document_id": str(db_doc.id),
            "status": db_doc.status,
            "celery_task_id": celery_task.id
        }

    except Exception as e:
        db.rollback()
        if os.path.exists(file_dest):
            os.remove(file_dest)
        raise HTTPException(status_code=500, detail=f"Gagal memulakan ingestion fail: {str(e)}")

# Semak status dokumen (Pastikan dokumen di bawah projek penggunaLogged-in)
@app.get("/api/v1/documents/{document_id}")
def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc_uuid = uuid.UUID(document_id)
    doc = db.query(Document).join(Project).filter(
        Document.id == doc_uuid,
        Project.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak dijumpai atau anda tiada kebenaran.")
        
    chunks_count = db.query(Embedding).filter(Embedding.document_id == doc.id).count()

    return {
        "document_id": str(doc.id),
        "file_name": doc.file_name,
        "status": doc.status,
        "chunks_generated": chunks_count,
        "created_at": doc.created_at
    }

# Dapatkan senarai dokumen di bawah sesuatu projek
@app.get("/api/v1/projects/{project_id}/documents")
def list_project_documents(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj_uuid = uuid.UUID(project_id)
    project = db.query(Project).filter(Project.id == proj_uuid, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada kebenaran.")
        
    docs = db.query(Document).filter(Document.project_id == proj_uuid).all()
    return [
        {
            "document_id": str(d.id),
            "file_name": d.file_name,
            "file_type": d.file_type,
            "status": d.status,
            "created_at": d.created_at
        } for d in docs
    ]

# ==========================================
# 2. PENGURUSAN SEMBANG & RAG (LINDUNGI DENGAN JWT)
# ==========================================

# Cipta sesi sembang baru
@app.post("/api/v1/projects/{project_id}/chats")
def create_chat_session(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj_uuid = uuid.UUID(project_id)
    project = db.query(Project).filter(Project.id == proj_uuid, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada kebenaran.")
        
    try:
        session = ChatSession(project_id=project.id, title="Sembang Baru")
        db.add(session)
        db.commit()
        db.refresh(session)
        return {
            "message": "Sesi sembang berjaya dicipta",
            "session_id": str(session.id),
            "title": session.title,
            "created_at": session.created_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mencipta sesi sembang: {str(e)}")

# Dapatkan sesi sembang projek
@app.get("/api/v1/projects/{project_id}/chats")
def list_chat_sessions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj_uuid = uuid.UUID(project_id)
    # Semak dahulu sama ada projek milik pengguna logged-in
    project = db.query(Project).filter(Project.id == proj_uuid, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada kebenaran.")
        
    sessions = db.query(ChatSession)\
        .filter(ChatSession.project_id == proj_uuid)\
        .order_by(ChatSession.created_at.desc())\
        .all()
        
    return [
        {
            "session_id": str(s.id),
            "title": s.title,
            "created_at": s.created_at
        } for s in sessions
    ]

# Padam sesi sembang
@app.delete("/api/v1/chats/{session_id}")
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sess_uuid = uuid.UUID(session_id)
    chat_session = db.query(ChatSession).join(Project).filter(
        ChatSession.id == sess_uuid,
        Project.user_id == current_user.id
    ).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Sesi sembang tidak dijumpai atau anda tiada kebenaran.")
        
    try:
        db.delete(chat_session)
        db.commit()
        return {"message": "Sesi sembang berjaya dipadam"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memadam sesi sembang: {str(e)}")

# Dapatkan sejarah mesej
@app.get("/api/v1/chats/{session_id}/messages")
def get_chat_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sess_uuid = uuid.UUID(session_id)
    # Pastikan sesi sembang milik penggunaLogged-in menerusi relasi Project
    chat_session = db.query(ChatSession).join(Project).filter(
        ChatSession.id == sess_uuid,
        Project.user_id == current_user.id
    ).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Sesi sembang tidak dijumpai atau anda tiada kebenaran.")
        
    messages = db.query(Message)\
        .filter(Message.session_id == sess_uuid)\
        .order_by(Message.created_at.asc())\
        .all()
        
    return [
        {
            "message_id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at
        } for m in messages
    ]

# Sembang RAG Pintar dengan Memori & Security
@app.post("/api/v1/chats/{session_id}/messages/rag")
async def chat_rag_with_history(
    session_id: str,
    prompt: str = Query(..., description="Mesej dari pengguna"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sess_uuid = uuid.UUID(session_id)
    # Semak keselamatan pemilikan sesi sembang
    chat_session = db.query(ChatSession).join(Project).filter(
        ChatSession.id == sess_uuid,
        Project.user_id == current_user.id
    ).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Sesi sembang tidak dijumpai atau anda tiada kebenaran.")

    # 1. Simpan mesej USER ke database secara kekal
    user_msg = Message(session_id=chat_session.id, role="user", content=prompt)
    db.add(user_msg)
    db.commit()

    config = db.query(LLMConfig).filter(LLMConfig.project_id == chat_session.project_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Konfigurasi LLM projek tidak dijumpai")

    # 3. Ambil sejarah sembang terdahulu
    past_messages = db.query(Message)\
        .filter(Message.session_id == chat_session.id, Message.id != user_msg.id)\
        .order_by(Message.created_at.asc())\
        .limit(10)\
        .all()

    formatted_history = []
    for msg in past_messages:
        formatted_history.append({"role": msg.role, "content": msg.content})

    # 4. Lakukan carian semantik RAG
    embedding_model = "text-embedding-3-small"
    if config.provider_type == "local":
        embedding_model = "nomic-embed-text"
    elif config.provider_type == "google":
        embedding_model = "gemini-embedding-001"

    try:
        from app.tasks.ingestion_tasks import get_embeddings_sync
        query_vectors = get_embeddings_sync(
            text_list=[prompt],
            base_url=config.base_url,
            api_key=config.api_key,
            model=embedding_model
        )
        query_vector = query_vectors[0]
        
        search_results = db.query(Embedding, Document.file_name)\
            .join(Document)\
            .filter(Document.project_id == chat_session.project_id)\
            .order_by(Embedding.vector.cosine_distance(query_vector))\
            .limit(3)\
            .all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mencari konteks fail rujukan: {str(e)}")

    context_blocks = []
    for emb, file_name in search_results:
        src = emb.extra_metadata.get("source_file") if emb.extra_metadata else file_name
        context_blocks.append(f"Fail: {src}\nKandungan:\n{emb.chunk_content}")

    context_str = "\n\n---\n\n".join(context_blocks) if context_blocks else "Tiada dokumen rujukan ditemui bagi projek ini."

    # 5. Bina system prompt RAG
    system_instruction = (
        "Anda ialah AI Second Brain pembangun perisian. Jawab soalan pengguna berasaskan konteks rujukan projek di bawah.\n"
        "Sila berikan jawapan teknikal yang tepat, kemas, dan rujukan fail dari mana anda mengambil jawapan tersebut.\n"
        "Jika jawapan tiada di dalam konteks rujukan projek, beritahu secara jujur bahawa anda tidak tahu.\n\n"
        f"KONTEKS RUJUKAN PROJEK:\n{context_str}"
    )

    messages_payload = [{"role": "system", "content": system_instruction}] + formatted_history + [{"role": "user", "content": prompt}]

    # 6. Jana streaming respons & SIMPAN jawapan ASSISTANT sebaik selesai stream
    async def event_generator():
        full_ai_response = ""
        try:
            async for token in LLMService.generate_chat_stream(
                base_url=config.base_url,
                api_key=config.api_key,
                model_name=config.model_name,
                messages=messages_payload
            ):
                full_ai_response += token
                yield token
            
            if full_ai_response.strip():
                db_new = SessionLocal()
                try:
                    assistant_msg = Message(
                        session_id=chat_session.id,
                        role="assistant",
                        content=full_ai_response
                    )
                    db_new.add(assistant_msg)
                    
                    chat_session_db = db_new.query(ChatSession).filter(ChatSession.id == chat_session.id).first()
                    if chat_session_db:
                        # Auto-kemas kini tajuk perbualan berdasarkan soalan pertama
                        if chat_session_db.title == "Sembang Baru":
                            chat_session_db.title = prompt[:30] + "..." if len(prompt) > 30 else prompt
                            
                    db_new.commit()
                finally:
                    db_new.close()
        except Exception as e:
            yield f"\n[Ralat semasa menstrim respons: {str(e)}]"

    return StreamingResponse(event_generator(), media_type="text/plain")


# ==========================================
# 3. CARIAN SEMANTIK ASAS & CHAT MOCK (LINDUNGI DENGAN JWT)
# ==========================================

@app.post("/api/v1/projects/{project_id}/search")
def semantic_search(
    project_id: str,
    query: str = Query(..., description="Query carian semantik"),
    limit: int = Query(5, description="Jumlah dokumen relevan yang mahu dicari"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proj_uuid = uuid.UUID(project_id)
    # Tapis mengikut pemilikan projek oleh current_user
    config = db.query(LLMConfig).join(Project).filter(
        LLMConfig.project_id == proj_uuid,
        Project.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Projek tidak dijumpai atau anda tiada kebenaran.")

    embedding_model = "text-embedding-3-small"
    if config.provider_type == "local":
        embedding_model = "nomic-embed-text"
    elif config.provider_type == "google":
        embedding_model = "gemini-embedding-001"

    try:
        from app.tasks.ingestion_tasks import get_embeddings_sync
        query_vectors = get_embeddings_sync(
            text_list=[query],
            base_url=config.base_url,
            api_key=config.api_key,
            model=embedding_model
        )
        query_vector = query_vectors[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjana embedding kueri: {str(e)}")

    try:
        search_results = db.query(Embedding, Document.file_name)\
            .join(Document)\
            .join(Project, Document.project_id == Project.id)\
            .filter(Document.project_id == proj_uuid, Project.user_id == current_user.id)\
            .order_by(Embedding.vector.cosine_distance(query_vector))\
            .limit(limit)\
            .all()

        results = []
        for emb, file_name in search_results:
            results.append({
                "chunk_id": str(emb.id),
                "file_name": file_name,
                "content": emb.chunk_content,
                "source_file": emb.extra_metadata.get("source_file") if emb.extra_metadata else file_name
            })
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan carian semantik: {str(e)}")

@app.get("/api/v1/chat/stream")
async def chat_stream(
    prompt: str = Query(..., description="Soalan/prompt untuk LLM"),
    base_url: str = Query(None, description="Custom LLM base URL"),
    api_key: str = Query(None, description="Custom LLM API key"),
    model_name: str = Query(None, description="Custom LLM model name")
):
    target_base_url = base_url or settings.DEFAULT_LLM_BASE_URL
    target_api_key = api_key or settings.DEFAULT_LLM_API_KEY
    target_model_name = model_name or settings.DEFAULT_LLM_MODEL

    messages = [{"role": "user", "content": prompt}]

    async def event_generator():
        async for token in LLMService.generate_chat_stream(
            base_url=target_base_url,
            api_key=target_api_key,
            model_name=target_model_name,
            messages=messages
        ):
            yield token

    return StreamingResponse(event_generator(), media_type="text/plain")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)