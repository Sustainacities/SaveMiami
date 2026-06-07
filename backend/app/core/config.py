from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "AquaDome API"
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:80"

    # Database
    database_url: str = "postgresql+asyncpg://aquadome:aquadome@db:5432/aquadome"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # NATS
    nats_url: str = "nats://nats:4222"

    # JWT
    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION_USE_32_CHAR_RANDOM_STRING"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # External data
    usgs_gauge_url: str = "https://waterservices.usgs.gov/nwis/iv/"
    usgs_site: str = "02288990"
    noaa_station: str = "8723170"

    # Optional integrations
    windward_enabled: bool = False
    windward_api_key: str = ""
    derm_enabled: bool = False
    derm_arcgis_url: str = "https://gis.miamidade.gov/arcgis/rest/services"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
