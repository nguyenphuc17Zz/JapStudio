from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Japanese Immersion API"
    ENVIRONMENT: str = "development"
    PORT: int = 8002
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
    ]
    DATABASE_URL: str = "sqlite+aiosqlite:///./immersion.db"
    ENCRYPTION_KEY: str = "dGhpc2lzYTMyeGJ5dGVrZXlmb3JjcnlwdG9ncmFwaHk="
    LOG_LEVEL: str = "INFO"
    REQUEST_TIMEOUT_SECONDS: float = 15.0
    MAX_IMPORT_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB

    # AI Intelligence & Providers Settings
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_AI_PROVIDER: str = "gemini"
    DEFAULT_AI_MODEL: str = "gemini-3.6-flash"
    AI_DAILY_BUDGET_USD: float = 10.0
    MAX_ENRICHMENT_CONCURRENCY: int = 2
    AI_REQUEST_TIMEOUT_SECONDS: float = 45.0

    # Browser-fallback extraction (Playwright Chromium, Tier 2 of the
    # direct -> browser -> reader-proxy chain). Optional dependency:
    # when playwright is not installed the chain degrades to direct-only.
    EXTRACTION_BROWSER_ENABLED: bool = True
    BROWSER_MAX_CONCURRENCY: int = 2
    BROWSER_TIMEOUT_SECONDS: float = 25.0

    # AI enrichment background worker kill-switch. When False the worker loop
    # stops acquiring QUEUED jobs (in-flight jobs finish); nothing is deleted.
    ENRICHMENT_WORKER_ENABLED: bool = True

    # Auto-queue AI enrichment (ingest/refetch). Default OFF: enrichment runs
    # ONLY when the user presses the button on the article detail page.
    ENRICHMENT_AUTO_QUEUE_ENABLED: bool = False


settings = Settings()
