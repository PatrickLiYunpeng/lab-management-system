"""
应用配置设置

从环境变量加载配置，支持开发和生产环境的不同配置。
"""
import os
import secrets
import sys
import logging
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
from typing import Optional

# 配置日志
logger = logging.getLogger(__name__)

# 已知的弱密钥列表
WEAK_SECRET_KEYS = frozenset([
    "dev-only-secret-key-change-in-production",
    "your-secret-key-change-in-production",
    "secret",
    "changeme",
    "password",
    "123456",
    "admin",
])

# 密钥最小长度
MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    """从环境变量加载的应用配置"""
    
    # 应用信息
    APP_NAME: str = "Laboratory Management System"
    APP_VERSION: str = "2.6.0"
    DEBUG: bool = True  # 开发环境默认True，生产环境通过环境变量设置为False
    TESTING: bool = False  # 测试环境设置为True以禁用速率限制
    
    # API配置
    API_V1_PREFIX: str = "/api/v1"
    
    # 数据库配置（使用MySQL）
    DATABASE_URL: str = "mysql+pymysql://lab_user:lab_password_2026@localhost/lab_management?charset=utf8mb4"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # JWT认证配置
    # 安全警告: 生产环境必须通过环境变量设置SECRET_KEY
    # 生成命令: python -c "import secrets; print(secrets.token_urlsafe(32))"
    SECRET_KEY: str = "dev-only-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 刷新令牌7天有效
    
    # CORS配置
    # 生产环境应通过环境变量设置具体的允许来源，如: CORS_ORIGINS=["https://example.com"]
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:4000", "http://localhost:5173", "http://localhost:8080"]
    
    # 邮件服务配置（SMTP）
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_PORT: int = 587
    MAIL_SERVER: Optional[str] = None
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    # 密码策略配置
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # 业务配置常量
    # 乐观锁最大重试次数
    OPTIMISTIC_LOCK_MAX_RETRIES: int = 3
    # 分页默认值
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    # 导出最大记录数
    EXPORT_MAX_RECORDS: int = 10000
    
    @model_validator(mode='after')
    def validate_production_security(self) -> 'Settings':
        """
        验证生产环境安全配置
        
        非DEBUG模式且非测试环境下，使用弱密钥将抛出错误。
        开发环境仅发出警告。
        """
        is_weak_key = (
            self.SECRET_KEY in WEAK_SECRET_KEYS or 
            len(self.SECRET_KEY) < MIN_SECRET_KEY_LENGTH or
            self.SECRET_KEY.lower() == self.SECRET_KEY  # 全小写也视为弱密钥
        )
        
        # 检查是否从环境变量获取SECRET_KEY
        secret_from_env = os.environ.get("SECRET_KEY")
        
        if not self.DEBUG and not self.TESTING:
            # 生产环境严格检查
            if secret_from_env is None:
                raise ValueError(
                    "\n" + "="*60 + "\n"
                    "安全错误: 生产环境必须通过环境变量设置SECRET_KEY\n"
                    "="*60 + "\n"
                    "请设置SECRET_KEY环境变量为至少32字符的随机字符串。\n"
                    "生成命令: python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
                    "示例: export SECRET_KEY='your-secure-random-key-here'\n"
                    "="*60
                )
            
            if is_weak_key:
                raise ValueError(
                    "\n" + "="*60 + "\n"
                    "安全错误: 生产环境不允许使用弱密钥\n"
                    "="*60 + "\n"
                    f"当前SECRET_KEY长度: {len(self.SECRET_KEY)} (最小要求: {MIN_SECRET_KEY_LENGTH})\n"
                    "请使用以下命令生成安全密钥:\n"
                    "python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
                    "="*60
                )
            
            # 生产环境检查CORS配置
            localhost_origins = [o for o in self.CORS_ORIGINS if "localhost" in o or "127.0.0.1" in o]
            if localhost_origins:
                logger.warning(
                    f"安全警告: 生产环境CORS配置包含本地地址: {localhost_origins}。"
                    "建议通过CORS_ORIGINS环境变量设置具体的生产域名。"
                )
        else:
            # 开发/测试环境：发出警告
            if is_weak_key:
                import warnings
                warnings.warn(
                    "\n安全警告: 正在使用弱密钥（仅开发环境允许）。\n"
                    "请在生产环境设置安全的SECRET_KEY环境变量。\n"
                    "生成命令: python -c \"import secrets; print(secrets.token_urlsafe(32))\"",
                    UserWarning,
                    stacklevel=2
                )
        
        return self
    
    def is_production(self) -> bool:
        """检查是否为生产环境"""
        return not self.DEBUG and not self.TESTING
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 全局配置实例
settings = Settings()
