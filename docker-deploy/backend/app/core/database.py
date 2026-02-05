"""
数据库连接和会话管理模块

本模块负责创建数据库引擎、会话工厂和基础模型类。
支持SQLite（开发环境）和MySQL/PostgreSQL（生产环境）。
"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool, StaticPool

from app.core.config import settings

# 根据数据库类型确定引擎配置
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # SQLite配置 - 使用静态连接池，禁用线程检查
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=settings.DEBUG,
    )
else:
    # MySQL/PostgreSQL配置 - 使用队列连接池
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,  # 连接前检查连接是否有效
        echo=settings.DEBUG,
    )

# 会话工厂 - 创建数据库会话的工厂类
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明式模型基类 - 所有ORM模型的基类
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    数据库会话依赖项
    
    提供数据库会话，并确保使用后正确关闭。
    用作FastAPI的依赖注入。
    
    Yields:
        数据库会话对象
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
