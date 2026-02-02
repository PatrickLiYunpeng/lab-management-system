"""
Unit tests for equipment endpoints.
Tests: /api/v1/equipment/*
"""

import pytest
from datetime import datetime, timezone, timedelta
from tests.conftest import auth_header


class TestEquipmentList:
    """Tests for listing equipment."""
    
    def test_list_equipment_empty(self, client, admin_token):
        """Test listing equipment when none exist."""
        response = client.get(
            "/api/v1/equipment/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_equipment_with_data(self, client, admin_token, sample_equipment):
        """Test listing equipment with existing data."""
        response = client.get(
            "/api/v1/equipment/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Test Equipment"
    
    def test_list_equipment_by_lab(self, client, admin_token, sample_equipment, sample_laboratory):
        """Test filtering equipment by laboratory."""
        response = client.get(
            f"/api/v1/equipment/?laboratory_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
    
    def test_list_equipment_by_type(self, client, admin_token, sample_equipment):
        """Test filtering equipment by type."""
        response = client.get(
            "/api/v1/equipment/?equipment_type=autonomous",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/equipment/?equipment_type=operator_dependent",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
    
    def test_list_equipment_by_status(self, client, admin_token, sample_equipment):
        """Test filtering equipment by status."""
        response = client.get(
            "/api/v1/equipment/?status=available",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


class TestEquipmentCreate:
    """Tests for creating equipment."""
    
    def test_create_equipment_success(self, client, admin_token, sample_laboratory, sample_site):
        """Test successful equipment creation."""
        response = client.post(
            "/api/v1/equipment/",
            json={
                "name": "New Equipment",
                "code": "EQ002",
                "equipment_type": "operator_dependent",
                "model": "Model XYZ",
                "manufacturer": "Test Manufacturer",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Equipment"
        assert data["code"] == "EQ002"
        assert data["equipment_type"] == "operator_dependent"
        assert data["status"] == "available"
    
    def test_create_equipment_duplicate_code(self, client, admin_token, sample_equipment, sample_laboratory, sample_site):
        """Test creating equipment with duplicate code."""
        response = client.post(
            "/api/v1/equipment/",
            json={
                "name": "Another Equipment",
                "code": "EQ001",  # Same as sample_equipment
                "equipment_type": "autonomous",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
    
    def test_create_equipment_invalid_lab(self, client, admin_token, sample_site):
        """Test creating equipment with invalid laboratory ID."""
        response = client.post(
            "/api/v1/equipment/",
            json={
                "name": "New Equipment",
                "code": "EQ003",
                "equipment_type": "autonomous",
                "laboratory_id": 99999,
                "site_id": sample_site.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400  # API returns 400 for invalid lab


class TestEquipmentGet:
    """Tests for getting a single equipment."""
    
    def test_get_equipment_success(self, client, admin_token, sample_equipment):
        """Test getting equipment by ID."""
        response = client.get(
            f"/api/v1/equipment/{sample_equipment.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_equipment.id
        assert data["name"] == "Test Equipment"
    
    def test_get_equipment_not_found(self, client, admin_token):
        """Test getting non-existent equipment."""
        response = client.get(
            "/api/v1/equipment/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestEquipmentUpdate:
    """Tests for updating equipment."""
    
    def test_update_equipment_success(self, client, admin_token, sample_equipment):
        """Test successful equipment update."""
        response = client.put(
            f"/api/v1/equipment/{sample_equipment.id}",
            json={"name": "Updated Equipment Name", "model": "Updated Model"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Equipment Name"
        assert data["model"] == "Updated Model"
    
    def test_update_equipment_status(self, client, admin_token, sample_equipment):
        """Test updating equipment status."""
        response = client.put(
            f"/api/v1/equipment/{sample_equipment.id}",
            json={"status": "maintenance"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "maintenance"


class TestEquipmentDelete:
    """Tests for deleting equipment."""
    
    def test_delete_equipment_success(self, client, admin_token, sample_equipment):
        """Test successful equipment deletion."""
        response = client.delete(
            f"/api/v1/equipment/{sample_equipment.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/equipment/{sample_equipment.id}",
            headers=auth_header(admin_token)
        )
        assert get_response.status_code == 404


class TestEquipmentSchedules:
    """Tests for equipment scheduling."""
    
    def test_create_schedule(self, client, admin_token, sample_equipment):
        """Test creating an equipment schedule."""
        start_time = datetime.now(timezone.utc) + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        response = client.post(
            f"/api/v1/equipment/{sample_equipment.id}/schedules",
            json={
                "equipment_id": sample_equipment.id,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "title": "Test Schedule",
                "notes": "A test schedule"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test Schedule"
        assert data["equipment_id"] == sample_equipment.id
    
    def test_get_equipment_schedules(self, client, admin_token, sample_equipment):
        """Test getting schedules for equipment."""
        response = client.get(
            f"/api/v1/equipment/{sample_equipment.id}/schedules",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_schedule_conflict_detection(self, client, admin_token, test_db, sample_equipment):
        """Test that overlapping schedules are rejected."""
        from app.models.equipment import EquipmentSchedule
        
        # Create first schedule
        start1 = datetime.now(timezone.utc) + timedelta(hours=1)
        end1 = start1 + timedelta(hours=2)
        
        schedule = EquipmentSchedule(
            equipment_id=sample_equipment.id,
            start_time=start1,
            end_time=end1,
            title="First Schedule"
        )
        test_db.add(schedule)
        test_db.commit()
        
        # Try to create overlapping schedule
        start2 = start1 + timedelta(minutes=30)
        end2 = start2 + timedelta(hours=1)
        
        response = client.post(
            f"/api/v1/equipment/{sample_equipment.id}/schedules",
            json={
                "equipment_id": sample_equipment.id,
                "start_time": start2.isoformat(),
                "end_time": end2.isoformat(),
                "title": "Overlapping Schedule"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 409  # API returns 409 Conflict for overlapping schedules
