"""
结构化日志服务 - 提供统一的日志记录功能
Structured logging service for unified logging across the application.
"""
import logging
import sys
from datetime import datetime, timezone
from typing import Optional, Any
from pythonjsonlogger import jsonlogger

from app.core.config import settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    自定义JSON格式化器
    Custom JSON formatter with additional fields.
    """
    
    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict) -> None:
        """添加自定义字段到日志记录"""
        super().add_fields(log_record, record, message_dict)
        
        # 添加时间戳
        log_record['timestamp'] = datetime.now(timezone.utc).isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['app'] = settings.APP_NAME
        log_record['version'] = settings.APP_VERSION
        
        # 添加位置信息
        if record.pathname:
            log_record['file'] = record.pathname
            log_record['line'] = record.lineno
            log_record['function'] = record.funcName


def setup_logging(
    log_level: str = "INFO",
    json_format: bool = True,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    配置应用日志
    Configure application logging.
    
    Args:
        log_level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: 是否使用JSON格式输出
        log_file: 可选的日志文件路径
    
    Returns:
        配置好的logger实例
    """
    logger = logging.getLogger("lab_management")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # 清除现有handlers
    logger.handlers.clear()
    
    # 创建formatter
    if json_format:
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # 控制台handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 文件handler (可选)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# 全局logger实例
logger = setup_logging(
    log_level="DEBUG" if settings.DEBUG else "INFO",
    json_format=not settings.DEBUG  # 开发模式使用普通格式，生产使用JSON
)


class LoggerService:
    """
    日志服务类 - 提供结构化日志记录方法
    Logger service class providing structured logging methods.
    """
    
    def __init__(self, name: str = "lab_management"):
        self._logger = logging.getLogger(name)
    
    def _log(
        self,
        level: int,
        message: str,
        extra: Optional[dict] = None,
        exc_info: bool = False
    ) -> None:
        """内部日志记录方法"""
        extra_data = extra or {}
        self._logger.log(level, message, extra=extra_data, exc_info=exc_info)
    
    def debug(self, message: str, **kwargs: Any) -> None:
        """记录DEBUG级别日志"""
        self._log(logging.DEBUG, message, extra=kwargs)
    
    def info(self, message: str, **kwargs: Any) -> None:
        """记录INFO级别日志"""
        self._log(logging.INFO, message, extra=kwargs)
    
    def warning(self, message: str, **kwargs: Any) -> None:
        """记录WARNING级别日志"""
        self._log(logging.WARNING, message, extra=kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs: Any) -> None:
        """记录ERROR级别日志"""
        self._log(logging.ERROR, message, extra=kwargs, exc_info=exc_info)
    
    def critical(self, message: str, exc_info: bool = False, **kwargs: Any) -> None:
        """记录CRITICAL级别日志"""
        self._log(logging.CRITICAL, message, extra=kwargs, exc_info=exc_info)
    
    # 业务日志方法
    def log_request(
        self,
        method: str,
        path: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None
    ) -> None:
        """记录API请求日志"""
        self.info(
            f"API请求: {method} {path}",
            event="api_request",
            method=method,
            path=path,
            user_id=user_id,
            ip_address=ip_address,
            status_code=status_code,
            duration_ms=duration_ms
        )
    
    def log_auth(
        self,
        action: str,
        username: str,
        success: bool,
        ip_address: Optional[str] = None,
        reason: Optional[str] = None
    ) -> None:
        """记录认证相关日志"""
        level = logging.INFO if success else logging.WARNING
        self._log(
            level,
            f"认证事件: {action} - {'成功' if success else '失败'}",
            extra={
                "event": "auth",
                "action": action,
                "username": username,
                "success": success,
                "ip_address": ip_address,
                "reason": reason
            }
        )
    
    def log_security(
        self,
        event_type: str,
        description: str,
        severity: str = "medium",
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[dict] = None
    ) -> None:
        """记录安全相关日志"""
        severity_levels = {
            "low": logging.INFO,
            "medium": logging.WARNING,
            "high": logging.ERROR,
            "critical": logging.CRITICAL
        }
        level = severity_levels.get(severity.lower(), logging.WARNING)
        
        self._log(
            level,
            f"安全事件: {event_type} - {description}",
            extra={
                "event": "security",
                "event_type": event_type,
                "severity": severity,
                "user_id": user_id,
                "ip_address": ip_address,
                "details": details
            }
        )
    
    def log_business(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        details: Optional[dict] = None
    ) -> None:
        """记录业务操作日志"""
        self.info(
            f"业务操作: {action} - {entity_type}",
            event="business",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            details=details
        )


# 全局日志服务实例
log_service = LoggerService()
