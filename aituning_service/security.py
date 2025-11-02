from __future__ import annotations

import logging
from typing import Iterable, Sequence

from flask import Flask, jsonify, request
from flask_cors import CORS

logger = logging.getLogger(__name__)


def apply_cors(app: Flask, allowed_origins: Sequence[str]) -> None:
    """Configure CORS for the given Flask application."""
    CORS(
        app,
        origins=list(allowed_origins),
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )


def create_origin_verifier(allowed_origins: Iterable[str]):
    """Return a before_request hook that validates the request origin."""
    allowed = tuple(allowed_origins)

    def verify_origin():
        if request.method == "OPTIONS":
            return None

        if request.path == "/health":
            return None

        origin = request.headers.get("Origin")
        referer = request.headers.get("Referer", "")

        if origin:
            if origin not in allowed:
                logger.warning("拒绝来自未授权域名的请求: %s", origin)
                return jsonify({"error": "不允许的请求来源"}), 403
        elif referer:
            if not any(referer.startswith(item) for item in allowed):
                logger.warning("拒绝来自未授权Referer的请求: %s", referer)
                return jsonify({"error": "不允许的请求来源"}), 403
        else:
            logger.warning("拒绝没有来源信息的请求")
            return jsonify({"error": "缺少请求来源信息"}), 403

        return None

    return verify_origin
