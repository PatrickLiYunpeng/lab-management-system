# Alibaba Cloud ECS Deployment Guide

## Prerequisites
- Ubuntu 20.04/22.04 ECS instance
- Root or sudo access
- ECS Security Group allows ports 22, 80, 443

## Step 1: Transfer Project Files

From your local machine, transfer the project to your ECS:

```bash
# Replace YOUR_ECS_IP with your actual ECS public IP
rsync -avz --exclude 'node_modules' --exclude '.venv' --exclude '__pycache__' \
    --exclude '*.db' --exclude '.git' \
    /path/to/lab-management-system/ root@YOUR_ECS_IP:/opt/lab-management/
```

Or using scp:
```bash
scp -r lab-management-system root@YOUR_ECS_IP:/opt/lab-management
```

## Step 2: Server Setup

SSH into your ECS and run the setup script:

```bash
ssh root@YOUR_ECS_IP
cd /opt/lab-management
chmod +x scripts/deploy-setup.sh
./scripts/deploy-setup.sh
```

This script will:
- Install Docker and Docker Compose
- Configure UFW firewall (ports 22, 80, 443)
- Install fail2ban for security

## Step 3: Configure Environment

```bash
cd /opt/lab-management

# Copy and edit environment file
cp .env.example .env
nano .env
```

Update these values in `.env`:
```
SERVER_IP=your_ecs_public_ip
MYSQL_ROOT_PASSWORD=strong_random_password
MYSQL_PASSWORD=another_strong_password
SECRET_KEY=generate_using_python_secrets
```

Generate a secure SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Step 4: Build and Start Services

```bash
cd /opt/lab-management

# Build and start all containers
docker compose up -d --build

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

## Step 5: Run Database Migrations

```bash
# Run migrations
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

## Step 6: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Test API health endpoint
curl http://localhost/health

# Test API docs
curl http://localhost/docs
```

Access your application:
- Frontend: `http://YOUR_ECS_IP/`
- API Docs: `http://YOUR_ECS_IP/docs`
- Health Check: `http://YOUR_ECS_IP/health`

---

## 仪表板甘特图功能依赖与故障排查

### 甘特图功能概述

仪表板包含两个甘特图视图：
1. **设备调度甘特图** (`/dashboard` -> 设备仪表板 -> 调度甘特图)
2. **人员调度甘特图** (`/dashboard` -> 人员仪表板 -> 调度甘特图)

### 前端依赖

甘特图正常工作需要以下前端依赖正确安装：

| 依赖 | 版本 | 用途 |
|------|------|------|
| `recharts` | ^3.7.0 | 图表渲染库（甘特图基于此实现） |
| `dayjs` | ^1.11.19 | 日期时间处理 |
| `antd` | ^5.24.6 | UI组件库（Tooltip, Progress等） |
| `react` | ^18.3.1 | 前端框架 |
| `axios` | ^1.13.4 | HTTP请求客户端 |

**验证前端依赖安装：**
```bash
cd frontend
npm install
npm run build   # 确保构建成功
```

### 后端API依赖

甘特图数据由以下API端点提供：

| 端点 | 用途 | 必需参数 |
|------|------|----------|
| `GET /api/v1/equipment/schedules/gantt` | 设备调度数据 | `start_date`, `end_date` |
| `GET /api/v1/personnel/schedules/gantt` | 人员调度数据 | `start_date`, `end_date` |

**API响应数据结构（设备）：**
```json
{
  "start_date": "2026-02-01T00:00:00",
  "end_date": "2026-02-07T23:59:59",
  "equipment": [
    {
      "id": 1,
      "name": "设备名称",
      "code": "EQ-001",
      "equipment_type": "analytical",
      "category": "thermal",
      "status": "available",
      "laboratory_id": 1,
      "schedules": [
        {
          "id": 1,
          "start_time": "2026-02-01T08:00:00",
          "end_time": "2026-02-01T16:00:00",
          "title": "任务标题",
          "status": "in_progress",
          "priority_level": 2
        }
      ]
    }
  ],
  "total_equipment": 10,
  "total_schedules": 25
}
```

### 数据库依赖

甘特图功能依赖以下数据库表：

| 表名 | 用途 |
|------|------|
| `equipment` | 设备基本信息 |
| `equipment_schedules` | 设备调度记录 |
| `personnel` | 人员基本信息 |
| `work_order_tasks` | 工单任务（人员调度来源） |
| `work_orders` | 工单信息（优先级） |

