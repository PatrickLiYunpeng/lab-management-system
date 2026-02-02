# 系统架构设计文档
# System Architecture Design Document

## 1. 系统概述 System Overview

实验室管理系统（Laboratory Management System, LMS）是一个综合性的实验室运营管理平台，用于管理失效分析（FA）和可靠性测试实验室的日常运营。

The Laboratory Management System (LMS) is a comprehensive laboratory operations management platform for managing daily operations of Failure Analysis (FA) and Reliability Testing laboratories.

## 2. 技术栈 Technology Stack

### 2.1 前端 Frontend
- **框架**: React 19 + TypeScript
- **UI组件库**: Ant Design 6.x
- **图表库**: Recharts
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **日期处理**: Day.js
- **构建工具**: Vite

### 2.2 后端 Backend
- **框架**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.x
- **数据库迁移**: Alembic
- **认证**: JWT (JSON Web Tokens)
- **数据库**: SQLite (开发) / PostgreSQL (生产)

### 2.3 部署 Deployment
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **云平台**: Alibaba Cloud ECS

## 3. 系统架构图 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           客户端 Client                              │
│                    (浏览器 Browser / 移动端 Mobile)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Nginx 反向代理                               │
│                    (负载均衡 + SSL终端 + 静态资源)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│       前端应用 Frontend      │   │       后端API Backend       │
│     React + TypeScript      │   │         FastAPI             │
│     (Vite Dev Server)       │   │   (Uvicorn ASGI Server)     │
│                             │   │                             │
│  ┌───────────────────────┐  │   │  ┌───────────────────────┐  │
│  │     仪表板模块         │  │   │  │     API路由层          │  │
│  │  - 综合仪表板          │  │   │  │  /api/v1/...          │  │
│  │  - 设备仪表板          │  │   │  └───────────────────────┘  │
│  │  - 人员仪表板          │  │   │              │              │
│  └───────────────────────┘  │   │              ▼              │
│  ┌───────────────────────┐  │   │  ┌───────────────────────┐  │
│  │     业务模块           │  │   │  │     业务逻辑层         │  │
│  │  - 站点管理            │  │   │  │  Services / CRUD      │  │
│  │  - 实验室管理          │  │   │  └───────────────────────┘  │
│  │  - 人员管理            │  │   │              │              │
│  │  - 设备管理            │  │   │              ▼              │
│  │  - 工单管理            │  │   │  ┌───────────────────────┐  │
│  │  - 物料管理            │  │   │  │     数据访问层         │  │
│  └───────────────────────┘  │   │  │  SQLAlchemy ORM       │  │
│                             │   │  └───────────────────────┘  │
└─────────────────────────────┘   └─────────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────┐
                              │         数据库 Database      │
                              │   SQLite / PostgreSQL       │
                              └─────────────────────────────┘
