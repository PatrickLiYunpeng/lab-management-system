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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
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


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to Laboratory Management System API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
