"""
Pytest configuration and fixtures for backend tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set testing mode before importing app to disable rate limiting
import os
os.environ["TESTING"] = "true"

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import User, Site, Laboratory, Personnel, Skill, Equipment, Client, WorkOrder
from app.models.material import ClientSLA, TestingSourceCategory
from app.models.user import UserRole
from app.models.laboratory import LaboratoryType
from app.models.personnel import PersonnelStatus
from app.models.equipment import EquipmentType, EquipmentStatus
from app.models.work_order import WorkOrderStatus, WorkOrderType
from app.models.skill import SkillCategory


# Test database URL - in-memory SQLite
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh test database for each test."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(test_db):
    """Create an admin user for testing."""
    user = User(
        username="admin_test",
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Test Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def manager_user(test_db):
    """Create a manager user for testing."""
    user = User(
        username="manager_test",
        email="manager@test.com",
        hashed_password=get_password_hash("manager123"),
        full_name="Test Manager",
        role=UserRole.MANAGER,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def engineer_user(test_db):
    """Create an engineer user for testing."""
    user = User(
        username="engineer_test",
        email="engineer@test.com",
        hashed_password=get_password_hash("engineer123"),
        full_name="Test Engineer",
        role=UserRole.ENGINEER,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def personnel_user(test_db):
    """Create a separate user for personnel testing."""
    user = User(
        username="personnel_test",
        email="personnel@test.com",
        hashed_password=get_password_hash("personnel123"),
        full_name="Test Personnel User",
        role=UserRole.TECHNICIAN,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    """Get authentication token for admin user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin_test", "password": "admin123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def manager_token(client, manager_user):
    """Get authentication token for manager user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "manager_test", "password": "manager123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def engineer_token(client, engineer_user):
    """Get authentication token for engineer user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "engineer_test", "password": "engineer123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def sample_site(test_db):
    """Create a sample site for testing."""
    site = Site(
        name="Test Site",
        code="TS01",
        address="123 Test Street",
        city="Test City",
        country="China",
        timezone="Asia/Shanghai",
        contact_name="Test Contact",
        contact_email="contact@test.com",
        is_active=True,
    )
    test_db.add(site)
    test_db.commit()
    test_db.refresh(site)
    return site


@pytest.fixture
def sample_laboratory(test_db, sample_site):
    """Create a sample laboratory for testing."""
    lab = Laboratory(
        name="Test Lab",
        code="TL01",
        lab_type=LaboratoryType.FA,
        site_id=sample_site.id,
        description="Test laboratory for unit tests",
        is_active=True,
    )
    test_db.add(lab)
    test_db.commit()
    test_db.refresh(lab)
    return lab


@pytest.fixture
def sample_personnel(test_db, sample_site, sample_laboratory, personnel_user):
    """Create a sample personnel for testing."""
    personnel = Personnel(
        employee_id="EMP001",
        user_id=personnel_user.id,
        job_title="Test Engineer",
        department="Testing Department",
        status=PersonnelStatus.AVAILABLE,
        primary_laboratory_id=sample_laboratory.id,
        primary_site_id=sample_site.id,
    )
    test_db.add(personnel)
    test_db.commit()
    test_db.refresh(personnel)
    return personnel


@pytest.fixture
def sample_skill(test_db):
    """Create a sample skill for testing."""
    skill = Skill(
        name="Test Skill",
        code="SK001",
        category=SkillCategory.EQUIPMENT_OPERATION,
        description="A test skill for unit tests",
        is_active=True,
    )
    test_db.add(skill)
    test_db.commit()
    test_db.refresh(skill)
    return skill


@pytest.fixture
def sample_equipment(test_db, sample_laboratory, sample_site):
    """Create a sample equipment for testing."""
    equipment = Equipment(
        name="Test Equipment",
        code="EQ001",
        equipment_type=EquipmentType.AUTONOMOUS,
        model="Test Model",
        manufacturer="Test Manufacturer",
        laboratory_id=sample_laboratory.id,
        site_id=sample_site.id,
        status=EquipmentStatus.AVAILABLE,
        is_active=True,
    )
    test_db.add(equipment)
    test_db.commit()
    test_db.refresh(equipment)
    return equipment


@pytest.fixture
def sample_client(test_db):
    """Create a sample client for testing."""
    client_obj = Client(
        name="Test Client",
        code="CLI001",
        contact_name="Client Contact",
        contact_email="client@test.com",
        default_sla_days=2,
        priority_level=3,
        source_category="external",
        is_active=True,
    )
    test_db.add(client_obj)
    test_db.commit()
    test_db.refresh(client_obj)
    return client_obj


