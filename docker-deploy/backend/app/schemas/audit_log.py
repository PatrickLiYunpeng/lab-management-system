"""
审计日志数据模式 - 请求/响应验证

本模块定义审计日志相关的Pydantic模式，用于API请求验证和响应序列化。
记录系统中的用户操作和数据变更历史。
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class AuditLogBase(BaseModel):
    """审计日志基础模式"""
    action: str = Field(..., description="操作类型")
    entity_type: str = Field(..., description="实体类型")
    entity_id: Optional[int] = Field(None, description="实体ID")
    entity_name: Optional[str] = Field(None, description="实体名称")
    description: Optional[str] = Field(None, description="操作描述")


class AuditLogResponse(BaseModel):
    """审计日志响应模式"""
    id: int = Field(..., description="日志ID")
    user_id: Optional[int] = Field(None, description="操作用户ID")
    username: Optional[str] = Field(None, description="操作用户名")
    user_role: Optional[str] = Field(None, description="用户角色")
    action: str = Field(..., description="操作类型")
    entity_type: str = Field(..., description="实体类型")
    entity_id: Optional[int] = Field(None, description="实体ID")
    entity_name: Optional[str] = Field(None, description="实体名称")
    laboratory_id: Optional[int] = Field(None, description="实验室ID")
    site_id: Optional[int] = Field(None, description="站点ID")
    ip_address: Optional[str] = Field(None, description="IP地址")
    request_method: Optional[str] = Field(None, description="请求方法")
    request_path: Optional[str] = Field(None, description="请求路径")
    old_values: Optional[dict] = Field(None, description="变更前的值")
    new_values: Optional[dict] = Field(None, description="变更后的值")
    description: Optional[str] = Field(None, description="操作描述")
    extra_data: Optional[dict] = Field(None, description="额外数据")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """分页审计日志列表响应模式"""
    items: list[AuditLogResponse] = Field(..., description="日志列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


class AuditLogFilter(BaseModel):
    """审计日志查询过滤参数"""
    user_id: Optional[int] = Field(None, description="按用户ID过滤")
    action: Optional[str] = Field(None, description="按操作类型过滤")
    entity_type: Optional[str] = Field(None, description="按实体类型过滤")
    entity_id: Optional[int] = Field(None, description="按实体ID过滤")
    laboratory_id: Optional[int] = Field(None, description="按实验室ID过滤")
    site_id: Optional[int] = Field(None, description="按站点ID过滤")
    start_date: Optional[datetime] = Field(None, description="开始时间")
    end_date: Optional[datetime] = Field(None, description="结束时间")
