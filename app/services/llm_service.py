import logging
from typing import AsyncGenerator, List, Dict
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class LLMService:
    @staticmethod
    def get_client(base_url: str, api_key: str | None) -> AsyncOpenAI:
        # 1. Cipta klien OpenAI secara asinkronus dengan base_url & api_key dinamik.
        # Jika api_key kosong (Ollama/LM Studio tempatan), kita letak mock string "no-key".
        return AsyncOpenAI(
            base_url=base_url,
            api_key=api_key or "no-key",
            timeout=60.0 # Timeout 60 saat sekiranya local model lambat bermula (warming up)
        )

    @classmethod
    async def generate_chat_stream(
        cls,
        base_url: str,
        api_key: str | None,
        model_name: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        # 2. Menjana respons LLM secara penstriman (chunk-by-chunk)
        client = cls.get_client(base_url, api_key)
        try:
            response_stream = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                stream=True # Wajib set True untuk streaming response
            )
            
            # Membaca token satu per satu sebaik sahaja ia dijana oleh LLM
            async for chunk in response_stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
                    
        except Exception as e:
            logger.error(f"Ralat semasa membuat panggilan LLM: {e}")
            yield f"\n[RALAT LLM: Gagal berhubung dengan pelayan LLM. Sila periksa semula url/port enjin LLM anda. Perincian ralat: {str(e)}]"