"""
速率限制服务 - 防止暴力攻击和API滥用
Rate limiting service to prevent brute force attacks and API abuse.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """
    获取客户端IP地址，支持代理转发
    Get client IP address, supporting proxy forwarding.
    """
    # 检查 X-Forwarded-For 头 (用于反向代理)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 取第一个IP (原始客户端)
        return forwarded_for.split(",")[0].strip()
    
    # 检查 X-Real-IP 头 (Nginx常用)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # 回退到直接连接IP
    return get_remote_address(request)


# 创建限流器实例
# 使用内存存储 (生产环境可配置Redis)
# 在测试模式下禁用速率限制
limiter = Limiter(
    key_func=get_client_ip,
    enabled=not settings.TESTING  # 测试模式下禁用
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    速率限制超出时的处理函数
    Handler for when rate limit is exceeded.
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": "请求过于频繁，请稍后再试",
            "error": "rate_limit_exceeded",
            "retry_after": exc.detail
        }
    )


# 预定义的速率限制配置
class RateLimits:
    """预定义的速率限制常量"""
    # 认证相关 - 严格限制防止暴力破解
    AUTH_LOGIN = "5/minute"  # 登录: 每分钟5次
    AUTH_REGISTER = "3/minute"  # 注册: 每分钟3次
    AUTH_PASSWORD_RESET = "3/minute"  # 密码重置: 每分钟3次
    
    # 一般API - 适中限制
    API_READ = "100/minute"  # 读取操作: 每分钟100次
    API_WRITE = "30/minute"  # 写入操作: 每分钟30次
    API_DELETE = "10/minute"  # 删除操作: 每分钟10次
    
    # 导出/报表 - 限制较严 (资源密集)
    EXPORT = "5/minute"  # 导出: 每分钟5次
    REPORT = "10/minute"  # 报表: 每分钟10次
    
    # Dashboard - 允许频繁刷新
    DASHBOARD = "60/minute"  # 仪表板: 每分钟60次
