# 权限矩阵文档

> 更新日期: 2026-02-05

本文档定义了实验室管理系统的权限控制架构，包括模块定义、角色权限矩阵以及访问控制规则。

## 目录

- [系统模块定义](#系统模块定义)
- [角色定义](#角色定义)
- [模块权限矩阵](#模块权限矩阵)
- [各角色菜单配置](#各角色菜单配置)
- [权限系统架构](#权限系统架构)

---

## 系统模块定义

系统共包含 **13个功能模块**，分为4个分类：

### 核心业务 (Core)

| 模块代码 | 模块名称 | 路由 | 描述 |
|---------|---------|------|------|
| `work_orders` | 工单管理 | `/work-orders` | 创建、管理和跟踪工单 |
| `materials` | 物料管理 | `/materials` | 管理物料库存和分配 |
| `handovers` | 任务交接 | `/handovers` | 管理任务交接流程 |

### 资源管理 (Resource)

| 模块代码 | 模块名称 | 路由 | 描述 |
|---------|---------|------|------|
| `locations` | 地址管理 | `/locations` | 管理站点和实验室信息 |
| `personnel` | 人员管理 | `/personnel` | 管理人员信息、技能和排班 |
| `equipment` | 设备管理 | `/equipment` | 管理设备信息、类型和调度 |
| `methods` | 分析/测试方法 | `/methods` | 管理分析和测试方法 |
| `clients` | 客户与SLA | `/clients` | 管理客户信息和服务级别协议 |
| `products` | 产品管理 | `/products` | 管理产品信息 |

### 分析报表 (Analytics)

| 模块代码 | 模块名称 | 路由 | 描述 |
|---------|---------|------|------|
| `dashboard` | 仪表板 | `/dashboard` | 查看数据分析和统计图表 |

### 系统管理 (Admin)

| 模块代码 | 模块名称 | 路由 | 描述 |
|---------|---------|------|------|
| `audit_logs` | 审计日志 | `/audit-logs` | 查看系统操作日志 |
| `user_management` | 用户管理 | `/user-management` | 管理系统用户账号 |
| `settings` | 系统设置 | `/settings` | 系统配置和权限管理 |

---

## 角色定义

系统定义了 **5个用户角色**，按权限从高到低排列：

| 角色 | 英文标识 | 职责描述 |
|------|---------|---------|
| **系统管理员** | `admin` | 拥有系统所有功能的完全访问权限，包括用户管理、权限配置、系统设置和审计日志 |
| **经理** | `manager` | 负责日常业务管理，可访问所有业务模块和用户管理，但不能修改系统配置 |
| **工程师** | `engineer` | 执行技术任务，访问工单、设备、方法等技术相关模块 |
| **技术员** | `technician` | 执行基础操作任务，仅访问工单、物料、交接等日常操作模块 |
| **查看者** | `viewer` | 只读角色，目前无任何模块访问权限（可按需开放仪表板） |

---

## 模块权限矩阵

以下矩阵定义了各角色对各模块的访问权限：

| 模块 | Admin | Manager | Engineer | Technician | Viewer |
|------|:-----:|:-------:|:--------:|:----------:|:------:|
| **核心业务** |||||
| 工单管理 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 物料管理 | ✓ | ✓ | ✓ | ✓ | ✗ |
| 任务交接 | ✓ | ✓ | ✓ | ✓ | ✗ |
| **资源管理** |||||
| 地址管理 | ✓ | ✓ | ✗ | ✗ | ✗ |
| 人员管理 | ✓ | ✓ | ✓ | ✗ | ✗ |
| 设备管理 | ✓ | ✓ | ✓ | ✗ | ✗ |
| 分析/测试方法 | ✓ | ✓ | ✓ | ✗ | ✗ |
| 客户与SLA | ✓ | ✓ | ✗ | ✗ | ✗ |
| 产品管理 | ✓ | ✓ | ✗ | ✗ | ✗ |
| **分析报表** |||||
| 仪表板 | ✓ | ✓ | ✓ | ✓ | ✗ |
| **系统管理** |||||
| 审计日志 | ✓ | ✗ | ✗ | ✗ | ✗ |
| 用户管理 | ✓ | ✓ | ✗ | ✗ | ✗ |
| 系统设置 | ✓ | ✗ | ✗ | ✗ | ✗ |

**权限统计：**
- Admin: 13/13 模块 (100%)
- Manager: 11/13 模块 (85%)
- Engineer: 7/13 模块 (54%)
- Technician: 4/13 模块 (31%)
- Viewer: 1/13 模块 (8%)

---

## 各角色菜单配置

### Admin (系统管理员)

导航菜单显示所有模块：

```
├── 仪表板 (/dashboard)
├── 工单管理 (/work-orders)
├── 物料管理 (/materials)
├── 任务交接 (/handovers)
├── 地址管理 (/locations)
├── 人员管理 (/personnel)
├── 设备管理 (/equipment)
├── 分析/测试方法 (/methods)
├── 客户与SLA (/clients)
├── 产品管理 (/products)
├── 审计日志 (/audit-logs)
├── 用户管理 (/user-management)
└── 系统设置 (/settings)
    ├── 操作权限管理 (Tab)
    └── 模块权限管理 (Tab)
```

### Manager (经理)

导航菜单显示业务模块和用户管理：

```
├── 仪表板 (/dashboard)
├── 工单管理 (/work-orders)
├── 物料管理 (/materials)
├── 任务交接 (/handovers)
├── 地址管理 (/locations)
├── 人员管理 (/personnel)
├── 设备管理 (/equipment)
├── 分析/测试方法 (/methods)
├── 客户与SLA (/clients)
├── 产品管理 (/products)
└── 用户管理 (/user-management)
```

### Engineer (工程师)

导航菜单显示技术操作模块：

```
├── 仪表板 (/dashboard)
├── 工单管理 (/work-orders)
├── 物料管理 (/materials)
├── 任务交接 (/handovers)
├── 人员管理 (/personnel)
├── 设备管理 (/equipment)
└── 分析/测试方法 (/methods)
```

### Technician (技术员)

导航菜单显示日常操作模块：

```
├── 仪表板 (/dashboard)
├── 工单管理 (/work-orders)
├── 物料管理 (/materials)
└── 任务交接 (/handovers)
```

### Viewer (查看者)

导航菜单显示工单查询模块：

```
├── 工单管理 (/work-orders)
└── 工单查询 (/work-order-query)
```

---

## 权限系统架构

### 双层权限控制

系统采用**双层权限控制**架构：

1. **模块权限层 (Module Permissions)**
   - 控制用户能否访问某个功能模块/页面
   - 基于角色的模块访问矩阵
   - 管理员可通过"系统设置 > 模块权限管理"动态调整

2. **操作权限层 (Operation Permissions)**
   - 控制用户在模块内的具体操作权限（查看/创建/编辑/删除等）
   - 基于角色的细粒度操作控制
   - 管理员可通过"系统设置 > 操作权限管理"动态调整

### 权限检查流程

```
用户访问页面
    │
    ▼
[认证检查] ──未登录──→ 跳转登录页
    │
    ▼
[角色权限检查] ──无权──→ 403 页面
    │
    ▼
[模块权限检查] ──无权──→ 403 (模块未授权)
    │
    ▼
[操作权限检查] ──无权──→ 隐藏/禁用相关按钮
    │
    ▼
正常访问
```

### 技术实现

#### 后端

- **模型**: `ModulePermission` (backend/app/models/module_permission.py)
- **API端点**:
  - `GET /api/v1/permissions/modules` - 获取模块定义
  - `GET /api/v1/permissions/module-matrix` - 获取权限矩阵
  - `PUT /api/v1/permissions/module/{role}/{module_code}` - 更新单个权限
  - `POST /api/v1/permissions/module-bulk-update` - 批量更新
  - `POST /api/v1/permissions/module-reset-defaults` - 重置默认值
  - `GET /api/v1/permissions/my-modules` - 获取当前用户模块权限

#### 前端

- **服务**: `modulePermissionService.ts` (frontend/src/services/)
- **组件**: `ModulePermissionMatrix.tsx` (frontend/src/components/settings/)
- **工具函数**: `permissions.ts` (frontend/src/utils/)
- **状态管理**: `authStore.ts` (frontend/src/stores/)
- **路由保护**: `ProtectedRoute.tsx` (frontend/src/components/)
- **菜单过滤**: `MainLayout.tsx` (frontend/src/layouts/)

---

## 配置管理

### 默认权限配置

默认权限配置定义在 `backend/app/models/module_permission.py` 的 `DEFAULT_MODULE_PERMISSIONS` 字典中。

### 修改权限

1. **运行时修改**: 管理员通过"系统设置 > 模块权限管理"界面修改
2. **重置默认**: 点击"重置为默认配置"按钮恢复默认值
3. **代码修改**: 更新 `DEFAULT_MODULE_PERMISSIONS` 并执行重置

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0 | 2026-02-05 | 初始版本，建立双层权限系统 |
