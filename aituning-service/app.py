from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import sqlite3
import json
import requests
import base64
import os
import uuid
from datetime import datetime, date
import logging
from typing import Optional, Dict, Any, Tuple
import time
import hashlib
from dotenv import load_dotenv

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# 安全配置：允许的请求来源
ALLOWED_ORIGINS = [
    'http://localhost:3000',    # React开发环境
    'http://localhost:5173',    # Vite开发环境  
    'http://localhost:8080',
    'http://localhost:8081',    # 微前端开发环境
    'https://ai.huihifi.com',   # 生产环境微前端域名
    'https://huihifi.com',      # 主站域名
    'https://www.huihifi.com'   # 主站www域名
]

# 配置CORS，限制允许的域名
CORS(app, 
     origins=ALLOWED_ORIGINS, 
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'])

@app.before_request
def verify_origin():
    """验证请求来源，防止恶意调用"""
    # OPTIONS预检请求跳过验证
    if request.method == 'OPTIONS':
        return
    
    # 健康检查接口跳过验证
    if request.path == '/health':
        return
    
    # 获取请求来源
    origin = request.headers.get('Origin')
    referer = request.headers.get('Referer', '')
    
    # 如果有Origin header，验证Origin
    if origin:
        if origin not in ALLOWED_ORIGINS:
            logger.warning(f"拒绝来自未授权域名的请求: {origin}")
            return jsonify({"error": "不允许的请求来源"}), 403
    # 如果没有Origin但有Referer，验证Referer
    elif referer:
        referer_domain = referer.rstrip('/').split('?')[0]  # 移除查询参数
        if not any(referer.startswith(allowed) for allowed in ALLOWED_ORIGINS):
            logger.warning(f"拒绝来自未授权Referer的请求: {referer}")
            return jsonify({"error": "不允许的请求来源"}), 403
    # 既没有Origin也没有Referer的请求（可能是直接API调用）
    else:
        logger.warning("拒绝没有来源信息的请求")
        return jsonify({"error": "缺少请求来源信息"}), 403

# 配置
class Config:
    DIFY_API_KEY = os.getenv("DIFY_API_KEY")
    DIFY_BASE_URL = os.getenv("DIFY_BASE_URL", "http://49.232.175.67/v1")
    DAILY_LIMIT = 10  # 每日使用限制
    DATABASE_PATH = "usage.db"
    
    # HuiHiFi API 配置
    HUIHIFI_API_BASE_URL = os.getenv("HUIHIFI_API_BASE_URL", "https://huihifi.com/api")
    HUIHIFI_APP_KEY = os.getenv("HUIHIFI_APP_KEY")
    HUIHIFI_SECRET_KEY = os.getenv("HUIHIFI_SECRET_KEY")
    
    _timeout_env = os.getenv("HUIHIFI_API_TIMEOUT")
    try:
        HUIHIFI_API_TIMEOUT = int(_timeout_env) if _timeout_env else 10
    except ValueError:
        logger.warning(f"环境变量 HUIHIFI_API_TIMEOUT={_timeout_env} 无法解析为整数，使用默认值 10 秒")
        HUIHIFI_API_TIMEOUT = 10
    
    HUIHIFI_MAX_PAGE_SIZE = 50

if not Config.HUIHIFI_APP_KEY or not Config.HUIHIFI_SECRET_KEY:
    logger.warning("缺少 HuiHiFi API 凭证，产品搜索接口将不可用")

if not Config.DIFY_API_KEY:
    logger.warning("缺少 Dify API 密钥，AI 聊天接口将不可用")


def generate_huihifi_sign(app_key: str, secret_key: str) -> Tuple[str, int]:
    """
    生成 HuiHiFi API 所需签名
    """
    timestamp = int(time.time() * 1000)
    salt = app_key + str(timestamp)
    sign_bytes = hashlib.sha256(salt.encode("utf-8")).digest()
    sign = base64.b64encode(sign_bytes).decode("utf-8")
    return sign, timestamp


def transform_huihifi_response(huihifi_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    将 HuiHiFi API 响应转换为统一格式
    """
    if huihifi_response.get("code") != 0:
        return {
            "code": 1002,
            "message": f"HuiHiFi API 错误: {huihifi_response.get('message', 'unknown error')}",
            "data": None
        }
    
    data = huihifi_response.get("data") or {}
    products = []
    
    for item in data.get("list", []):
        products.append({
            "uuid": item.get("uuid"),
            "title": item.get("title"),
            "brand": item.get("brand", {}),
            "thumbnails": (item.get("article") or {}).get("thumbnails", []),
            "categoryName": (item.get("category") or {}).get("name", "")
        })
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "products": products,
            "total": data.get("total", 0)
        }
    }


def search_products_via_huihifi(keyword: str, page_size: int) -> Tuple[Dict[str, Any], int]:
    """
    调用 HuiHiFi 产品搜索接口
    """
    if not Config.HUIHIFI_APP_KEY or not Config.HUIHIFI_SECRET_KEY:
        logger.error("HuiHiFi API 凭证未配置")
        return {
            "code": 1003,
            "message": "服务器配置错误: 未设置 HuiHiFi API 凭证",
            "data": None
        }, 500
    
    try:
        sign, timestamp = generate_huihifi_sign(Config.HUIHIFI_APP_KEY, Config.HUIHIFI_SECRET_KEY)
        url = f"{Config.HUIHIFI_API_BASE_URL.rstrip('/')}/v1/openapi/evaluations"
        headers = {
            "Content-Type": "application/json",
            "appKey": Config.HUIHIFI_APP_KEY,
            "timestamp": str(timestamp),
            "sign": sign
        }
        payload = {
            "orderBy": "createTime",
            "direction": "DESC",
            "pageSize": min(page_size, Config.HUIHIFI_MAX_PAGE_SIZE),
            "keyword": keyword or ""
        }
        
        logger.info(f"调用 HuiHiFi 产品搜索: keyword='{keyword}', pageSize={payload['pageSize']}")
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=Config.HUIHIFI_API_TIMEOUT
        )
        response.raise_for_status()
        
        try:
            response_json = response.json()
        except ValueError:
            logger.error("HuiHiFi API 返回非 JSON 数据")
            return {
                "code": 1001,
                "message": "HuiHiFi API 调用失败: 响应格式错误",
                "data": None
            }, 502
        
        transformed = transform_huihifi_response(response_json)
        status = 200 if transformed.get("code") == 0 else 502
        return transformed, status
    
    except requests.Timeout:
        logger.error("HuiHiFi API 调用超时")
        return {
            "code": 1001,
            "message": "HuiHiFi API 调用失败: 请求超时",
            "data": None
        }, 504
    except requests.RequestException as exc:
        logger.error(f"HuiHiFi API 调用失败: {exc}")
        return {
            "code": 1001,
            "message": f"HuiHiFi API 调用失败: {str(exc)}",
            "data": None
        }, 502
    except Exception as exc:  # 捕获未知异常，避免泄露堆栈
        logger.exception("调用 HuiHiFi API 出现未知错误")
        return {
            "code": 1003,
            "message": f"服务器内部错误: {str(exc)}",
            "data": None
        }, 500

# 不再需要临时图片目录
# os.makedirs(Config.TEMP_IMAGE_DIR, exist_ok=True)

def init_database():
    """初始化数据库"""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    # 创建用户使用记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_token TEXT NOT NULL,
            usage_date DATE NOT NULL,
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_token, usage_date)
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("数据库初始化完成")

def get_user_usage(user_token: str) -> int:
    """获取用户今日使用次数"""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    today = date.today()
    cursor.execute(
        "SELECT usage_count FROM user_usage WHERE user_token = ? AND usage_date = ?",
        (user_token, today)
    )
    
    result = cursor.fetchone()
    conn.close()
    
    return result[0] if result else 0

def increment_user_usage(user_token: str) -> bool:
    """增加用户使用次数，返回是否成功"""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    today = date.today()
    
    try:
        # 先检查当前使用次数
        current_usage = get_user_usage(user_token)
        if current_usage >= Config.DAILY_LIMIT:
            return False
        
        # 使用 INSERT OR REPLACE 来更新使用次数
        cursor.execute('''
            INSERT OR REPLACE INTO user_usage (user_token, usage_date, usage_count, updated_at)
            VALUES (?, ?, COALESCE((SELECT usage_count FROM user_usage WHERE user_token = ? AND usage_date = ?), 0) + 1, CURRENT_TIMESTAMP)
        ''', (user_token, today, user_token, today))
        
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"更新用户使用次数失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def upload_image_to_dify(base64_data: str, user_token: str) -> Optional[str]:
    """上传图片到Dify，返回file_id"""
    try:
        # 移除data URI前缀
        if base64_data.startswith('data:'):
            base64_data = base64_data.split(',', 1)[1]
        
        # 解码base64
        image_data = base64.b64decode(base64_data)
        
        # 准备上传到Dify
        files = {
            'file': ('curve.png', image_data, 'image/png')
        }
        data = {
            'user': user_token
        }
        headers = {
            "Authorization": f"Bearer {Config.DIFY_API_KEY}"
        }
        
        # 上传到Dify
        response = requests.post(
            f"{Config.DIFY_BASE_URL}/files/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            file_id = result.get('id')
            logger.info(f"图片上传到Dify成功: {file_id}")
            return file_id
        else:
            logger.error(f"上传图片到Dify失败: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"上传图片到Dify失败: {e}")
        return None

def call_dify_chat(query: str, current_filters: str, image_file_id: Optional[str], user_token: str, conversation_id: Optional[str] = None):
    """调用Dify聊天接口"""
    
    # 构建请求数据
    data = {
        "inputs": {
            "currentFilters": current_filters
        },
        "query": query,
        "response_mode": "streaming",
        "user": user_token,  # 使用user_token作为用户标识
        "auto_generate_name": True
    }
    
    # 如果有conversation_id，添加到请求中
    if conversation_id:
        data["conversation_id"] = conversation_id
    
    # 如果有图片file_id，添加到files数组中
    if image_file_id:
        data["files"] = [{
            "type": "image",
            "transfer_method": "local_file",
            "upload_file_id": image_file_id
        }]
    
    # 请求头
    headers = {
        "Authorization": f"Bearer {Config.DIFY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    logger.info(f"调用Dify API: {data}")
    
    # 发送请求
    response = requests.post(
        f"{Config.DIFY_BASE_URL}/chat-messages",
        json=data,
        headers=headers,
        stream=True
    )
    
    return response

@app.route('/api/chat', methods=['POST'])
def chat():
    """聊天接口"""
    try:
        if not Config.DIFY_API_KEY:
            return jsonify({"error": "AI服务未配置"}), 503
        
        # 解析请求数据
        data = request.get_json()
        user_token = data.get('userToken')
        message = data.get('message')
        current_filters = data.get('currentFilters', '')
        curve_image_base64 = data.get('curveImageBase64')
        conversation_id = data.get('conversationId')
        
        # 验证必要参数
        if not user_token:
            return jsonify({"error": "缺少用户token"}), 400
        if not message:
            return jsonify({"error": "缺少消息内容"}), 400
        
        # 检查用户使用次数
        current_usage = get_user_usage(user_token)
        if current_usage >= Config.DAILY_LIMIT:
            return jsonify({
                "error": "今日使用次数已达上限",
                "remaining": 0,
                "limit": Config.DAILY_LIMIT
            }), 429
        
        # 处理图片（如果有的话）
        image_file_id = None
        if curve_image_base64:
            image_file_id = upload_image_to_dify(curve_image_base64, user_token)
            if not image_file_id:
                return jsonify({"error": "图片上传失败"}), 500
        
        # 增加使用次数
        if not increment_user_usage(user_token):
            return jsonify({"error": "更新使用次数失败"}), 500
        
        # 调用Dify
        dify_response = call_dify_chat(message, current_filters, image_file_id, user_token, conversation_id)
        
        if dify_response.status_code != 200:
            logger.error(f"Dify API调用失败: {dify_response.status_code} - {dify_response.text}")
            return jsonify({"error": "AI服务调用失败"}), 500
        
        # 流式转发Dify的响应
        def generate():
            try:
                for line in dify_response.iter_lines():
                    if line:
                        line_text = line.decode('utf-8')
                        if line_text.startswith('data: '):
                            # 转发SSE数据
                            yield f"{line_text}\n\n"
                        elif line_text.strip() == '':
                            # 转发空行
                            yield "\n"
            except Exception as e:
                logger.error(f"流式响应转发失败: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
                # 'Access-Control-Allow-Origin': '*',
                # 'Access-Control-Allow-Headers': 'Cache-Control'
            }
        )
        
    except Exception as e:
        logger.error(f"聊天接口错误: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/products/search', methods=['POST'])
def search_products():
    """产品搜索接口"""
    try:
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            return jsonify({
                "code": 1000,
                "message": "请求体必须为 JSON 对象",
                "data": None
            }), 400
        
        keyword = payload.get("keyword", "")
        page_size_raw = payload.get("pageSize", 20)
        
        try:
            page_size = int(page_size_raw)
        except (TypeError, ValueError):
            return jsonify({
                "code": 1000,
                "message": "pageSize 必须是整数",
                "data": None
            }), 400
        
        if page_size < 1 or page_size > Config.HUIHIFI_MAX_PAGE_SIZE:
            return jsonify({
                "code": 1000,
                "message": f"pageSize 必须在 1 到 {Config.HUIHIFI_MAX_PAGE_SIZE} 之间",
                "data": None
            }), 400
        
        if keyword is None:
            keyword = ""
        elif not isinstance(keyword, str):
            keyword = str(keyword)
        
        result, status_code = search_products_via_huihifi(keyword.strip(), page_size)
        return jsonify(result), status_code
    
    except Exception as exc:
        logger.exception("产品搜索接口内部错误")
        return jsonify({
            "code": 1003,
            "message": f"服务器内部错误: {str(exc)}",
            "data": None
        }), 500

@app.route('/api/usage/<user_token>', methods=['GET'])
def get_usage(user_token):
    """获取用户使用情况"""
    try:
        current_usage = get_user_usage(user_token)
        remaining = max(0, Config.DAILY_LIMIT - current_usage)
        
        return jsonify({
            "used": current_usage,
            "remaining": remaining,
            "limit": Config.DAILY_LIMIT,
            "date": str(date.today())
        })
    except Exception as e:
        logger.error(f"获取使用情况失败: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "huihifi-ai-backend"
    })

if __name__ == '__main__':
    # 初始化数据库
    init_database()
    
    # 启动应用
    logger.info("启动HuiHiFi AI后端服务...")
    app.run(host='0.0.0.0', port=5005, debug=False)