@pytest.fixture
def sample_work_order(test_db, sample_laboratory, sample_client, sample_site, admin_user):
    """Create a sample work order for testing."""
    from datetime import datetime, timezone, timedelta
    work_order = WorkOrder(
        order_number="WO-TEST-001",
        title="Test Work Order",
        description="A test work order for unit tests",
        work_order_type=WorkOrderType.FAILURE_ANALYSIS,
        laboratory_id=sample_laboratory.id,
        site_id=sample_site.id,
        client_id=sample_client.id,
        status=WorkOrderStatus.PENDING,
        priority_level=3,
        priority_score=50.0,
        sla_deadline=datetime.now(timezone.utc) + timedelta(days=7),
        created_by_id=admin_user.id,
    )
    test_db.add(work_order)
    test_db.commit()
    test_db.refresh(work_order)
    return work_order


def auth_header(token: str) -> dict:
    """Helper to create authorization header."""
    return {"Authorization": f"Bearer {token}"}


# Fixtures for API tests that return JSON responses
@pytest.fixture
def test_site(client, admin_token):
    """Create a test site via API."""
    response = client.post(
        "/api/v1/sites/",
        json={
            "name": "API Test Site",
            "code": "ATS01",
            "timezone": "Asia/Shanghai"
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_laboratory(client, admin_token, test_site):
    """Create a test laboratory via API."""
    response = client.post(
        "/api/v1/laboratories/",
        json={
            "name": "API Test Lab",
            "code": "ATL01",
            "lab_type": "fa",
            "site_id": test_site["id"]
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_client(client, admin_token):
    """Create a test client via API."""
    response = client.post(
        "/api/v1/materials/clients/",
        json={
            "name": "API Test Client",
            "code": "ATC01",
            "default_sla_days": 5,
            "priority_level": 2,
            "source_category": "external"
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_client_sla(client, admin_token, test_client, test_laboratory):
    """Create a test client SLA via API."""
    response = client.post(
        "/api/v1/clients/slas",
        json={
            "client_id": test_client["id"],
            "laboratory_id": test_laboratory["id"],
            "service_type": "standard",
            "commitment_hours": 48,
            "priority_weight": 10
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_source_category(client, admin_token):
    """Create a test source category via API."""
    response = client.post(
        "/api/v1/clients/source-categories",
        json={
            "name": "Test Source Cat",
            "code": "tsc_test",
            "priority_weight": 15,
            "display_order": 10,
            "color": "#336699"
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_personnel(client, admin_token, test_site, test_laboratory, test_db):
    """Create a test personnel via API."""
    # First create a user for the personnel
    user = User(
        username="test_personnel_user",
        email="test_personnel@test.com",
        hashed_password=get_password_hash("test123"),
        full_name="Test Personnel",
        role=UserRole.TECHNICIAN,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    response = client.post(
        "/api/v1/personnel/",
        json={
            "employee_id": "TESTEMP001",
            "user_id": user.id,
            "primary_laboratory_id": test_laboratory["id"],
            "primary_site_id": test_site["id"],
            "job_title": "Test Tech"
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_equipment(client, admin_token, test_site, test_laboratory):
    """Create a test equipment via API."""
    response = client.post(
        "/api/v1/equipment/",
        json={
            "name": "Test Equipment",
            "code": "TESTEQ001",
            "equipment_type": "autonomous",
            "laboratory_id": test_laboratory["id"],
            "site_id": test_site["id"]
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_work_order(client, admin_token, test_site, test_laboratory, test_client):
    """Create a test work order via API."""
    response = client.post(
        "/api/v1/work-orders/",
        json={
            "title": "Test Work Order",
            "work_order_type": "failure_analysis",
            "laboratory_id": test_laboratory["id"],
            "site_id": test_site["id"],
            "client_id": test_client["id"]
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_shift(client, admin_token, test_laboratory):
    """Create a test shift via API."""
    response = client.post(
        "/api/v1/shifts/",
        json={
            "name": "Test Shift",
            "code": "TSH001",
            "start_time": "09:00:00",
            "end_time": "18:00:00",
            "laboratory_id": test_laboratory["id"]
        },
        headers=auth_header(admin_token)
    )
    return response.json()


@pytest.fixture
def test_method(client, admin_token, test_laboratory):
    """Create a test method via API."""
    response = client.post(
        "/api/v1/methods/",
        json={
            "name": "Test Analysis Method",
            "code": "TAM001",
            "method_type": "analysis",
            "laboratory_id": test_laboratory["id"],
            "standard_cycle_hours": 2
        },
        headers=auth_header(admin_token)
    )
    return response.json()
