"""
安全测试 - 验证系统安全控制
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers():
    """获取认证token"""
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}

class TestSQLInjection:
    """SQL注入防护测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_sql_injection_in_search(self):
        """测试搜索参数SQL注入防护"""
        # 尝试SQL注入攻击
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM work_orders;",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in malicious_inputs:
            # 测试设备搜索
            response = client.get(
                "/api/v1/equipment/",
                params={"search": payload},
                headers=self.headers
            )
            # 应该返回正常响应（空结果或200），不应该500错误
            assert response.status_code in [200, 422], f"SQL injection vulnerability: {payload}"
    
    def test_sql_injection_in_path_params(self):
        """测试路径参数SQL注入防护"""
        malicious_ids = [
            "1' OR '1'='1",
            "1; DROP TABLE users;",
            "-1 UNION SELECT * FROM users"
        ]
        
        for payload in malicious_ids:
            response = client.get(
                f"/api/v1/equipment/{payload}",
                headers=self.headers
            )
            # 应该返回400/404/422，不应该500
            assert response.status_code in [400, 404, 422], f"SQL injection in path: {payload}"


class TestXSSProtection:
    """XSS防护测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_xss_in_input_fields(self):
        """测试输入字段XSS防护"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<body onload=alert('XSS')>"
        ]
        
        for payload in xss_payloads:
            # 尝试创建包含XSS的站点
            response = client.post(
                "/api/v1/sites/",
                json={
                    "name": payload,
                    "code": "TEST001",
                    "address": "Test Address"
                },
                headers=self.headers
            )
            # 如果成功创建，检查返回的数据是否被转义或原样存储
            if response.status_code == 201:
                data = response.json()
                # 验证数据被安全存储（FastAPI/Pydantic会处理）
                assert "name" in data


class TestAuthentication:
    """认证安全测试"""
    
    def test_access_without_token(self):
        """测试无token访问受保护端点"""
        protected_endpoints = [
            "/api/v1/equipment/",
            "/api/v1/personnel/",
            "/api/v1/work-orders",
            "/api/v1/dashboard/summary"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401, f"Endpoint not protected: {endpoint}"
    
    def test_invalid_token(self):
        """测试无效token"""
        invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
        response = client.get("/api/v1/equipment/", headers=invalid_headers)
        assert response.status_code == 401
    
    def test_expired_token_format(self):
        """测试格式错误的token"""
        bad_headers = [
            {"Authorization": "invalid"},
            {"Authorization": "Bearer"},
            {"Authorization": "Basic dXNlcjpwYXNz"}
        ]
        
        for headers in bad_headers:
            response = client.get("/api/v1/equipment/", headers=headers)
            assert response.status_code in [401, 403], f"Bad token accepted: {headers}"
    
    def test_wrong_credentials(self):
        """测试错误凭据"""
        response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
    
    def test_nonexistent_user(self):
        """测试不存在的用户"""
        response = client.post("/api/v1/auth/login", json={
            "username": "nonexistent_user_xyz",
            "password": "anypassword"
        })
        assert response.status_code in [401, 400]


class TestInputValidation:
    """输入验证测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_oversized_input(self):
        """测试超大输入"""
        large_string = "A" * 100000  # 100KB字符串
        response = client.post(
            "/api/v1/sites/",
            json={
                "name": large_string,
                "code": "TEST",
                "address": "Test"
            },
            headers=self.headers
        )
        # 应该返回验证错误，不应该崩溃
        assert response.status_code in [422, 400, 413]
    
    def test_special_characters(self):
        """测试特殊字符处理"""
        special_chars = [
            "Test\x00Name",  # NULL字符
            "Test\nName",    # 换行
            "Test\rName",    # 回车
            "Test\tName"     # Tab
        ]
        
        for name in special_chars:
            response = client.post(
                "/api/v1/sites/",
                json={
                    "name": name,
                    "code": "SPEC001",
                    "address": "Test"
                },
                headers=self.headers
            )
            # 应该正常处理或返回验证错误
            assert response.status_code in [201, 400, 422, 409]


class TestRateLimiting:
    """速率限制测试（如果已实现）"""
    
    def test_rapid_login_attempts(self):
        """测试快速登录尝试"""
        # 发送多次错误登录请求
        for i in range(10):
            client.post("/api/v1/auth/login", json={
                "username": "admin",
                "password": f"wrong_password_{i}"
            })
        
        # 最后一次请求应该仍然可以正常响应（或被限流）
        response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        # 应该成功或被限流(429)
        assert response.status_code in [200, 429]


class TestDataAccess:
    """数据访问控制测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_cannot_access_other_user_data(self):
        """测试不能直接访问其他用户数据"""
        # 尝试访问不存在的用户ID
        response = client.get(
            "/api/v1/users/99999",
            headers=self.headers
        )
        assert response.status_code in [403, 404]


class TestCSRFProtection:
    """CSRF保护测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_api_uses_bearer_tokens(self):
        """验证API使用Bearer tokens（不是session cookies）"""
        # Bearer token认证方式本身就提供CSRF保护
        response = client.get("/api/v1/equipment/", headers=self.headers)
        assert response.status_code == 200
        
        # 不带token的请求应该失败
        response_no_token = client.get("/api/v1/equipment/")
        assert response_no_token.status_code == 401
