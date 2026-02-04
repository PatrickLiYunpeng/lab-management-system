"""
审计日志服务 - 提供用户操作日志记录功能

本模块提供统一的审计日志记录接口，用于追踪系统中的重要操作，
包括实体创建、更新、删除、状态变更、用户登录等。
"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, AuditAction
from app.models.user import User


class AuditService:
    """审计日志服务类，提供各类操作的日志记录方法"""
    
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        entity_name: Optional[str] = None,
        user: Optional[User] = None,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None,
        laboratory_id: Optional[int] = None,
        site_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        创建审计日志记录
        
        Args:
            db: 数据库会话
            action: 执行的操作（使用AuditAction枚举值）
            entity_type: 受影响的实体类型（如"work_order"、"personnel"）
            entity_id: 受影响实体的ID
            entity_name: 实体的可读名称
            user: 执行操作的用户对象
            user_id: 用户ID（user对象的替代方式）
            username: 用户名（用于历史记录保存）
            user_role: 操作时的用户角色
            laboratory_id: 关联的实验室ID
            site_id: 关联的站点ID
            old_values: 更新前的状态
            new_values: 创建/更新后的状态
            description: 可读的操作描述
            ip_address: 客户端IP地址
            user_agent: 客户端User-Agent字符串
            request_method: HTTP方法（GET、POST等）
            request_path: 请求URL路径
            extra_data: 额外的上下文数据
            
        Returns:
            创建的AuditLog实例
        """
        # 如果提供了用户对象，提取用户信息
        if user:
            user_id = user.id
            username = user.username
            user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
        
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            laboratory_id=laboratory_id,
            site_id=site_id,
            old_values=old_values,
            new_values=new_values,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            extra_data=extra_data,
            created_at=datetime.now(timezone.utc),
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def log_create(
        db: Session,
        entity_type: str,
        entity_id: int,
        entity_name: Optional[str] = None,
        new_values: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        **kwargs: Any
    ) -> AuditLog:
        """记录创建操作"""
        return AuditService.log(
            db=db,
            action=AuditAction.CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            new_values=new_values,
            user=user,
            description=f"创建了{entity_type} '{entity_name or entity_id}'",
            **kwargs
        )
    
    @staticmethod
    def log_update(
        db: Session,
        entity_type: str,
        entity_id: int,
        entity_name: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        **kwargs: Any
    ) -> AuditLog:
        """记录更新操作"""
        return AuditService.log(
            db=db,
            action=AuditAction.UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
            user=user,
            description=f"更新了{entity_type} '{entity_name or entity_id}'",
            **kwargs
        )
    
    @staticmethod
    def log_delete(
        db: Session,
        entity_type: str,
        entity_id: int,
        entity_name: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        user: Optional[User] = None,
        **kwargs: Any
    ) -> AuditLog:
        """记录删除操作"""
        return AuditService.log(
            db=db,
            action=AuditAction.DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values=old_values,
            user=user,
            description=f"删除了{entity_type} '{entity_name or entity_id}'",
            **kwargs
        )
    
    @staticmethod
    def log_login(
        db: Session,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        **kwargs: Any
    ) -> AuditLog:
        """记录登录操作"""
        action = AuditAction.LOGIN
        description = f"用户'{user.username}'登录成功" if success else f"用户'{user.username}'登录失败"
        
        return AuditService.log(
            db=db,
            action=action,
            entity_type="user",
            entity_id=user.id,
            entity_name=user.username,
            user=user,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data={"success": success},
            **kwargs
        )
    
    @staticmethod
    def log_status_change(
        db: Session,
        entity_type: str,
        entity_id: int,
        entity_name: Optional[str] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        user: Optional[User] = None,
        **kwargs: Any
    ) -> AuditLog:
        """记录状态变更操作"""
        return AuditService.log(
            db=db,
            action=AuditAction.UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            old_values={"status": old_status},
            new_values={"status": new_status},
            user=user,
            description=f"{entity_type}'{entity_name or entity_id}'状态从'{old_status}'变更为'{new_status}'",
            **kwargs
        )
    
    @staticmethod
    def log_assignment(
        db: Session,
        entity_type: str,
        entity_id: int,
        entity_name: Optional[str] = None,
        assignee_id: Optional[int] = None,
        assignee_name: Optional[str] = None,
        user: Optional[User] = None,
        **kwargs: Any
    ) -> AuditLog:
        """记录分配操作"""
        return AuditService.log(
            db=db,
            action=AuditAction.ASSIGN,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            user=user,
            description=f"将{entity_type}'{entity_name or entity_id}'分配给'{assignee_name or assignee_id}'",
            new_values={"assignee_id": assignee_id, "assignee_name": assignee_name},
            **kwargs
        )


# 全局单例实例，便于导入使用
audit_service = AuditService()
