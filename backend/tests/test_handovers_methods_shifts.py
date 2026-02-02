"""
Tests for Handovers, Methods, Shifts, and Audit Logs endpoints.
"""
import pytest
from tests.conftest import auth_header


class TestShifts:
    """Tests for Shift management endpoints."""
    
    def test_list_shifts_empty(self, client, admin_token):
        """Test listing shifts when none exist."""
        response = client.get(
            "/api/v1/shifts/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    
    def test_create_shift(self, client, admin_token, test_laboratory):
        """Test creating a shift."""
        shift_data = {
            "name": "Day Shift",
            "code": "DAY001",
            "start_time": "08:00:00",
            "end_time": "17:00:00",
            "laboratory_id": test_laboratory["id"]
        }
        response = client.post(
            "/api/v1/shifts/",
            json=shift_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Day Shift"
        assert data["code"] == "DAY001"
    
    def test_get_shift(self, client, admin_token, test_shift):
        """Test getting a specific shift."""
        response = client.get(
            f"/api/v1/shifts/{test_shift['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_shift["id"]
    
    def test_update_shift(self, client, admin_token, test_shift):
        """Test updating a shift."""
        update_data = {"name": "Updated Shift"}
        response = client.put(
            f"/api/v1/shifts/{test_shift['id']}",
            json=update_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Shift"


class TestMethods:
    """Tests for Method management endpoints."""
    
    def test_list_methods_empty(self, client, admin_token):
        """Test listing methods when none exist."""
        response = client.get(
            "/api/v1/methods/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    
    def test_create_method(self, client, admin_token, test_laboratory):
        """Test creating a method."""
        method_data = {
            "name": "Test Method",
            "code": "MTH001",
            "method_type": "analysis",
            "laboratory_id": test_laboratory["id"],
            "standard_cycle_hours": 4
        }
        response = client.post(
            "/api/v1/methods/",
            json=method_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Method"
        assert data["code"] == "MTH001"
    
    def test_get_method(self, client, admin_token, test_method):
        """Test getting a specific method."""
        response = client.get(
            f"/api/v1/methods/{test_method['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_method["id"]
    
    def test_update_method(self, client, admin_token, test_method):
        """Test updating a method."""
        update_data = {"standard_cycle_hours": 8}
        response = client.put(
            f"/api/v1/methods/{test_method['id']}",
            json=update_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["standard_cycle_hours"] == 8


class TestHandovers:
    """Tests for Handover management endpoints."""
    
    def test_list_handovers_empty(self, client, admin_token):
        """Test listing handovers when none exist."""
        response = client.get(
            "/api/v1/handovers/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    
    def test_handover_requires_task(self, client, admin_token):
        """Test creating handover requires a valid task."""
        handover_data = {
            "task_id": 99999,
            "progress_summary": "50% complete"
        }
        response = client.post(
            "/api/v1/handovers/",
            json=handover_data,
            headers=auth_header(admin_token)
        )
        # Should fail because task doesn't exist
        assert response.status_code in [400, 404]


class TestAuditLogs:
    """Tests for Audit Log endpoints."""
    
    def test_list_audit_logs(self, client, admin_token):
        """Test listing audit logs."""
        response = client.get(
            "/api/v1/audit-logs/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    
    def test_get_audit_actions(self, client, admin_token):
        """Test getting available audit actions."""
        response = client.get(
            "/api/v1/audit-logs/actions",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have standard actions
        assert len(data) > 0
    
    def test_get_audit_entity_types(self, client, admin_token):
        """Test getting available entity types."""
        response = client.get(
            "/api/v1/audit-logs/entity-types",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_audit_log_unauthorized(self, client):
        """Test audit logs require authentication."""
        response = client.get("/api/v1/audit-logs/")
        assert response.status_code == 401
