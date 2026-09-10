from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "ai_second_brain_default_secret_key_please_change"
    
    # Default LLM Provider Settings
    DEFAULT_LLM_PROVIDER: str = "openai"
    DEFAULT_LLM_BASE_URL: str = "https://api.openai.com/v1"
    DEFAULT_LLM_API_KEY: str = ""
    DEFAULT_LLM_MODEL: str = "gpt-4o"

    # Pydantic Settings Config
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