```

## 4. 功能模块 Functional Modules

### 4.1 仪表板模块 Dashboard Module

#### 4.1.1 综合仪表板 General Dashboard
- **路径**: `/dashboard`
- **功能**: 展示系统整体运营数据概览
- **数据展示**:
  - 工单统计（待处理、进行中、已完成）
  - 设备利用率
  - 人员效率
  - SLA达成率
  - 任务完成趋势

#### 4.1.2 设备仪表板 Equipment Dashboard
- **路径**: `/equipment-dashboard`
- **功能**: 设备运营状态监控和调度可视化
- **核心特性**:
  - **统计卡片**: 设备总数、可用设备、使用中、维护中
  - **分布图表**: 按类别分布饼图、按状态分布饼图
  - **利用率图表**: 各类别设备利用率柱状图
  - **甘特图调度**: 设备调度甘特图，按设备类别（8类）分标签页展示
    - 热学设备 (Thermal)
    - 机械设备 (Mechanical)
    - 电学设备 (Electrical)
    - 光学设备 (Optical)
    - 分析设备 (Analytical)
    - 环境设备 (Environmental)
    - 测量设备 (Measurement)
    - 其他设备 (Other)
  - **日期范围选择**: 支持自定义日期范围（最大7天）
  - **双语支持**: 中文/英文切换

#### 4.1.3 人员仪表板 Personnel Dashboard
- **路径**: `/personnel-dashboard`
- **功能**: 人员调度状态监控和任务分配可视化
- **核心特性**:
  - **统计卡片**: 人员总数、可用人员、忙碌人员、休假人员
  - **分布图表**: 按角色分布饼图、按状态分布饼图
  - **效率图表**: 人员效率排名柱状图
  - **甘特图调度**: 人员调度甘特图，按角色分标签页展示
    - 工程师 (Engineer)
    - 技术员 (Technician)
    - 经理 (Manager)
    - 管理员 (Admin)
  - **任务详情**: 悬停显示任务名称、工单号、设备信息
  - **日期范围选择**: 支持自定义日期范围（最大7天）
  - **双语支持**: 中文/英文切换

### 4.2 基础数据模块 Master Data Module

| 模块 | 路径 | 功能描述 |
|------|------|----------|
| 站点管理 | `/sites` | 管理多地点站点信息 |
| 实验室管理 | `/laboratories` | 管理FA和可靠性实验室 |
| 人员管理 | `/personnel` | 管理人员信息、技能、借调 |
| 设备管理 | `/equipment` | 管理设备信息、调度、维护 |
| 技能管理 | `/skills`, `/skills-config` | 技能矩阵和技能配置 |
| 客户管理 | `/clients` | 客户信息和SLA配置 |

### 4.3 业务流程模块 Business Process Module

| 模块 | 路径 | 功能描述 |
|------|------|----------|
| 工单管理 | `/work-orders` | 创建、分配、执行、完成工单 |
| 工单查询 | `/work-order-query` | 工单状态查询（Viewer角色可用） |
| 物料管理 | `/materials` | 样品和耗材管理 |
| 任务交接 | `/handovers` | 班次交接和任务移交 |
| 分析方法 | `/methods` | FA和可靠性测试方法定义 |

### 4.4 系统管理模块 System Administration Module

| 模块 | 路径 | 功能描述 |
|------|------|----------|
| 用户管理 | `/user-management` | 用户账户和权限管理（仅Admin） |
| 审计日志 | `/audit-logs` | 系统操作审计记录 |
| 系统设置 | `/settings` | 系统配置和个人设置 |

## 5. 数据流 Data Flow

### 5.1 设备仪表板数据流
```
用户请求 → 前端组件(EquipmentDashboard.tsx) 
         → dashboardService.getGanttData()
         → API: GET /api/v1/equipment/schedules/gantt
         → 后端Controller → SQLAlchemy Query
         → 返回JSON数据
         → 前端渲染甘特图
```

### 5.2 人员仪表板数据流
```
用户请求 → 前端组件(PersonnelDashboard.tsx)
         → dashboardService.getPersonnelGanttData()
         → API: GET /api/v1/personnel/schedules/gantt
         → 后端Controller → SQLAlchemy Query
         → 返回JSON数据
         → 前端渲染甘特图
```

## 6. 安全架构 Security Architecture

### 6.1 认证 Authentication
- JWT Token认证
- 登录后颁发access_token
- Token有效期可配置

### 6.2 授权 Authorization
- 基于角色的访问控制（RBAC）
- 5种角色: Admin, Manager, Engineer, Technician, Viewer
- 细粒度权限控制

### 6.3 数据安全 Data Security
- 密码哈希存储（bcrypt）
- API请求验证
- 审计日志记录

## 7. 部署架构 Deployment Architecture

### 7.1 开发环境 Development
```
本地机器
├── Frontend: npm run dev (localhost:5173)
├── Backend: uvicorn --reload (localhost:8000)
└── Database: SQLite (lab_management.db)
```

### 7.2 生产环境 Production
```
Alibaba Cloud ECS
├── Nginx (Port 80/443)
│   ├── 静态资源服务
│   └── API反向代理
├── Docker Containers
│   ├── Frontend Container
│   └── Backend Container
└── PostgreSQL Database
```
