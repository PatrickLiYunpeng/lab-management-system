"""
Prometheus监控指标模块

本模块定义了应用程序的Prometheus监控指标，用于收集和暴露运行时性能数据。

指标类型:
- Counter: 计数器，只增不减（如请求总数）
- Gauge: 仪表盘，可增可减（如当前连接数）
- Histogram: 直方图，用于分布数据（如请求延迟）
- Summary: 摘要，类似直方图但带分位数

使用方式:
1. 在请求处理中记录指标：
   from app.core.metrics import REQUEST_COUNT
   REQUEST_COUNT.labels(method="GET", endpoint="/api/users").inc()

2. 在/metrics端点暴露指标，由Prometheus服务器抓取
"""
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST

# 应用信息指标
APP_INFO = Info('lab_system', 'Laboratory Management System application information')

# HTTP请求计数器
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status_code']
)

# HTTP请求延迟直方图
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# 活跃数据库连接数
DB_CONNECTIONS_ACTIVE = Gauge(
    'db_connections_active',
    'Number of active database connections'
)

# 工单统计指标
WORK_ORDERS_TOTAL = Gauge(
    'work_orders_total',
    'Total number of work orders',
    ['status']
)

# 任务统计指标
TASKS_TOTAL = Gauge(
    'tasks_total',
    'Total number of tasks',
    ['status']
)

# 登录尝试计数器
LOGIN_ATTEMPTS = Counter(
    'login_attempts_total',
    'Total number of login attempts',
    ['result']  # success, failure
)

# 材料消耗计数器
MATERIAL_CONSUMPTIONS = Counter(
    'material_consumptions_total',
    'Total number of material consumptions',
    ['status']  # registered, voided
)

# 设备调度数量
EQUIPMENT_SCHEDULES = Gauge(
    'equipment_schedules_total',
    'Total number of equipment schedules',
    ['status']
)


def get_metrics():
    """
    生成Prometheus格式的指标数据
    
    Returns:
        bytes: Prometheus格式的指标文本
    """
    return generate_latest()


def get_metrics_content_type():
    """
    获取Prometheus指标的Content-Type
    
    Returns:
        str: Content-Type字符串
    """
    return CONTENT_TYPE_LATEST


def init_app_info(version: str, environment: str):
    """
    初始化应用信息指标
    
    Args:
        version: 应用版本号
        environment: 运行环境（development, staging, production）
    """
    APP_INFO.info({
        'version': version,
        'environment': environment
    })
