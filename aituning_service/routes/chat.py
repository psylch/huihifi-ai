from __future__ import annotations

import json
import logging
from typing import Optional

from flask import Blueprint, Response, jsonify, request

from ..services import DifyClient
from ..storage import UsageRepository

logger = logging.getLogger(__name__)


def create_chat_blueprint(dify_client: DifyClient, usage_repo: UsageRepository) -> Blueprint:
    bp = Blueprint("chat", __name__)

    @bp.route("/chat", methods=["POST"])
    def chat() -> Response:
        if not dify_client.is_configured:
            return jsonify({"error": "AI服务未配置"}), 503

        data = request.get_json(silent=True) or {}
        user_token: Optional[str] = data.get("userToken")
        message: Optional[str] = data.get("message")
        current_filters: str = data.get("currentFilters", "")
        curve_image_base64: Optional[str] = data.get("curveImageBase64")
        conversation_id: Optional[str] = data.get("conversationId")

        if not user_token:
            return jsonify({"error": "缺少用户token"}), 400
        if not message:
            return jsonify({"error": "缺少消息内容"}), 400

        current_usage = usage_repo.get_usage(user_token)
        if current_usage >= usage_repo.daily_limit:
            return (
                jsonify(
                    {
                        "error": "今日使用次数已达上限",
                        "remaining": 0,
                        "limit": usage_repo.daily_limit,
                    }
                ),
                429,
            )

        image_file_id: Optional[str] = None
        if curve_image_base64:
            image_file_id = dify_client.upload_image(curve_image_base64, user_token)
            if not image_file_id:
                return jsonify({"error": "图片上传失败"}), 500

        if not usage_repo.increment_usage(user_token):
            return jsonify({"error": "更新使用次数失败"}), 500

        try:
            dify_response = dify_client.stream_chat(
                query=message,
                current_filters=current_filters,
                user_token=user_token,
                conversation_id=conversation_id,
                image_file_id=image_file_id,
            )
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 503

        if dify_response.status_code != 200:
            logger.error(
                "Dify API调用失败: status=%s body=%s",
                dify_response.status_code,
                dify_response.text,
            )
            return jsonify({"error": "AI服务调用失败"}), 500

        def generate():
            try:
                for line in dify_response.iter_lines():
                    if not line:
                        yield "\n"
                        continue

                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        yield f"{decoded}\n\n"
                    else:
                        yield f"{decoded}\n"
            except Exception as exc:  # pragma: no cover - defensive fallback
                logger.error("流式响应转发失败: %s", exc)
                payload = json.dumps({"error": str(exc)}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

        headers = {"Cache-Control": "no-cache", "Connection": "keep-alive"}
        return Response(generate(), mimetype="text/event-stream", headers=headers)

    return bp
