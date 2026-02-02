"""
API v1 Router - Aggregates all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, sites, laboratories, personnel, skills,
    equipment, materials, work_orders, dashboard, shifts, handovers, methods,
    audit_logs, clients, reports, users, permissions
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(sites.router)
api_router.include_router(laboratories.router)
api_router.include_router(personnel.router)
api_router.include_router(skills.router)
api_router.include_router(equipment.router)
api_router.include_router(materials.router)
api_router.include_router(work_orders.router)
api_router.include_router(dashboard.router)
api_router.include_router(shifts.router)
api_router.include_router(handovers.router)
api_router.include_router(methods.router)
api_router.include_router(audit_logs.router)
api_router.include_router(clients.router)
api_router.include_router(reports.router)
api_router.include_router(permissions.router)
