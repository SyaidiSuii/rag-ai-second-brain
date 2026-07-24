import os
import zipfile
import tempfile
import logging
from app.core.celery_app import celery_app
from sqlalchemy.orm import Session
from openai import OpenAI # Kita guna klien synchronous OpenAI di dalam Celery untuk kemudahan

from app.core.database import SessionLocal
from app.models.document import Document, Embedding
from app.models.project import LLMConfig

logger = logging.getLogger(__name__)

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
    # 1. Memecahkan kod/teks panjang kepada beberapa pecahan kecil (chunks) dengan overlap
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - chunk_overlap
    return chunks

def get_embeddings_sync(text_list: list[str], base_url: str, api_key: str | None, model: str) -> list[list[float]]:
    # 2. Menghantar pecahan teks ke model Embedding secara berkumpulan (batch)
    client = OpenAI(
        base_url=base_url,
        api_key=api_key or "no-key",
        timeout=60.0
    )
    
    kwargs = {
        "input": text_list,
        "model": model
    }
    
    # Google Gemini memulangkan 3072 secara default, paksa jadi 1536 untuk padan dengan DB
    if model == "gemini-embedding-001":
        kwargs["dimensions"] = 1536
        
    response = client.embeddings.create(**kwargs)
    return [item.embedding for item in response.data]

@celery_app.task(name="process_document_task")
def process_document(document_id: str):
    # 3. Tugasan latar belakang Celery untuk memproses fail secara asinkronus
    logger.info(f"Memulai pemprosesan dokumen: {document_id}")
    db: Session = SessionLocal()
    
    try:
        # Ambil maklumat dokumen dari database
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Dokumen tidak dijumpai: {document_id}")
            return False
        
        # Tukar status dokumen kepada 'processing'
        doc.status = "processing"
        db.commit()

        # Dapatkan konfigurasi model untuk projek ini
        config = db.query(LLMConfig).filter(LLMConfig.project_id == doc.project_id).first()
        if not config:
            raise ValueError(f"Konfigurasi LLM projek tidak dijumpai bagi dokumen {document_id}")

        # Tentukan model embedding mengikut pembekal
        embedding_model = "text-embedding-3-small"
        if config.provider_type == "local":
            embedding_model = "nomic-embed-text"
        elif config.provider_type == "google":
            embedding_model = "gemini-embedding-001" # Ganti ke model aktif terkini

        file_path = doc.storage_path
        extracted_texts = [] # Menyimpan senarai tuple: (content_text, extra_metadata)

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Fail fizikal tidak dijumpai di: {file_path}")

        # A. Pengendalian fail teks / markdown biasa
        if doc.file_type in ["md", "txt"]:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                extracted_texts.append((content, {"source_file": doc.file_name}))

        # B. Pengendalian fail PDF
        elif doc.file_type == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pdf_text = []
                for page_num, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        pdf_text.append(page_text)
                content = "\n".join(pdf_text)
                extracted_texts.append((content, {"source_file": doc.file_name}))
            except Exception as pe:
                logger.error(f"Gagal membaca fail PDF {doc.file_name}: {pe}")
                raise pe

        # C. Pengendalian fail ZIP Codebase (Ekstrak & Parse fail kod sahaja)
        elif doc.file_type == "zip":
            with tempfile.TemporaryDirectory() as temp_dir:
                with zipfile.ZipFile(file_path, "r") as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Telusuri semua fail dalam folder ZIP yang diekstrak
                for root, _, files in os.walk(temp_dir):
                    for file in files:
                        # Tapis fail kod sumber yang disokong, abaikan fail binari
                        if file.endswith((".py", ".js", ".ts", ".html", ".css", ".md", ".json", ".dart")):
                            full_path = os.path.join(root, file)
                            relative_path = os.path.relpath(full_path, temp_dir)
                            
                            try:
                                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                                    content = f.read()
                                    if content.strip():
                                        extracted_texts.append((content, {"source_file": relative_path}))
                            except Exception as fe:
                                logger.warning(f"Gagal membaca fail {relative_path} dalam ZIP: {fe}")
        else:
            raise ValueError(f"Format fail {doc.file_type} tidak disokong.")

        # 4. Tukar pecahan teks kepada embedding vektor & simpan ke database
        all_embeddings_to_save = []
        for text_content, meta in extracted_texts:
            chunks = chunk_text(text_content)
            if not chunks:
                continue
            
            try:
                # Dapatkan embedding dari enjin LLM (Ollama/OpenAI)
                embeddings = get_embeddings_sync(
                    text_list=chunks,
                    base_url=config.base_url,
                    api_key=config.api_key,
                    model=embedding_model
                )
                
                # Sediakan objek kemasukan database
                for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                    chunk_meta = meta.copy()
                    chunk_meta["chunk_index"] = i
                    
                    db_emb = Embedding(
                        document_id=doc.id,
                        chunk_content=chunk,
                        vector=vector,
                        extra_metadata=chunk_meta
                    )
                    all_embeddings_to_save.append(db_emb)
            except Exception as ee:
                logger.error(f"Gagal menjana embedding untuk {meta.get('source_file')}: {ee}")

        # 5. Komit semua ke PostgreSQL
        if all_embeddings_to_save:
            db.add_all(all_embeddings_to_save)
            doc.status = "processed"
            db.commit()
            logger.info(f"Selesai! Dokumen {document_id} diproses. {len(all_embeddings_to_save)} chunk disimpan.")
        else:
            raise ValueError("Tiada sebarang chunk berjaya dijana.")

    except Exception as e:
        logger.error(f"Ralat semasa memproses dokumen: {e}")
        db.rollback()
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = "failed"
                db.commit()
        except Exception as db_e:
            logger.error(f"Gagal kemas kini status fail kepada 'failed': {db_e}")
        return False
    finally:
        db.close()
    
    return True