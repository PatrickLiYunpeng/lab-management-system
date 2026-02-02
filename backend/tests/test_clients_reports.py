"""
Tests for Client SLA and Testing Source Category endpoints.
"""
import pytest
from tests.conftest import auth_header


class TestClientSLAs:
    """Tests for Client SLA configuration endpoints."""
    
    def test_list_client_slas_empty(self, client, admin_token):
        """Test listing client SLAs when none exist."""
        response = client.get(
            "/api/v1/clients/slas",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    def test_create_client_sla(self, client, admin_token, test_site, test_laboratory, test_client):
        """Test creating a client SLA configuration."""
        sla_data = {
            "client_id": test_client["id"],
            "laboratory_id": test_laboratory["id"],
            "service_type": "express",
            "commitment_hours": 24,
            "max_hours": 48,
            "priority_weight": 15,
            "description": "Express service SLA"
        }
        response = client.post(
            "/api/v1/clients/slas",
            json=sla_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["client_id"] == test_client["id"]
        assert data["service_type"] == "express"
        assert data["commitment_hours"] == 24
        assert data["priority_weight"] == 15
    
    def test_create_client_sla_invalid_client(self, client, admin_token):
        """Test creating SLA with invalid client ID."""
        sla_data = {
            "client_id": 99999,
            "service_type": "standard",
            "commitment_hours": 48
        }
        response = client.post(
            "/api/v1/clients/slas",
            json=sla_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
        assert "Client not found" in response.json()["detail"]
    
    def test_get_client_sla(self, client, admin_token, test_client_sla):
        """Test getting a specific client SLA."""
        response = client.get(
            f"/api/v1/clients/slas/{test_client_sla['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_client_sla["id"]
    
    def test_update_client_sla(self, client, admin_token, test_client_sla):
        """Test updating a client SLA configuration."""
        update_data = {
            "commitment_hours": 36,
            "priority_weight": 20
        }
        response = client.put(
            f"/api/v1/clients/slas/{test_client_sla['id']}",
            json=update_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["commitment_hours"] == 36
        assert data["priority_weight"] == 20
    
    def test_delete_client_sla(self, client, admin_token, test_client_sla):
        """Test deleting a client SLA configuration."""
        response = client.delete(
            f"/api/v1/clients/slas/{test_client_sla['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204


class TestTestingSourceCategories:
    """Tests for Testing Source Category endpoints."""
    
    def test_list_source_categories(self, client, admin_token):
        """Test listing testing source categories."""
        response = client.get(
            "/api/v1/clients/source-categories",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        # Should have default seeded categories
        assert data["total"] >= 0
    
    def test_get_all_source_categories(self, client, admin_token):
        """Test getting all active source categories."""
        response = client.get(
            "/api/v1/clients/source-categories/all",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_source_category(self, client, admin_token):
        """Test creating a testing source category."""
        category_data = {
            "name": "Test Category",
            "code": "test_cat_new",
            "priority_weight": 12,
            "display_order": 5,
            "description": "Test category for testing",
            "color": "#ff5500"
        }
        response = client.post(
            "/api/v1/clients/source-categories",
            json=category_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Category"
        assert data["code"] == "test_cat_new"
        assert data["priority_weight"] == 12
        assert data["color"] == "#ff5500"
    
    def test_create_source_category_duplicate_code(self, client, admin_token, test_source_category):
        """Test creating source category with duplicate code."""
        category_data = {
            "name": "Another Category",
            "code": test_source_category["code"],
            "priority_weight": 10
        }
        response = client.post(
            "/api/v1/clients/source-categories",
            json=category_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_get_source_category(self, client, admin_token, test_source_category):
        """Test getting a specific source category."""
        response = client.get(
            f"/api/v1/clients/source-categories/{test_source_category['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_source_category["id"]
    
    def test_update_source_category(self, client, admin_token, test_source_category):
        """Test updating a source category."""
        update_data = {
            "name": "Updated Category",
            "priority_weight": 25
        }
        response = client.put(
            f"/api/v1/clients/source-categories/{test_source_category['id']}",
            json=update_data,
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Category"
        assert data["priority_weight"] == 25
    
    def test_delete_source_category(self, client, admin_token, test_source_category):
        """Test deleting a source category."""
        # First make sure it's not the default
        client.put(
            f"/api/v1/clients/source-categories/{test_source_category['id']}",
            json={"is_default": False},
            headers=auth_header(admin_token)
        )
        
        response = client.delete(
            f"/api/v1/clients/source-categories/{test_source_category['id']}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204


class TestReports:
    """Tests for PDF report generation endpoints."""
    
    def test_export_work_orders_pdf(self, client, admin_token, test_work_order):
        """Test exporting work orders as PDF."""
        response = client.get(
            "/api/v1/reports/work-orders/pdf",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
    
    def test_export_work_order_detail_pdf(self, client, admin_token, test_work_order):
        """Test exporting single work order detail as PDF."""
        response = client.get(
            f"/api/v1/reports/work-orders/{test_work_order['id']}/pdf",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    
    def test_export_work_order_pdf_not_found(self, client, admin_token):
        """Test exporting non-existent work order."""
        response = client.get(
            "/api/v1/reports/work-orders/99999/pdf",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404
    
    def test_export_personnel_pdf(self, client, admin_token, test_personnel):
        """Test exporting personnel as PDF."""
        response = client.get(
            "/api/v1/reports/personnel/pdf",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    
    def test_export_equipment_pdf(self, client, admin_token, test_equipment):
        """Test exporting equipment as PDF."""
        response = client.get(
            "/api/v1/reports/equipment/pdf",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
