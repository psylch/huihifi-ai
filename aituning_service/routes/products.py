from __future__ import annotations

import logging
from typing import Optional

from flask import Blueprint, jsonify, request

from ..services import HuiHiFiClient, HuiHiFiClientError, HuiHiFiCredentialsError

logger = logging.getLogger(__name__)


def create_products_blueprint(huihifi_client: HuiHiFiClient) -> Blueprint:
    bp = Blueprint("products", __name__)

    @bp.route("/products/search", methods=["POST"])
    def search_products():
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return (
                jsonify({"code": 1000, "message": "请求体必须为 JSON 对象", "data": None}),
                400,
            )

        keyword_raw: Optional[str] = payload.get("keyword")
        keyword = "" if keyword_raw is None else str(keyword_raw)

        try:
            page_size = int(payload.get("pageSize", 20))
        except (TypeError, ValueError):
            return (
                jsonify({"code": 1000, "message": "pageSize 必须是整数", "data": None}),
                400,
            )

        if page_size < 1 or page_size > huihifi_client.max_page_size:
            return (
                jsonify(
                    {
                        "code": 1000,
                        "message": f"pageSize 必须在 1 到 {huihifi_client.max_page_size} 之间",
                        "data": None,
                    }
                ),
                400,
            )

        if not huihifi_client.is_configured:
            return (
                jsonify(
                    {
                        "code": 1003,
                        "message": "服务器配置错误: 未设置 HuiHiFi API 凭证",
                        "data": None,
                    }
                ),
                503,
            )

        try:
            data = huihifi_client.search_products(keyword.strip(), page_size)
            response = {"code": 0, "message": "success", "data": data}
            return jsonify(response), 200
        except HuiHiFiCredentialsError as exc:
            logger.error("HuiHiFi 凭证错误: %s", exc)
            return (
                jsonify(
                    {
                        "code": 1003,
                        "message": "服务器配置错误: 未设置 HuiHiFi API 凭证",
                        "data": None,
                    }
                ),
                503,
            )
        except HuiHiFiClientError as exc:
            logger.error("HuiHiFi API 调用失败: %s", exc)
            return (
                jsonify({"code": 1001, "message": str(exc), "data": None}),
                502,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("产品搜索接口内部错误")
            return (
                jsonify({"code": 1003, "message": f"服务器内部错误: {exc}", "data": None}),
                500,
            )

    return bp
