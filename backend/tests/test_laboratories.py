"""
Unit tests for laboratories endpoints.
Tests: /api/v1/laboratories/*
"""

import pytest
from tests.conftest import auth_header


class TestLaboratoriesList:
    """Tests for listing laboratories."""
    
    def test_list_laboratories_empty(self, client, admin_token):
        """Test listing laboratories when none exist."""
        response = client.get(
            "/api/v1/laboratories/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_laboratories_with_data(self, client, admin_token, sample_laboratory):
        """Test listing laboratories with existing data."""
        response = client.get(
            "/api/v1/laboratories/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Test Lab"
    
    def test_list_laboratories_by_site(self, client, admin_token, sample_laboratory, sample_site):
        """Test filtering laboratories by site."""
        response = client.get(
            f"/api/v1/laboratories/?site_id={sample_site.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/laboratories/?site_id=99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
    
    def test_list_laboratories_by_type(self, client, admin_token, sample_laboratory):
        """Test filtering laboratories by type."""
        response = client.get(
            "/api/v1/laboratories/?lab_type=fa",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/laboratories/?lab_type=reliability",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestLaboratoriesCreate:
    """Tests for creating laboratories."""
    
    def test_create_laboratory_success(self, client, admin_token, sample_site):
        """Test successful laboratory creation."""
        response = client.post(
            "/api/v1/laboratories/",
            json={
                "name": "New Lab",
                "code": "NL01",
                "lab_type": "reliability",
                "site_id": sample_site.id,
                "description": "A new test laboratory"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Lab"
        assert data["code"] == "NL01"
        assert data["lab_type"] == "reliability"
    
    def test_create_laboratory_invalid_site(self, client, admin_token):
        """Test creating laboratory with invalid site ID."""
        response = client.post(
            "/api/v1/laboratories/",
            json={
                "name": "New Lab",
                "code": "NL01",
                "lab_type": "fa",
                "site_id": 99999,
                "description": "A new test laboratory"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400  # API returns 400 for invalid site
    
    def test_create_laboratory_duplicate_code(self, client, admin_token, sample_laboratory, sample_site):
        """Test creating laboratory with duplicate code."""
        response = client.post(
            "/api/v1/laboratories/",
            json={
                "name": "Another Lab",
                "code": "TL01",  # Same as sample_laboratory
                "lab_type": "fa",
                "site_id": sample_site.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400


class TestLaboratoriesGet:
    """Tests for getting a single laboratory."""
    
    def test_get_laboratory_success(self, client, admin_token, sample_laboratory):
        """Test getting a laboratory by ID."""
        response = client.get(
            f"/api/v1/laboratories/{sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_laboratory.id
        assert data["name"] == "Test Lab"
        assert "site" in data
    
    def test_get_laboratory_not_found(self, client, admin_token):
        """Test getting a non-existent laboratory."""
        response = client.get(
            "/api/v1/laboratories/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestLaboratoriesUpdate:
    """Tests for updating laboratories."""
    
    def test_update_laboratory_success(self, client, admin_token, sample_laboratory):
        """Test successful laboratory update."""
        response = client.put(
            f"/api/v1/laboratories/{sample_laboratory.id}",
            json={"name": "Updated Lab Name", "description": "Updated description"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Lab Name"
        assert data["description"] == "Updated description"
    
    def test_update_laboratory_not_found(self, client, admin_token):
        """Test updating a non-existent laboratory."""
        response = client.put(
            "/api/v1/laboratories/99999",
            json={"name": "Updated Name"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestLaboratoriesDelete:
    """Tests for deleting laboratories."""
    
    def test_delete_laboratory_success(self, client, admin_token, sample_laboratory):
        """Test successful laboratory deletion."""
        response = client.delete(
            f"/api/v1/laboratories/{sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/laboratories/{sample_laboratory.id}",
            headers=auth_header(admin_token)
        )
        assert get_response.status_code == 404
    
    def test_delete_laboratory_not_found(self, client, admin_token):
        """Test deleting a non-existent laboratory."""
        response = client.delete(
            "/api/v1/laboratories/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404
