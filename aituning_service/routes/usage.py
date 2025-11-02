from __future__ import annotations

from flask import Blueprint, jsonify

from ..storage import UsageRepository


def create_usage_blueprint(usage_repo: UsageRepository) -> Blueprint:
    bp = Blueprint("usage", __name__)

    @bp.route("/usage/<user_token>", methods=["GET"])
    def get_usage(user_token: str):
        try:
            used = usage_repo.get_usage(user_token)
            remaining = usage_repo.remaining_quota(user_token)
            return jsonify(
                {
                    "used": used,
                    "remaining": remaining,
                    "limit": usage_repo.daily_limit,
                }
            )
        except Exception as exc:  # pragma: no cover - defensive
            return jsonify({"error": str(exc)}), 500

    return bp
