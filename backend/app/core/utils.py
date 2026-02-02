"""
Common utility functions for the application.
"""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    Return current UTC time as timezone-aware datetime.
    
    This replaces the deprecated datetime.utcnow() which returns
    a naive datetime object. Python 3.12+ deprecates utcnow() in
    favor of datetime.now(timezone.utc).
    
    Returns:
        datetime: Current UTC time with timezone info
    """
    return datetime.now(timezone.utc)
