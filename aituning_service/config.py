import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

_DOTENV_PATH = Path(__file__).resolve().parent / ".env"
if _DOTENV_PATH.exists():
    load_dotenv(_DOTENV_PATH)
else:
    load_dotenv()

logger = logging.getLogger(__name__)


ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "https://ai.huihifi.com",
    "https://huihifi.com",
    "https://www.huihifi.com",
]


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    dify_api_key: Optional[str] = os.getenv("DIFY_API_KEY")
    dify_base_url: str = os.getenv("DIFY_BASE_URL", "http://49.232.175.67/v1")
    daily_limit: int = int(os.getenv("DAILY_LIMIT", "10"))
    database_path: str = os.getenv("USAGE_DATABASE_PATH", "usage.db")

    huihifi_api_base_url: str = os.getenv("HUIHIFI_API_BASE_URL", "https://huihifi.com/api")
    huihifi_app_key: Optional[str] = os.getenv("HUIHIFI_APP_KEY")
    huihifi_secret_key: Optional[str] = os.getenv("HUIHIFI_SECRET_KEY")
    huihifi_api_timeout: int = int(os.getenv("HUIHIFI_API_TIMEOUT", "10"))
    huihifi_max_page_size: int = int(os.getenv("HUIHIFI_MAX_PAGE_SIZE", "50"))

    def validate(self) -> None:
        """Emit warnings for missing critical configuration."""
        if not self.dify_api_key:
            logger.warning("缺少 Dify API 密钥，AI 聊天接口将不可用")

        if not self.huihifi_app_key or not self.huihifi_secret_key:
            logger.warning("缺少 HuiHiFi API 凭证，产品搜索接口将不可用")
