from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "localhost"
    PORT: int = 8000
    DB_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7*24*60

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()