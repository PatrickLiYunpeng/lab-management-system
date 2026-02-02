"""
Unit tests for materials endpoints.
Tests: /api/v1/materials/*
"""

import pytest
from tests.conftest import auth_header


class TestMaterialsList:
    """Tests for listing materials."""
    
    def test_list_materials_empty(self, client, admin_token):
        """Test listing materials when none exist."""
        response = client.get(
            "/api/v1/materials/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_materials_with_data(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test listing materials with existing data."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Test Material",
            material_code="MAT001",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.IN_STORAGE,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id,
            description="Test material for unit tests"
        )
        test_db.add(material)
        test_db.commit()
        
        response = client.get(
            "/api/v1/materials/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Test Material"
    
    def test_list_materials_by_status(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test filtering materials by status."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Available Material",
            material_code="MAT002",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.IN_STORAGE,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        
        response = client.get(
            "/api/v1/materials/?status=in_storage",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/materials/?status=in_use",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestMaterialsCreate:
    """Tests for creating materials."""
    
    def test_create_material_success(self, client, admin_token, sample_laboratory, sample_site):
        """Test successful material creation."""
        response = client.post(
            "/api/v1/materials/",
            json={
                "name": "New Material",
                "material_code": "MAT003",
                "material_type": "sample",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id,
                "description": "A new test material"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Material"
        assert data["material_code"] == "MAT003"
        assert data["status"] == "received"  # Default status
    
    def test_create_material_duplicate_code(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test creating material with duplicate code."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Existing Material",
            material_code="MAT004",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.RECEIVED,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        
        response = client.post(
            "/api/v1/materials/",
            json={
                "name": "Another Material",
                "material_code": "MAT004",
                "material_type": "sample",
                "laboratory_id": sample_laboratory.id,
                "site_id": sample_site.id
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400


class TestMaterialsGet:
    """Tests for getting a single material."""
    
    def test_get_material_success(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test getting a material by ID."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Get Test Material",
            material_code="MAT005",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.IN_STORAGE,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        test_db.refresh(material)
        
        response = client.get(
            f"/api/v1/materials/{material.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == material.id
        assert data["name"] == "Get Test Material"
    
    def test_get_material_not_found(self, client, admin_token):
        """Test getting a non-existent material."""
        response = client.get(
            "/api/v1/materials/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestMaterialsUpdate:
    """Tests for updating materials."""
    
    def test_update_material_success(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test successful material update."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Update Test Material",
            material_code="MAT006",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.IN_STORAGE,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        test_db.refresh(material)
        
        response = client.put(
            f"/api/v1/materials/{material.id}",
            json={"name": "Updated Material Name", "description": "Updated description"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Material Name"


class TestMaterialsDispose:
    """Tests for material disposal."""
    
    def test_dispose_material_success(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test successful material disposal."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Dispose Test Material",
            material_code="MAT007",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.IN_STORAGE,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        test_db.refresh(material)
        
        response = client.post(
            f"/api/v1/materials/{material.id}/dispose",
            json={
                "disposal_method": "standard_disposal",
                "disposal_notes": "Material no longer needed"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "disposed"


class TestMaterialsReturn:
    """Tests for material return."""
    
    def test_return_material_success(self, client, admin_token, test_db, sample_laboratory, sample_site):
        """Test successful material return."""
        from app.models.material import Material, MaterialType, MaterialStatus
        
        material = Material(
            name="Return Test Material",
            material_code="MAT008",
            material_type=MaterialType.SAMPLE,
            status=MaterialStatus.PENDING_RETURN,
            laboratory_id=sample_laboratory.id,
            site_id=sample_site.id
        )
        test_db.add(material)
        test_db.commit()
        test_db.refresh(material)
        
        response = client.post(
            f"/api/v1/materials/{material.id}/return",
            json={"return_notes": "Material returned after testing"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "returned"


class TestClients:
    """Tests for client management."""
    
    def test_list_clients(self, client, admin_token):
        """Test listing clients."""
        response = client.get(
            "/api/v1/materials/clients/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_create_client(self, client, admin_token):
        """Test creating a client."""
        response = client.post(
            "/api/v1/materials/clients/",
            json={
                "name": "New Client",
                "code": "CLI002",
                "contact_name": "Client Contact",
                "contact_email": "newclient@test.com",
                "default_sla_days": 3,
                "priority_level": 2
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Client"
        assert data["default_sla_days"] == 3
    
    def test_get_client(self, client, admin_token, sample_client):
        """Test getting a client by ID."""
        response = client.get(
            f"/api/v1/materials/clients/{sample_client.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_client.id
        assert data["name"] == "Test Client"
    
    def test_update_client(self, client, admin_token, sample_client):
        """Test updating a client."""
        response = client.put(
            f"/api/v1/materials/clients/{sample_client.id}",
            json={"name": "Updated Client Name", "default_sla_days": 5},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Client Name"
        assert data["default_sla_days"] == 5
