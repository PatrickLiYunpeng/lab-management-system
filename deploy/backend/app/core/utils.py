"""
通用工具函数模块

提供应用程序中通用的工具函数。
"""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    获取当前UTC时间（带时区信息）
    
    替代已废弃的 datetime.utcnow()（返回无时区的datetime对象）。
    Python 3.12+ 废弃了 utcnow()，推荐使用 datetime.now(timezone.utc)。
    
    Returns:
        datetime: 带时区信息的当前UTC时间
    """
    return datetime.now(timezone.utc)
