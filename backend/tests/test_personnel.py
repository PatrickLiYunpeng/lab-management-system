"""
Unit tests for personnel endpoints.
Tests: /api/v1/personnel/*
"""

import pytest
from datetime import datetime, timezone, timedelta
from tests.conftest import auth_header


class TestPersonnelList:
    """Tests for listing personnel."""
    
    def test_list_personnel_empty(self, client, admin_token):
        """Test listing personnel when none exist."""
        response = client.get(
            "/api/v1/personnel/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_personnel_with_data(self, client, admin_token, sample_personnel, personnel_user):
        """Test listing personnel with existing data."""
        response = client.get(
            "/api/v1/personnel/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        # Name comes from the related user object
        assert data["items"][0]["user"]["full_name"] == personnel_user.full_name
        assert data["items"][0]["employee_id"] == "EMP001"
    
    def test_list_personnel_by_lab(self, client, admin_token, sample_personnel, sample_laboratory):
        """Test filtering personnel by laboratory."""
        response = client.get(
            f"/api/v1/personnel/?laboratory_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
    
    def test_list_personnel_by_status(self, client, admin_token, sample_personnel):
        """Test filtering personnel by status."""
        response = client.get(
            "/api/v1/personnel/?status=available",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/personnel/?status=on_leave",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestPersonnelCreate:
    """Tests for creating personnel."""
    
    def test_create_personnel_success(self, client, admin_token, test_db, sample_site, sample_laboratory):
        """Test successful personnel creation."""
        from app.models import User
        from app.models.user import UserRole
        from app.core.security import get_password_hash
        
        # Create a new user first (personnel requires a linked user)
        new_user = User(
            username="new_personnel_user",
            email="newpersonnel@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="New Personnel User",
            role=UserRole.TECHNICIAN,
            is_active=True,
        )
        test_db.add(new_user)
        test_db.commit()
        test_db.refresh(new_user)
        
        response = client.post(
            "/api/v1/personnel/",
            json={
                "employee_id": "EMP002",
                "user_id": new_user.id,
                "primary_laboratory_id": sample_laboratory.id,
                "primary_site_id": sample_site.id,
                "job_title": "Senior Engineer",
                "department": "Testing"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["employee_id"] == "EMP002"
        assert data["status"] == "available"
        assert data["job_title"] == "Senior Engineer"
    
    def test_create_personnel_duplicate_employee_id(self, client, admin_token, test_db, sample_personnel, sample_site, sample_laboratory):
        """Test creating personnel with duplicate employee ID."""
        from app.models import User
        from app.models.user import UserRole
        from app.core.security import get_password_hash
        
        # Create another user
        another_user = User(
            username="another_user",
            email="another@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="Another User",
            role=UserRole.TECHNICIAN,
            is_active=True,
        )
        test_db.add(another_user)
        test_db.commit()
        test_db.refresh(another_user)
        
        response = client.post(
            "/api/v1/personnel/",
            json={
                "employee_id": "EMP001",  # Same as sample_personnel
                "user_id": another_user.id,
                "primary_laboratory_id": sample_laboratory.id,
                "primary_site_id": sample_site.id,
                "job_title": "Engineer"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
    
    def test_create_personnel_invalid_lab(self, client, admin_token, test_db, sample_site):
        """Test creating personnel with invalid laboratory ID."""
        from app.models import User
        from app.models.user import UserRole
        from app.core.security import get_password_hash
        
        # Create a user
        new_user = User(
            username="invalid_lab_user",
            email="invalidlab@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="Invalid Lab User",
            role=UserRole.TECHNICIAN,
            is_active=True,
        )
        test_db.add(new_user)
        test_db.commit()
        test_db.refresh(new_user)
        
        response = client.post(
            "/api/v1/personnel/",
            json={
                "employee_id": "EMP003",
                "user_id": new_user.id,
                "primary_laboratory_id": 99999,
                "primary_site_id": sample_site.id,
                "job_title": "Engineer"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400


class TestPersonnelGet:
    """Tests for getting a single personnel."""
    
    def test_get_personnel_success(self, client, admin_token, sample_personnel, personnel_user):
        """Test getting personnel by ID."""
        response = client.get(
            f"/api/v1/personnel/{sample_personnel.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_personnel.id
        assert data["employee_id"] == "EMP001"
        assert data["user"]["full_name"] == personnel_user.full_name
    
    def test_get_personnel_not_found(self, client, admin_token):
        """Test getting non-existent personnel."""
        response = client.get(
            "/api/v1/personnel/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestPersonnelUpdate:
    """Tests for updating personnel."""
    
    def test_update_personnel_success(self, client, admin_token, sample_personnel):
        """Test successful personnel update."""
        response = client.put(
            f"/api/v1/personnel/{sample_personnel.id}",
            json={"job_title": "Senior Test Engineer", "department": "Quality Assurance"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_title"] == "Senior Test Engineer"
        assert data["department"] == "Quality Assurance"
    
    def test_update_personnel_status(self, client, admin_token, sample_personnel):
        """Test updating personnel status."""
        response = client.put(
            f"/api/v1/personnel/{sample_personnel.id}",
            json={"status": "on_leave"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "on_leave"


class TestPersonnelDelete:
    """Tests for deleting personnel."""
    
    def test_delete_personnel_success(self, client, admin_token, sample_personnel):
        """Test successful personnel deletion."""
        response = client.delete(
            f"/api/v1/personnel/{sample_personnel.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/personnel/{sample_personnel.id}",
            headers=auth_header(admin_token)
        )
        assert get_response.status_code == 404


class TestBorrowRequests:
    """Tests for staff borrow request functionality."""
    
    def test_create_borrow_request(self, client, admin_token, test_db, sample_personnel, sample_site, sample_laboratory):
        """Test creating a staff borrow request."""
        from app.models import Laboratory
        from app.models.laboratory import LaboratoryType
        
        # Create a second laboratory to borrow to
        target_lab = Laboratory(
            name="Target Lab",
            code="TL02",
            lab_type=LaboratoryType.RELIABILITY,
            site_id=sample_site.id,
            is_active=True,
        )
        test_db.add(target_lab)
        test_db.commit()
        test_db.refresh(target_lab)
        
        start_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        end_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        
        response = client.post(
            "/api/v1/personnel/borrow-requests",
            json={
                "personnel_id": sample_personnel.id,
                "to_laboratory_id": target_lab.id,
                "reason": "Project support needed",
                "start_date": start_date,
                "end_date": end_date
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["personnel_id"] == sample_personnel.id
        assert data["status"] == "pending"
    
    def test_list_borrow_requests(self, client, admin_token):
        """Test listing borrow requests."""
        response = client.get(
            "/api/v1/personnel/borrow-requests/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
