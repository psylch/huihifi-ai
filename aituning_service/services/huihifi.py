from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

import requests

logger = logging.getLogger(__name__)


class HuiHiFiClientError(Exception):
    """Base error for HuiHiFi client failures."""


class HuiHiFiCredentialsError(HuiHiFiClientError):
    """Raised when the client is missing required credentials."""


class HuiHiFiClient:
    """Thin wrapper around HuiHiFi OpenAPI."""

    def __init__(
        self,
        base_url: str,
        app_key: Optional[str],
        secret_key: Optional[str],
        timeout: int = 10,
        max_page_size: int = 50,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.app_key = app_key
        self.secret_key = secret_key
        self.timeout = timeout
        self.max_page_size = max_page_size

    @property
    def is_configured(self) -> bool:
        return bool(self.app_key and self.secret_key)

    def _generate_sign(self) -> Tuple[str, int]:
        """
        Generate request signature.

        Official service expects: sign = Base64(HMAC_SHA256(key=secretKey, msg=appKey+timestamp))
        """
        if not self.is_configured:
            raise HuiHiFiCredentialsError("未配置 HuiHiFi API 凭证")

        timestamp = int(time.time() * 1000)
        message = (self.app_key + str(timestamp)).encode("utf-8")
        key = self.secret_key.encode("utf-8")
        digest = hmac.new(key, message, hashlib.sha256).digest()
        sign = base64.b64encode(digest).decode("utf-8")
        return sign, timestamp

    def _transform_response(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        if raw.get("code") != 0:
            raise HuiHiFiClientError(f"HuiHiFi API 错误: {raw.get('message', 'unknown error')}")

        data = raw.get("data") or {}
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except ValueError:
                data = {}
        products = []

        raw_list = data.get("list", [])
        if isinstance(raw_list, str):
            try:
                raw_list = json.loads(raw_list)
            except ValueError:
                raw_list = []

        for raw_item in raw_list:
            item = raw_item
            if isinstance(raw_item, str):
                try:
                    item = json.loads(raw_item)
                except ValueError:
                    continue

            if not isinstance(item, dict):
                continue

            brand = item.get("brand") or {}
            if isinstance(brand, str):
                try:
                    brand = json.loads(brand)
                except ValueError:
                    brand = {"title": brand}

            category = item.get("category") or {}
            if isinstance(category, str):
                category_name = category
            else:
                category_name = category.get("name", "")

            article = item.get("article") or {}
            if isinstance(article, str):
                try:
                    article = json.loads(article)
                except ValueError:
                    article = {}

            products.append(
                {
                    "uuid": item.get("uuid"),
                    "title": item.get("title"),
                    "brand": brand if isinstance(brand, dict) else {"title": str(brand)},
                    "thumbnails": (article or {}).get("thumbnails", []),
                    "categoryName": category_name,
                }
            )

        return {"products": products, "total": data.get("total", 0)}

    def search_products(self, keyword: str, page_size: int) -> Dict[str, Any]:
        if not self.is_configured:
            raise HuiHiFiCredentialsError("未配置 HuiHiFi API 凭证")

        sign, timestamp = self._generate_sign()
        headers = {
            "Content-Type": "application/json",
            "appKey": self.app_key,
            "timestamp": str(timestamp),
            "sign": sign,
        }
        payload = {
            "orderBy": "createTime",
            "direction": "DESC",
            "pageSize": min(page_size, self.max_page_size),
            "keyword": keyword or "",
        }

        url = f"{self.base_url}/v1/openapi/evaluations"
        logger.info(
            "调用 HuiHiFi 产品搜索: url=%s payload=%s",
            url,
            json.dumps(payload, ensure_ascii=False),
        )

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=self.timeout)
            response.raise_for_status()
        except requests.Timeout as exc:
            raise HuiHiFiClientError("HuiHiFi API 调用失败: 请求超时") from exc
        except requests.RequestException as exc:
            raise HuiHiFiClientError(f"HuiHiFi API 调用失败: {exc}") from exc

        try:
            raw = response.json()
        except ValueError as exc:
            raise HuiHiFiClientError("HuiHiFi API 调用失败: 响应格式错误") from exc

        return self._transform_response(raw)
