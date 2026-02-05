"""
简单的内存缓存服务 - Simple In-Memory Cache Service

提供带有TTL（生存时间）的内存缓存功能，用于减少数据库查询压力。
适用于甘特图数据等频繁查询但更新不频繁的场景。

特性:
- 基于时间的缓存过期
- 线程安全（使用锁）
- 自动清理过期条目
- 可配置TTL
"""
import time
import hashlib
import json
import threading
from typing import Any, Optional, Callable
from functools import wraps

from app.core.config import settings


class TTLCache:
    """
    带有TTL的简单内存缓存
    
    Simple in-memory cache with time-to-live expiration.
    Thread-safe with automatic cleanup of expired entries.
    """
    
    def __init__(self, default_ttl: int = 30, max_size: int = 1000):
        """
        初始化缓存
        
        Args:
            default_ttl: 默认缓存过期时间（秒）
            max_size: 最大缓存条目数
        """
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._hits = 0
        self._misses = 0
    
    def _generate_key(self, *args, **kwargs) -> str:
        """生成缓存键"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> tuple[bool, Any]:
        """
        获取缓存值
        
        Returns:
            tuple: (是否命中, 缓存值)
        """
        with self._lock:
            if key in self._cache:
                value, expire_time = self._cache[key]
                if time.time() < expire_time:
                    self._hits += 1
                    return True, value
                else:
                    # 过期，删除
                    del self._cache[key]
            
            self._misses += 1
            return False, None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），None则使用默认值
        """
        with self._lock:
            # 如果超过最大容量，清理过期条目
            if len(self._cache) >= self.max_size:
                self._cleanup()
            
            # 如果清理后仍超过容量，删除最老的条目
            if len(self._cache) >= self.max_size:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            
            expire_time = time.time() + (ttl if ttl is not None else self.default_ttl)
            self._cache[key] = (value, expire_time)
    
    def delete(self, key: str) -> bool:
        """删除缓存条目"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """清空所有缓存"""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
    
    def _cleanup(self) -> int:
        """清理过期条目，返回清理数量"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, expire_time) in self._cache.items()
            if current_time >= expire_time
        ]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)
    
    def invalidate_pattern(self, pattern: str) -> int:
        """
        使匹配模式的缓存失效
        
        Args:
            pattern: 键前缀模式
            
        Returns:
            删除的条目数
        """
        with self._lock:
            keys_to_delete = [key for key in self._cache if key.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    @property
    def stats(self) -> dict:
        """获取缓存统计信息"""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": f"{hit_rate:.1f}%"
            }


def cached(cache: TTLCache, ttl: Optional[int] = None, key_prefix: str = ""):
    """
    缓存装饰器
    
    用于装饰需要缓存的函数，自动处理缓存逻辑。
    
    Args:
        cache: TTLCache实例
        ttl: 缓存过期时间（秒）
        key_prefix: 缓存键前缀
    
    Example:
        @cached(gantt_cache, ttl=30, key_prefix="gantt")
        def get_gantt_data(start_date, end_date):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 测试模式下跳过缓存
            if settings.TESTING:
                return func(*args, **kwargs)
            
            # 生成缓存键
            cache_key = f"{key_prefix}:{cache._generate_key(*args, **kwargs)}"
            
            # 尝试从缓存获取
            hit, value = cache.get(cache_key)
            if hit:
                return value
            
            # 缓存未命中，执行函数
            result = func(*args, **kwargs)
            
            # 存入缓存
            cache.set(cache_key, result, ttl)
            
            return result
        
        # 添加缓存控制方法到包装函数
        wrapper.cache = cache
        wrapper.cache_key_prefix = key_prefix
        
        return wrapper
    return decorator


# 全局缓存实例
# 甘特图数据缓存 - 30秒TTL，最多500条
gantt_cache = TTLCache(default_ttl=30, max_size=500)

# 仪表板统计缓存 - 60秒TTL，最多100条
dashboard_cache = TTLCache(default_ttl=60, max_size=100)
