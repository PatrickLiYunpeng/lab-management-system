"""
Unit tests for sites endpoints.
Tests: /api/v1/sites/*
"""

import pytest
from tests.conftest import auth_header


class TestSitesList:
    """Tests for listing sites."""
    
    def test_list_sites_empty(self, client, admin_token):
        """Test listing sites when none exist."""
        response = client.get(
            "/api/v1/sites/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_sites_with_data(self, client, admin_token, sample_site):
        """Test listing sites with existing data."""
        response = client.get(
            "/api/v1/sites/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Test Site"
    
    def test_list_sites_without_auth(self, client):
        """Test listing sites without authentication."""
        response = client.get("/api/v1/sites/")
        assert response.status_code == 401
    
    def test_list_sites_with_search(self, client, admin_token, sample_site):
        """Test listing sites with search filter."""
        response = client.get(
            "/api/v1/sites/?search=Test",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/sites/?search=Nonexistent",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestSitesCreate:
    """Tests for creating sites."""
    
    def test_create_site_success(self, client, admin_token):
        """Test successful site creation."""
        response = client.post(
            "/api/v1/sites/",
            json={
                "name": "New Site",
                "code": "NS01",
                "address": "456 New Street",
                "city": "New City",
                "country": "China",
                "timezone": "Asia/Shanghai"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Site"
        assert data["code"] == "NS01"
    
    def test_create_site_duplicate_code(self, client, admin_token, sample_site):
        """Test creating site with duplicate code."""
        response = client.post(
            "/api/v1/sites/",
            json={
                "name": "Another Site",
                "code": "TS01",  # Same as sample_site
                "address": "789 Other Street",
                "city": "Other City",
                "country": "China"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
    
    def test_create_site_without_admin(self, client, engineer_token):
        """Test creating site without admin privileges."""
        response = client.post(
            "/api/v1/sites/",
            json={
                "name": "New Site",
                "code": "NS01",
                "address": "456 New Street",
                "city": "New City",
                "country": "China"
            },
            headers=auth_header(engineer_token)
        )
        assert response.status_code == 403


class TestSitesGet:
    """Tests for getting a single site."""
    
    def test_get_site_success(self, client, admin_token, sample_site):
        """Test getting a site by ID."""
        response = client.get(
            f"/api/v1/sites/{sample_site.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_site.id
        assert data["name"] == "Test Site"
    
    def test_get_site_not_found(self, client, admin_token):
        """Test getting a non-existent site."""
        response = client.get(
            "/api/v1/sites/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestSitesUpdate:
    """Tests for updating sites."""
    
    def test_update_site_success(self, client, admin_token, sample_site):
        """Test successful site update."""
        response = client.put(
            f"/api/v1/sites/{sample_site.id}",
            json={"name": "Updated Site Name"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Site Name"
    
    def test_update_site_not_found(self, client, admin_token):
        """Test updating a non-existent site."""
        response = client.put(
            "/api/v1/sites/99999",
            json={"name": "Updated Name"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestSitesDelete:
    """Tests for deleting sites."""
    
    def test_delete_site_success(self, client, admin_token, sample_site):
        """Test successful site deletion."""
        response = client.delete(
            f"/api/v1/sites/{sample_site.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/sites/{sample_site.id}",
            headers=auth_header(admin_token)
        )
        assert get_response.status_code == 404
    
    def test_delete_site_not_found(self, client, admin_token):
        """Test deleting a non-existent site."""
        response = client.delete(
            "/api/v1/sites/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404
