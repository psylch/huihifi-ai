import logging
from datetime import datetime

from flask import Flask, jsonify

from .config import ALLOWED_ORIGINS, Settings
from .routes import create_chat_blueprint, create_products_blueprint, create_usage_blueprint
from .security import apply_cors, create_origin_verifier
from .services import DifyClient, HuiHiFiClient
from .storage import UsageRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    settings = Settings()
    settings.validate()

    app = Flask(__name__)
    apply_cors(app, ALLOWED_ORIGINS)
    app.before_request(create_origin_verifier(ALLOWED_ORIGINS))

    usage_repo = UsageRepository(settings.database_path, settings.daily_limit)
    usage_repo.init_database()

    dify_client = DifyClient(settings.dify_base_url, settings.dify_api_key)
    huihifi_client = HuiHiFiClient(
        base_url=settings.huihifi_api_base_url,
        app_key=settings.huihifi_app_key,
        secret_key=settings.huihifi_secret_key,
        timeout=settings.huihifi_api_timeout,
        max_page_size=settings.huihifi_max_page_size,
    )

    api_prefix = "/api"
    app.register_blueprint(create_chat_blueprint(dify_client, usage_repo), url_prefix=api_prefix)
    app.register_blueprint(create_products_blueprint(huihifi_client), url_prefix=api_prefix)
    app.register_blueprint(create_usage_blueprint(usage_repo), url_prefix=api_prefix)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify(
            {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "service": "huihifi-ai-backend",
            }
        )

    return app


app = create_app()


if __name__ == "__main__":
    logger.info("启动HuiHiFi AI后端服务...")
    app.run(host="0.0.0.0", port=5005, debug=False)
