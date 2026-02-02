"""
Unit tests for skills endpoints.
Tests: /api/v1/skills/*
"""

import pytest
from tests.conftest import auth_header


class TestSkillsList:
    """Tests for listing skills."""
    
    def test_list_skills_empty(self, client, admin_token):
        """Test listing skills when none exist."""
        response = client.get(
            "/api/v1/skills/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
    
    def test_list_skills_with_data(self, client, admin_token, sample_skill):
        """Test listing skills with existing data."""
        response = client.get(
            "/api/v1/skills/",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Test Skill"
    
    def test_list_skills_by_category(self, client, admin_token, sample_skill):
        """Test filtering skills by category."""
        response = client.get(
            "/api/v1/skills/?category=equipment_operation",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        response = client.get(
            "/api/v1/skills/?category=testing_method",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestSkillsCreate:
    """Tests for creating skills."""
    
    def test_create_skill_success(self, client, admin_token):
        """Test successful skill creation."""
        response = client.post(
            "/api/v1/skills/",
            json={
                "name": "New Skill",
                "code": "SK002",
                "category": "testing_method",
                "description": "A new test skill"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Skill"
        assert data["code"] == "SK002"
        assert data["category"] == "testing_method"
    
    def test_create_skill_duplicate_code(self, client, admin_token, sample_skill):
        """Test creating skill with duplicate code."""
        response = client.post(
            "/api/v1/skills/",
            json={
                "name": "Another Skill",
                "code": "SK001",  # Same as sample_skill
                "category": "equipment_operation"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400


class TestSkillsGet:
    """Tests for getting a single skill."""
    
    def test_get_skill_success(self, client, admin_token, sample_skill):
        """Test getting a skill by ID."""
        response = client.get(
            f"/api/v1/skills/{sample_skill.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_skill.id
        assert data["name"] == "Test Skill"
    
    def test_get_skill_not_found(self, client, admin_token):
        """Test getting a non-existent skill."""
        response = client.get(
            "/api/v1/skills/99999",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 404


class TestSkillsUpdate:
    """Tests for updating skills."""
    
    def test_update_skill_success(self, client, admin_token, sample_skill):
        """Test successful skill update."""
        response = client.put(
            f"/api/v1/skills/{sample_skill.id}",
            json={"name": "Updated Skill Name", "description": "Updated description"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Skill Name"


class TestSkillsDelete:
    """Tests for deleting skills."""
    
    def test_delete_skill_success(self, client, admin_token, sample_skill):
        """Test successful skill deletion."""
        response = client.delete(
            f"/api/v1/skills/{sample_skill.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 204


class TestPersonnelSkills:
    """Tests for personnel skill associations."""
    
    def test_assign_skill_to_personnel(self, client, admin_token, sample_personnel, sample_skill):
        """Test assigning a skill to personnel."""
        response = client.post(
            f"/api/v1/skills/personnel/{sample_personnel.id}",
            json={
                "skill_id": sample_skill.id,
                "proficiency_level": "intermediate",
                "is_certified": True
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 201
        data = response.json()
        assert data["skill_id"] == sample_skill.id
        assert data["proficiency_level"] == "intermediate"
        assert data["is_certified"] is True
    
    def test_get_personnel_skills(self, client, admin_token, sample_personnel):
        """Test getting skills for a personnel."""
        response = client.get(
            f"/api/v1/skills/personnel/{sample_personnel.id}",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_assign_duplicate_skill(self, client, admin_token, test_db, sample_personnel, sample_skill):
        """Test assigning the same skill twice."""
        from app.models.skill import PersonnelSkill, ProficiencyLevel
        
        # First assignment via database
        ps = PersonnelSkill(
            personnel_id=sample_personnel.id,
            skill_id=sample_skill.id,
            proficiency_level=ProficiencyLevel.BEGINNER,
            is_certified=False
        )
        test_db.add(ps)
        test_db.commit()
        
        # Second assignment via API
        response = client.post(
            f"/api/v1/skills/personnel/{sample_personnel.id}",
            json={
                "skill_id": sample_skill.id,
                "proficiency_level": "advanced"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400


class TestSkillsByPersonnel:
    """Tests for querying personnel by skill."""
    
    def test_get_personnel_by_skill(self, client, admin_token, test_db, sample_personnel, sample_skill):
        """Test getting personnel with a specific skill."""
        from app.models.skill import PersonnelSkill, ProficiencyLevel
        
        # Assign skill to personnel
        ps = PersonnelSkill(
            personnel_id=sample_personnel.id,
            skill_id=sample_skill.id,
            proficiency_level=ProficiencyLevel.EXPERT,
            is_certified=True
        )
        test_db.add(ps)
        test_db.commit()
        
        response = client.get(
            f"/api/v1/skills/{sample_skill.id}/personnel",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["personnel_id"] == sample_personnel.id
