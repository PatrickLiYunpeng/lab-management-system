"""
实验室管理系统 - 主应用入口 / Laboratory Management System - Main Application Entry Point

一套面向半导体封装测试设施的综合性实验室管理系统，
支持失效分析(FA)和可靠性测试(Reliability)操作，可管理多个站点和实验室。

系统架构:
- FastAPI: Web框架，提供RESTful API
- SQLAlchemy: ORM数据库访问
- Pydantic: 数据验证和序列化
- JWT: 用户身份认证

核心功能模块:
- 用户管理: 用户账户、角色权限、认证授权
- 组织管理: 站点、实验室、位置
- 人员管理: 人员档案、技能、班次
- 设备管理: 设备台账、状态、排程
- 工单管理: 工单创建、任务分配、流程跟踪
- 物料管理: 物料入库、消耗、归还
- 报表统计: 仪表盘、KPI、PDF导出

中间件配置:
- CORS: 跨域资源共享
- Rate Limiting: API速率限制

API文档:
- Swagger UI: /docs
- ReDoc: /redoc
- OpenAPI JSON: /api/v1/openapi.json
"""
import time
from datetime import datetime, timezone
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.database import get_db, engine
from app.core.metrics import get_metrics, get_metrics_content_type, init_app_info
from app.api.v1.router import api_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Laboratory Management System for semiconductor packaging and testing",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Initialize Prometheus metrics
init_app_info(
    version=settings.APP_VERSION,
    environment="production" if not settings.DEBUG else "development"
)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    基础健康检查端点
    
    返回服务基本运行状态，不检查依赖项。
    适用于负载均衡器的快速存活检查。
    """
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/health/ready", tags=["Health"])
def health_check_ready(db: Session = Depends(get_db)):
    """
    就绪状态检查端点（深度健康检查）
    
    检查所有关键依赖项的状态：
    - 数据库连接
    - 响应时间
    
    适用于 Kubernetes readiness probe 或完整的健康监控。
    """
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {}
    }
    
    # 检查数据库连接
    try:
        start_time = time.time()
        db.execute(text("SELECT 1"))
        db_latency = round((time.time() - start_time) * 1000, 2)  # 毫秒
        health_status["checks"]["database"] = {
            "status": "healthy",
            "latency_ms": db_latency
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # 如果任何检查失败，返回503状态码
    if health_status["status"] == "unhealthy":
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=health_status)
    
    return health_status


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to Laboratory Management System API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/metrics", tags=["Monitoring"])
def metrics():
    """
    Prometheus指标端点
    
    返回Prometheus格式的应用指标数据，用于监控系统抓取。
    包含HTTP请求统计、数据库连接状态、业务指标等。
    
    Returns:
        Prometheus格式的指标文本
    """
    from fastapi.responses import Response
    return Response(
        content=get_metrics(),
        media_type=get_metrics_content_type()
    )
