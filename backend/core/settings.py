from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "localhost"
    PORT: int = 8000
    DB_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_GROUP_ID: str = "resuflow-workers"
    RESUME_MAX_RETRIES: int = 3

    # LLM (Google Gemini)
    GOOGLE_API_KEY: str
    LLM_MODEL: str = "gemini-3.5-flash"
    LLM_TEMPERATURE: float = 0.0
    # Embeddings (local sentence-transformers)
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()