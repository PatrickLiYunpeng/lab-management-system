"""
Unit tests for dashboard endpoints.
Tests: /api/v1/dashboard/*
"""

import pytest
from tests.conftest import auth_header


class TestDashboardSummary:
    """Tests for dashboard summary endpoint."""
    
    def test_get_summary_empty(self, client, admin_token):
        """Test dashboard summary with no data."""
        response = client.get(
            "/api/v1/dashboard/summary",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "active_work_orders" in data
        assert "overdue_work_orders" in data
        assert "total_personnel" in data
        assert "available_equipment" in data
        assert "pending_materials" in data
    
    def test_get_summary_with_data(self, client, admin_token, sample_work_order, sample_personnel, sample_equipment):
        """Test dashboard summary with existing data."""
        response = client.get(
            "/api/v1/dashboard/summary",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_personnel"] >= 1
        assert data["total_equipment"] >= 1
    
    def test_get_summary_without_auth(self, client):
        """Test dashboard summary without authentication."""
        response = client.get("/api/v1/dashboard/summary")
        assert response.status_code == 401


class TestEquipmentUtilization:
    """Tests for equipment utilization endpoint."""
    
    def test_get_equipment_utilization(self, client, admin_token):
        """Test getting equipment utilization data."""
        response = client.get(
            "/api/v1/dashboard/equipment-utilization",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_equipment_utilization_with_lab_filter(self, client, admin_token, sample_laboratory):
        """Test equipment utilization filtered by laboratory."""
        response = client.get(
            f"/api/v1/dashboard/equipment-utilization?lab_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPersonnelEfficiency:
    """Tests for personnel efficiency endpoint."""
    
    def test_get_personnel_efficiency(self, client, admin_token):
        """Test getting personnel efficiency data."""
        response = client.get(
            "/api/v1/dashboard/personnel-efficiency",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_personnel_efficiency_with_lab_filter(self, client, admin_token, sample_laboratory):
        """Test personnel efficiency filtered by laboratory."""
        response = client.get(
            f"/api/v1/dashboard/personnel-efficiency?lab_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTaskCompletion:
    """Tests for task completion stats endpoint."""
    
    def test_get_task_completion(self, client, admin_token):
        """Test getting task completion statistics."""
        response = client.get(
            "/api/v1/dashboard/task-completion",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "on_time_tasks" in data
        assert "delayed_tasks" in data
        assert "completion_rate" in data
    
    def test_get_task_completion_with_date_range(self, client, admin_token):
        """Test task completion with date range filter."""
        response = client.get(
            "/api/v1/dashboard/task-completion?start_date=2026-01-01&end_date=2026-12-31",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_tasks" in data


class TestSLAPerformance:
    """Tests for SLA performance endpoint."""
    
    def test_get_sla_performance(self, client, admin_token):
        """Test getting SLA performance data."""
        response = client.get(
            "/api/v1/dashboard/sla-performance",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_get_sla_performance_with_client_filter(self, client, admin_token, sample_client):
        """Test SLA performance filtered by client."""
        response = client.get(
            f"/api/v1/dashboard/sla-performance?client_id={sample_client.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200


class TestWorkloadAnalysis:
    """Tests for workload analysis endpoint."""
    
    def test_get_workload_analysis(self, client, admin_token):
        """Test getting workload analysis data."""
        response = client.get(
            "/api/v1/dashboard/workload-analysis",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_get_workload_analysis_with_lab_filter(self, client, admin_token, sample_laboratory):
        """Test workload analysis filtered by laboratory."""
        response = client.get(
            f"/api/v1/dashboard/workload-analysis?lab_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200


class TestDashboardMain:
    """Tests for main dashboard endpoint."""
    
    def test_get_dashboard(self, client, admin_token):
        """Test getting full dashboard data."""
        response = client.get(
            "/api/v1/dashboard/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "equipment_utilization" in data
        assert "personnel_efficiency" in data
    
    def test_get_dashboard_with_lab_filter(self, client, admin_token, sample_laboratory):
        """Test full dashboard filtered by laboratory."""
        response = client.get(
            f"/api/v1/dashboard/?lab_id={sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data


class TestDashboardAccessControl:
    """Tests for dashboard access control."""
    
    def test_dashboard_access_as_engineer(self, client, engineer_token):
        """Test that engineers can access dashboard."""
        response = client.get(
            "/api/v1/dashboard/summary",
            headers=auth_header(engineer_token)
        )
        assert response.status_code == 200
    
    def test_dashboard_without_auth(self, client):
        """Test dashboard access without authentication."""
        endpoints = [
            "/api/v1/dashboard/summary",
            "/api/v1/dashboard/equipment-utilization",
            "/api/v1/dashboard/personnel-efficiency",
            "/api/v1/dashboard/task-completion",
            "/api/v1/dashboard/sla-performance",
            "/api/v1/dashboard/workload-analysis",
            "/api/v1/dashboard/"
        ]
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401, f"Endpoint {endpoint} should require authentication"
