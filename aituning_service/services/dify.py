from __future__ import annotations

import base64
import json
import logging
from typing import Iterable, Optional

import requests

logger = logging.getLogger(__name__)


class DifyClient:
    """Wrapper around Dify API calls used by the AI assistant."""

    def __init__(self, base_url: str, api_key: Optional[str]) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def upload_image(self, base64_data: str, user_token: str) -> Optional[str]:
        """Upload an image and return the file identifier."""
        if not self.is_configured:
            logger.error("Dify 客户端未配置，无法上传图片")
            return None

        data = base64_data.split(",", 1)[1] if base64_data.startswith("data:") else base64_data
        try:
            image_bytes = base64.b64decode(data)
        except Exception as exc:
            logger.error("解码图片数据失败: %s", exc)
            return None

        files = {"file": ("curve.png", image_bytes, "image/png")}
        payload = {"user": user_token}
        headers = {"Authorization": f"Bearer {self.api_key}"}

        response = requests.post(f"{self.base_url}/files/upload", files=files, data=payload, headers=headers)

        if response.status_code != 201:
            logger.error(
                "上传图片到 Dify 失败: status=%s body=%s",
                response.status_code,
                response.text,
            )
            return None

        try:
            result = response.json()
        except json.JSONDecodeError:
            logger.error("解析 Dify 图片上传响应失败")
            return None

        file_id = result.get("id")
        logger.info("图片上传到 Dify 成功: %s", file_id)
        return file_id

    def stream_chat(
        self,
        query: str,
        current_filters: str,
        user_token: str,
        conversation_id: Optional[str],
        image_file_id: Optional[str],
    ) -> requests.Response:
        """Send a chat request to Dify and return the streaming response object."""
        if not self.is_configured:
            raise RuntimeError("AI服务未配置")

        payload: dict = {
            "inputs": {"currentFilters": current_filters},
            "query": query,
            "response_mode": "streaming",
            "user": user_token,
            "auto_generate_name": True,
        }

        if conversation_id:
            payload["conversation_id"] = conversation_id

        if image_file_id:
            payload["files"] = [
                {
                    "type": "image",
                    "transfer_method": "local_file",
                    "upload_file_id": image_file_id,
                }
            ]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        logger.info("调用 Dify API: payload=%s", json.dumps(payload, ensure_ascii=False))
        response = requests.post(f"{self.base_url}/chat-messages", json=payload, headers=headers, stream=True)
        return response
