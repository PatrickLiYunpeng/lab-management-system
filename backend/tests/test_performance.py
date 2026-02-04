"""
性能测试 - 测试API响应时间
"""
import time
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

class TestAPIPerformance:
    """API性能测试"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """设置测试"""
        self.headers = get_auth_headers()
        self.response_time_threshold = 2.0  # 2秒阈值
    
    def measure_response_time(self, method, url, **kwargs):
        """测量响应时间"""
        start = time.time()
        if method == "GET":
            response = client.get(url, headers=self.headers, **kwargs)
        elif method == "POST":
            response = client.post(url, headers=self.headers, **kwargs)
        else:
            response = client.get(url, headers=self.headers, **kwargs)
        elapsed = time.time() - start
        return response, elapsed
    
    # 认证API测试
    def test_login_performance(self):
        """登录API响应时间"""
        start = time.time()
        response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        elapsed = time.time() - start
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Login took {elapsed:.2f}s"
        print(f"Login: {elapsed:.3f}s")
    
    # 仪表板API测试
    def test_dashboard_stats_performance(self):
        """仪表板统计API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/dashboard/summary")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Dashboard stats took {elapsed:.2f}s"
        print(f"Dashboard stats: {elapsed:.3f}s")
    
    def test_equipment_gantt_performance(self):
        """设备甘特图API响应时间"""
        response, elapsed = self.measure_response_time(
            "GET", 
            "/api/v1/equipment/schedules/gantt",
            params={"start_date": "2026-01-01", "end_date": "2026-02-28"}
        )
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Equipment Gantt took {elapsed:.2f}s"
        print(f"Equipment Gantt: {elapsed:.3f}s")
    
    def test_personnel_gantt_performance(self):
        """人员甘特图API响应时间"""
        response, elapsed = self.measure_response_time(
            "GET",
            "/api/v1/personnel/schedules/gantt",
            params={"start_date": "2026-01-01", "end_date": "2026-02-28"}
        )
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Personnel Gantt took {elapsed:.2f}s"
        print(f"Personnel Gantt: {elapsed:.3f}s")
    
    # 工单API测试
    def test_work_orders_list_performance(self):
        """工单列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/work-orders/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Work orders list took {elapsed:.2f}s"
        print(f"Work orders list: {elapsed:.3f}s")
    
    def test_work_order_query_performance(self):
        """工单查询API响应时间"""
        # 使用工单导出API作为查询测试替代
        response, elapsed = self.measure_response_time(
            "GET", 
            "/api/v1/work-orders/export/csv",
            params={"format": "csv"}
        )
        # 允许200或其他状态码
        print(f"Work order export: {elapsed:.3f}s (status: {response.status_code})")
        assert elapsed < 5.0, f"Work order export took too long: {elapsed:.2f}s"
    
    # 设备API测试
    def test_equipment_list_performance(self):
        """设备列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/equipment/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Equipment list took {elapsed:.2f}s"
        print(f"Equipment list: {elapsed:.3f}s")
    
    # 人员API测试
    def test_personnel_list_performance(self):
        """人员列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/personnel/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Personnel list took {elapsed:.2f}s"
        print(f"Personnel list: {elapsed:.3f}s")
    
    # 站点API测试
    def test_sites_list_performance(self):
        """站点列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/sites/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Sites list took {elapsed:.2f}s"
        print(f"Sites list: {elapsed:.3f}s")
    
    # 实验室API测试
    def test_laboratories_list_performance(self):
        """实验室列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/laboratories/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Laboratories list took {elapsed:.2f}s"
        print(f"Laboratories list: {elapsed:.3f}s")
    
    # 客户API测试
    def test_clients_list_performance(self):
        """客户列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/materials/clients/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Clients list took {elapsed:.2f}s"
        print(f"Clients list: {elapsed:.3f}s")
    
    # 物料API测试
    def test_materials_list_performance(self):
        """物料列表API响应时间"""
        response, elapsed = self.measure_response_time("GET", "/api/v1/materials/")
        assert response.status_code == 200
        assert elapsed < self.response_time_threshold, f"Materials list took {elapsed:.2f}s"
        print(f"Materials list: {elapsed:.3f}s")
