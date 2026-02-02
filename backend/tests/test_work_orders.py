"""
Unit tests for work orders endpoints.
Tests: /api/v1/work-orders/*
"""

import pytest
from datetime import datetime, timezone, timedelta
from tests.conftest import auth_header


class TestWorkOrdersList:
    """Tests for listing work orders."""
    
    def test_list_work_orders_empty(self, client, admin_token):
        """Test listing work orders when none exist."""
        response = client.get(
            "/api/v1/work-orders",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_work_orders_with_data(self, client, admin_token, sample_work_order):
        """Test listing work orders with existing data."""
        response = client.get(
            "/api/v1/work-orders",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Test Work Order"
    
    def test_list_work_orders_by_status(self, client, admin_token, sample_work_order):
        """Test filtering work orders by status."""
        response = client.get(
            "/api/v1/work-orders?status=pending",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/work-orders?status=completed",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
    
    def test_list_work_orders_by_lab(self, client, admin_token, sample_work_order, sample_laboratory):
        """Test filtering work orders by laboratory."""
        response = client.get(
            f"/api/v1/work-orders?laboratory_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


class TestWorkOrdersCreate:
    """Tests for creating work orders."""
    
    def test_create_work_order_success(self, client, admin_token, sample_laboratory, sample_client, sample_site):
        """Test successful work order creation."""
        sla_deadline = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        
        response = client.post(
            "/api/v1/work-orders",
            json={
                "title": "New Work Order",
                "description": "A new test work order",
                "work_order_type": "failure_analysis",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id,
                "client_id": sample_client.id,
                "sla_deadline": sla_deadline
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Work Order"
        assert "order_number" in data
        assert "priority_score" in data
    
    def test_create_work_order_invalid_lab(self, client, admin_token, sample_client, sample_site):
        """Test creating work order with invalid laboratory."""
        response = client.post(
            "/api/v1/work-orders",
            json={
                "title": "Invalid Work Order",
                "work_order_type": "failure_analysis",
                "laboratory_id": 99999,
                "site_id": sample_site.id,
                "client_id": sample_client.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400  # API returns 400 Bad Request for invalid lab
    
    def test_create_work_order_auto_priority_score(self, client, admin_token, sample_laboratory, sample_client, sample_site):
        """Test that priority score is automatically calculated."""
        sla_deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        
        response = client.post(
            "/api/v1/work-orders",
            json={
                "title": "Priority Score Test",
                "work_order_type": "failure_analysis",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id,
                "client_id": sample_client.id,
                "sla_deadline": sla_deadline
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert "priority_score" in data
        assert data["priority_score"] >= 0


class TestWorkOrdersGet:
    """Tests for getting a single work order."""
    
    def test_get_work_order_success(self, client, admin_token, sample_work_order):
        """Test getting a work order by ID."""
        response = client.get(
            f"/api/v1/work-orders/{sample_work_order.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_work_order.id
        assert data["title"] == "Test Work Order"
    
    def test_get_work_order_not_found(self, client, admin_token):
        """Test getting a non-existent work order."""
        response = client.get(
            "/api/v1/work-orders/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestWorkOrdersUpdate:
    """Tests for updating work orders."""
    
    def test_update_work_order_success(self, client, admin_token, sample_work_order):
        """Test successful work order update."""
        response = client.put(
            f"/api/v1/work-orders/{sample_work_order.id}",
            json={"title": "Updated Work Order", "description": "Updated description"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Work Order"
    
    def test_update_work_order_status(self, client, admin_token, sample_work_order):
        """Test updating work order status."""
        response = client.put(
            f"/api/v1/work-orders/{sample_work_order.id}",
            json={"status": "in_progress"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
    
    def test_update_work_order_priority_level(self, client, admin_token, sample_work_order):
        """Test updating work order priority level."""
        response = client.put(
            f"/api/v1/work-orders/{sample_work_order.id}",
            json={"priority_level": 1},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["priority_level"] == 1


class TestWorkOrdersDelete:
    """Tests for deleting work orders."""
    
    def test_delete_work_order_success(self, client, admin_token, sample_work_order):
        """Test successful work order deletion."""
        # First set status to DRAFT (only draft or cancelled can be deleted)
        response = client.put(
            f"/api/v1/work-orders/{sample_work_order.id}",
            json={"status": "draft"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        
        # Now delete
        response = client.delete(
            f"/api/v1/work-orders/{sample_work_order.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/work-orders/{sample_work_order.id}",
            headers=auth_header(admin_token)
        )
        assert get_response.status_code == 404


class TestWorkOrderTasks:
    """Tests for work order tasks."""
    
    def test_create_task(self, client, admin_token, sample_work_order, sample_equipment):
        """Test creating a task for a work order."""
        response = client.post(
            f"/api/v1/work-orders/{sample_work_order.id}/tasks",
            json={
                "title": "Test Task",
                "description": "A test task",
                "required_equipment_id": sample_equipment.id,
                "standard_cycle_hours": 2.0
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Test Task"
        assert data["work_order_id"] == sample_work_order.id
        assert data["status"] == "pending"
    
    def test_get_work_order_tasks(self, client, admin_token, sample_work_order):
        """Test getting tasks for a work order."""
        response = client.get(
            f"/api/v1/work-orders/{sample_work_order.id}/tasks",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestWorkOrderAssignment:
    """Tests for work order assignment."""
    
    def test_assign_work_order(self, client, admin_token, sample_work_order, sample_personnel):
        """Test assigning a work order to engineer."""
        response = client.post(
            f"/api/v1/work-orders/{sample_work_order.id}/assign",
            json={"engineer_id": sample_personnel.id},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assigned_engineer_id"] == sample_personnel.id
    
    def test_assign_work_order_invalid_personnel(self, client, admin_token, sample_work_order):
        """Test assigning work order to non-existent personnel."""
        response = client.post(
            f"/api/v1/work-orders/{sample_work_order.id}/assign",
            json={"engineer_id": 99999},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400  # API returns 400 Bad Request for invalid personnel
