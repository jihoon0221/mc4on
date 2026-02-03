import os
from pathlib import Path
from dataclasses import dataclass


BASE_DIR = Path(__file__).resolve().parents[2]
_env_path = BASE_DIR / ".env"
if _env_path.exists():
    from dotenv import load_dotenv

    load_dotenv(_env_path)


def _get_env(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value if value is not None else default


@dataclass(frozen=True)
class Settings:
    app_name: str = _get_env("APP_NAME", "scam-api")
    environment: str = _get_env("ENVIRONMENT", "development")
    database_url: str = _get_env("DATABASE_URL", "")
    data_dir: str = _get_env("DATA_DIR", "/var/lib/scam-api")
    allowlist_emails: str = _get_env("ALLOWLIST_EMAILS", "")
    google_client_id: str = _get_env("GOOGLE_CLIENT_ID", "")
    dev_bypass_auth: bool = _get_env("DEV_BYPASS_AUTH", "").lower() in {"1", "true", "yes", "y"}
    encryption_key: str = _get_env("ENCRYPTION_KEY", "")
    retention_days: int = int(_get_env("DATA_RETENTION_DAYS", "90"))
    risk_countries_raw: str = _get_env("RISK_COUNTRIES", "")
    risk_jobs_raw: str = _get_env("RISK_JOBS", "")
    risk_keywords_raw: str = _get_env("RISK_KEYWORDS", "")
    risk_link_domains_raw: str = _get_env("RISK_LINK_DOMAINS", "")
    risk_account_prefixes_raw: str = _get_env("RISK_ACCOUNT_PREFIXES", "")
    flow_risk_window_days: int = int(_get_env("FLOW_RISK_WINDOW_DAYS", "30"))
    openai_api_key: str = _get_env("OPENAI_API_KEY", "")
    openai_base_url: str = _get_env("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_model_summary: str = _get_env("OPENAI_MODEL_SUMMARY", "")
    openai_model_digest: str = _get_env("OPENAI_MODEL_DIGEST", "")
    openai_model_risk: str = _get_env("OPENAI_MODEL_RISK", "")
    openai_model_quiz: str = _get_env("OPENAI_MODEL_QUIZ", "")
    openai_timeout_seconds: int = int(_get_env("OPENAI_TIMEOUT_SECONDS", "10"))
    hf_api_key: str = _get_env("HF_API_KEY", "")
    hf_model_summary: str = _get_env("HF_MODEL_SUMMARY", "")
    hf_model_digest: str = _get_env("HF_MODEL_DIGEST", "")
    gemini_api_key: str = _get_env("GEMINI_API_KEY", "")
    gemini_model_summary: str = _get_env("GEMINI_MODEL_SUMMARY", "")
    gemini_model_digest: str = _get_env("GEMINI_MODEL_DIGEST", "")
    groq_api_key: str = _get_env("GROQ_API_KEY", "")
    groq_model_summary: str = _get_env("GROQ_MODEL_SUMMARY", "")
    groq_model_digest: str = _get_env("GROQ_MODEL_DIGEST", "")
    link_check_api_key: str = _get_env("LINK_REPUTATION_API_KEY", "")
    link_check_base_url: str = _get_env("LINK_REPUTATION_BASE_URL", "")
    account_check_api_key: str = _get_env("ACCOUNT_CHECK_API_KEY", "")
    account_check_base_url: str = _get_env("ACCOUNT_CHECK_BASE_URL", "")
    photo_check_api_key: str = _get_env("PHOTO_CHECK_API_KEY", "")
    photo_check_base_url: str = _get_env("PHOTO_CHECK_BASE_URL", "")
    external_check_timeout_seconds: int = int(_get_env("EXTERNAL_CHECK_TIMEOUT_SECONDS", "8"))
    link_cache_ttl_seconds: int = int(_get_env("LINK_CACHE_TTL_SECONDS", "86400"))
    account_cache_ttl_seconds: int = int(_get_env("ACCOUNT_CACHE_TTL_SECONDS", "86400"))
    photo_cache_ttl_seconds: int = int(_get_env("PHOTO_CACHE_TTL_SECONDS", "604800"))
    summary_cache_ttl_seconds: int = int(_get_env("SUMMARY_CACHE_TTL_SECONDS", "3600"))

    @property
    def allowlist(self) -> set[str]:
        if not self.allowlist_emails:
            return set()
        return {e.strip().lower() for e in self.allowlist_emails.split(",") if e.strip()}

    @property
    def risk_countries(self) -> set[str]:
        return {c.strip() for c in self.risk_countries_raw.split(",") if c.strip()}

    @property
    def risk_jobs(self) -> set[str]:
        return {j.strip() for j in self.risk_jobs_raw.split(",") if j.strip()}

    @property
    def risk_keywords(self) -> set[str]:
        return {k.strip().lower() for k in self.risk_keywords_raw.split(",") if k.strip()}

    @property
    def risk_link_domains(self) -> set[str]:
        return {d.strip().lower() for d in self.risk_link_domains_raw.split(",") if d.strip()}

    @property
    def risk_account_prefixes(self) -> set[str]:
        return {p.strip() for p in self.risk_account_prefixes_raw.split(",") if p.strip()}


settings = Settings()
