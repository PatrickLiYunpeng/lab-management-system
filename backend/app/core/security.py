"""
安全工具模块 - 认证和授权功能

本模块提供JWT令牌处理和密码哈希功能。
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict, List, Tuple

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# 密码哈希上下文，使用bcrypt算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_password_complexity(password: str) -> Tuple[bool, List[str]]:
    """
    验证密码复杂度是否符合安全策略
    
    根据config.py中的设置进行验证：
    - 最小长度
    - 大写字母要求
    - 小写字母要求
    - 数字要求
    - 特殊字符要求
    
    Args:
        password: 待验证的密码
    
    Returns:
        Tuple[bool, List[str]]: (是否通过验证, 错误信息列表)
    """
    errors: List[str] = []
    
    # 检查最小长度
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        errors.append(f"密码长度至少需要 {settings.PASSWORD_MIN_LENGTH} 个字符")
    
    # 检查大写字母
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        errors.append("密码必须包含至少一个大写字母")
    
    # 检查小写字母
    if settings.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        errors.append("密码必须包含至少一个小写字母")
    
    # 检查数字
    if settings.PASSWORD_REQUIRE_DIGIT and not re.search(r'\d', password):
        errors.append("密码必须包含至少一个数字")
    
    # 检查特殊字符
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'`~]', password):
        errors.append("密码必须包含至少一个特殊字符 (!@#$%^&*等)")
    
    return (len(errors) == 0, errors)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证明文密码与哈希密码是否匹配
    
    Args:
        plain_password: 明文密码
        hashed_password: 哈希后的密码
    
    Returns:
        密码匹配返回True，否则返回False
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    使用bcrypt算法对密码进行哈希
    
    Args:
        password: 明文密码
    
    Returns:
        哈希后的密码字符串
    """
    return pwd_context.hash(password)


def create_access_token(
    subject: str | Any,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None
) -> str:
    """
    创建JWT访问令牌
    
    Args:
        subject: 令牌主题（通常为用户ID）
        expires_delta: 可选的自定义过期时间
        additional_claims: 可选的额外声明信息
    
    Returns:
        编码后的JWT令牌字符串
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode: Dict[str, Any] = {"exp": expire, "sub": str(subject)}
    
    if additional_claims:
        to_encode.update(additional_claims)
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    解码并验证JWT访问令牌
    
    Args:
        token: JWT令牌字符串
    
    Returns:
        解码后的令牌载荷，无效时返回None
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None