---

### 甘特图不显示的常见原因及解决方案

#### 1. 前端依赖未安装

**症状：** 页面空白或报错 "recharts is not defined"

**解决方案：**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. 后端服务未启动或端口不通

**症状：** 浏览器控制台显示网络请求失败 (ERR_CONNECTION_REFUSED)

**解决方案：**
```bash
# 检查后端是否运行
docker compose ps
docker compose logs backend

# 重启后端
docker compose restart backend

# 检查端口
curl http://localhost:8000/docs
```

#### 3. API跨域问题（CORS）

**症状：** 浏览器控制台显示 CORS 错误

**解决方案：**
- 检查后端 `app/main.py` 中的 CORS 配置
- 确保 `allow_origins` 包含前端域名
- 对于开发环境，可临时设置 `allow_origins=["*"]`

```python
# app/main.py 中的CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 4. 数据库无数据

**症状：** 甘特图区域显示 "暂无调度数据" 或空白

**解决方案：**
```bash
# 运行种子数据脚本
cd backend
python scripts/seed_data.py

# 或检查数据库
docker compose exec db mysql -u root -p
USE lab_management;
SELECT COUNT(*) FROM equipment;
SELECT COUNT(*) FROM equipment_schedules;
```

#### 5. 日期范围内无有效数据

**症状：** 甘特图显示但没有任务条

**解决方案：**
- 调整日期选择器的日期范围
- 确保选择的日期范围内有调度数据
- 检查数据库中调度数据的时间范围：
```sql
SELECT MIN(start_time), MAX(end_time) FROM equipment_schedules;
```

#### 6. 前端构建问题

**症状：** 页面加载但甘特图组件不渲染

**解决方案：**
```bash
# 清理并重新构建
cd frontend
rm -rf dist
npm run build

# 检查构建输出是否有错误
ls -la dist/
```

#### 7. 浏览器兼容性

**症状：** 在某些浏览器中甘特图不显示

**支持的浏览器：**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**解决方案：** 使用现代浏览器，清除浏览器缓存

#### 8. 认证Token问题

**症状：** API返回401未授权错误

**解决方案：**
- 重新登录系统
- 检查localStorage中的token是否有效
- 清除浏览器缓存后重新登录

```javascript
// 浏览器控制台检查token
localStorage.getItem('token');
```

#### 9. 前后端API路径不匹配

**症状：** 404 Not Found 错误

**解决方案：**
检查 `frontend/src/services/api.ts` 中的 `baseURL` 配置：
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});
```

对于Docker部署，确保nginx配置正确代理API请求。

#### 10. 内存不足导致渲染失败

**症状：** 大量设备/任务时页面卡顿或崩溃

**解决方案：**
- 缩小日期范围（最大支持7天）
- 按实验室或类别筛选减少数据量
- 增加服务器内存

---

### 快速诊断检查清单

```bash
# 1. 检查所有服务状态
docker compose ps

# 2. 检查后端日志
docker compose logs backend --tail=50

# 3. 测试API端点
curl -X GET "http://localhost/api/v1/equipment/schedules/gantt?start_date=2026-02-01T00:00:00&end_date=2026-02-07T23:59:59" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. 检查数据库连接
docker compose exec db mysqladmin ping -h localhost

# 5. 检查前端构建
docker compose exec frontend ls -la /app/dist/
```

---

## Useful Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Restart services
docker compose restart

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Access backend container shell
docker compose exec backend bash

# Access MySQL
docker compose exec db mysql -u lab_user -p lab_management
```

## Troubleshooting

### Check container status
```bash
docker compose ps
docker compose logs backend
```

### Database connection issues
```bash
# Check if MySQL is ready
docker compose exec db mysqladmin ping -h localhost

# Check backend logs
docker compose logs backend | grep -i error
```

### Nginx issues
```bash
# Test nginx configuration
docker compose exec nginx nginx -t

# View nginx logs
docker compose logs nginx
```

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Keep system updated**: `apt update && apt upgrade -y`
3. **Monitor fail2ban**: `fail2ban-client status`
4. **Regular backups**: Schedule MySQL backups
5. **Use strong SSH keys** and disable password authentication

## Backup Database

```bash
# Create backup
docker compose exec db mysqldump -u root -p lab_management > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker compose exec -T db mysql -u root -p lab_management
```
