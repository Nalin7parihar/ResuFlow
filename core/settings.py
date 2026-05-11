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

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()