"""
Unit tests for authentication endpoints.
Tests: /api/v1/auth/*
"""

import pytest
from tests.conftest import auth_header


class TestAuthLogin:
    """Tests for login functionality."""
    
    def test_login_success(self, client, admin_user):
        """Test successful login with valid credentials."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin_test", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "admin_test"
    
    def test_login_wrong_password(self, client, admin_user):
        """Test login with incorrect password."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin_test", "password": "wrongpassword"}
        )
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent username."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "nonexistent", "password": "password123"}
        )
        assert response.status_code == 401
    
    def test_login_empty_credentials(self, client):
        """Test login with empty credentials."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "", "password": ""}
        )
        assert response.status_code == 401


class TestAuthToken:
    """Tests for OAuth2 token endpoint."""
    
    def test_token_success(self, client, admin_user):
        """Test successful token generation via form data."""
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "admin_test", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_token_invalid_credentials(self, client, admin_user):
        """Test token generation with invalid credentials."""
        response = client.post(
            "/api/v1/auth/token",
            data={"username": "admin_test", "password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestAuthRegister:
    """Tests for user registration."""
    
    def test_register_success(self, client):
        """Test successful user registration (open endpoint)."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@test.com",
                "password": "newpassword123",
                "full_name": "New User",
                "role": "engineer"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@test.com"
    
    def test_register_duplicate_username(self, client, admin_user):
        """Test registration with duplicate username."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "admin_test",
                "email": "another@test.com",
                "password": "password123",
                "full_name": "Another User",
                "role": "engineer"
            }
        )
        assert response.status_code == 400
    
    def test_register_without_role(self, client):
        """Test registration without specifying role defaults to viewer."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "noroleuser",
                "email": "norole@test.com",
                "password": "password123",
                "full_name": "No Role User"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "viewer"


class TestAuthMe:
    """Tests for current user info endpoint."""
    
    def test_get_me_success(self, client, admin_token, admin_user):
        """Test getting current user info."""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin_test"
        assert data["role"] == "admin"
    
    def test_get_me_without_auth(self, client):
        """Test getting current user without authentication."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
    
    def test_get_me_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401


class TestAuthUpdateMe:
    """Tests for updating current user."""
    
    def test_update_me_success(self, client, admin_token):
        """Test updating current user profile."""
        response = client.put(
            "/api/v1/auth/me",
            json={"full_name": "Updated Admin Name"},
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Admin Name"


class TestAuthChangePassword:
    """Tests for password change functionality."""
    
    def test_change_password_success(self, client, admin_token):
        """Test successful password change."""
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "admin123",
                "new_password": "newadmin456"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 200
        
        # Verify new password works
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin_test", "password": "newadmin456"}
        )
        assert login_response.status_code == 200
    
    def test_change_password_wrong_current(self, client, admin_token):
        """Test password change with wrong current password."""
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456"
            },
            headers=auth_header(admin_token)
        )
        assert response.status_code == 400
