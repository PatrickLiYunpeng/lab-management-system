"""
应用配置设置

从环境变量加载配置，支持开发和生产环境的不同配置。
"""
import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
from typing import Optional


class Settings(BaseSettings):
    """从环境变量加载的应用配置"""
    
    # 应用信息
    APP_NAME: str = "Laboratory Management System"
    APP_VERSION: str = "1.0.0"
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
    
    # CORS配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:4000", "http://localhost:5173", "http://localhost:8080"]
    
    # 邮件服务配置（SMTP）
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_PORT: int = 587
    MAIL_SERVER: Optional[str] = None
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    @model_validator(mode='after')
    def validate_production_security(self) -> 'Settings':
        """
        验证生产环境安全配置
        
        非DEBUG模式且非测试环境下，使用弱密钥将抛出错误。
        开发环境仅发出警告。
        """
        weak_keys = [
            "dev-only-secret-key-change-in-production",
            "your-secret-key-change-in-production",
            "secret",
            "changeme",
        ]
        
        is_weak_key = self.SECRET_KEY in weak_keys or len(self.SECRET_KEY) < 32
        
        if is_weak_key:
            if not self.DEBUG and not self.TESTING:
                # 生产环境：弱密钥是严重安全问题，拒绝启动
                raise ValueError(
                    "安全错误: 生产环境不允许使用弱密钥。"
                    "请设置SECRET_KEY环境变量为至少32字符的随机字符串。"
                    "生成命令: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
            else:
                # 开发/测试环境：发出警告
                import warnings
                warnings.warn(
                    "安全警告: 正在使用弱密钥。"
                    "请在生产环境设置安全的SECRET_KEY环境变量。"
                    "生成命令: python -c \"import secrets; print(secrets.token_urlsafe(32))\"",
                    UserWarning
                )
        
        return self
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 全局配置实例
settings = Settings()
