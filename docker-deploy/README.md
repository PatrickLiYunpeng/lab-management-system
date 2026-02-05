# 实验室管理系统 Docker 部署指南

## 目录结构

```
docker-deploy/
├── docker-compose.yml     # Docker Compose 配置
├── .env.example           # 环境变量模板
├── deploy.sh              # 一键部署脚本
├── README.md              # 本文件
├── backend/               # 后端代码
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   └── alembic/
├── frontend/              # 前端代码
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
└── init-db/               # 数据库初始化
    └── 01-init-data.sql
```

## 快速部署

### 1. 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 磁盘空间

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

**必须修改的配置项:**

```bash
# 数据库密码 (请使用强密码)
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_PASSWORD=your_strong_user_password

# JWT 密钥 (使用以下命令生成)
# python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your_generated_secret_key
```

### 3. 一键部署

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 4. 手动部署 (可选)

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend | 80 | 前端 Web 界面 |
| backend | 8000 | 后端 API 服务 |
| db | 3306 | MySQL 数据库 |

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f [服务名]

# 重启服务
docker compose restart [服务名]

# 停止所有服务
docker compose down

# 停止并删除数据卷 (慎用!)
docker compose down -v

# 进入容器
docker exec -it lab-backend bash
docker exec -it lab-mysql mysql -u root -p
```

## 数据备份

```bash
# 备份数据库
docker exec lab-mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} lab_management > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i lab-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} lab_management < backup.sql
```

## 更新部署

```bash
# 拉取最新代码后
docker compose build --no-cache
docker compose up -d
```

## 生产环境建议

1. **HTTPS**: 在 Nginx 前面添加 SSL 证书或使用反向代理
2. **防火墙**: 仅开放 80/443 端口，关闭 3306 和 8000 的外部访问
3. **日志**: 配置日志轮转防止磁盘占满
4. **监控**: 添加健康检查和告警
5. **备份**: 设置定时数据库备份任务

## 故障排查

### 数据库连接失败

```bash
# 检查数据库容器状态
docker compose logs db

# 确认数据库已就绪
docker exec lab-mysql mysqladmin ping -h localhost -u root -p
```

### 前端无法访问 API

```bash
# 检查后端服务状态
docker compose logs backend

# 测试 API
curl http://localhost:8000/api/v1/health
```

### 重置数据库

```bash
# 停止服务并删除数据卷
docker compose down -v

# 重新启动 (会重新初始化数据库)
docker compose up -d
```

---

默认管理员账号: **admin / admin123**

部署完成后请立即修改密码！
