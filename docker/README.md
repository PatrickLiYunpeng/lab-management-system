# Docker 部署指南

## 快速开始

### 1. 准备环境

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
systemctl start docker && systemctl enable docker
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（必须修改密码和密钥）
nano .env
```

**重要配置项：**
- `MYSQL_ROOT_PASSWORD`: MySQL root 密码
- `MYSQL_PASSWORD`: 应用数据库密码
- `SECRET_KEY`: JWT 签名密钥（使用 `python -c "import secrets; print(secrets.token_hex(32))"` 生成）

### 3. 构建前端（如需修改前端代码）

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 访问系统

- 前端界面: http://your-server-ip
- API 文档: http://your-server-ip/docs
- 默认账号: admin / admin123

## 常用命令

```bash
# 停止所有服务
docker-compose down

# 重启后端服务
docker-compose restart backend

# 查看后端日志
docker-compose logs -f backend

# 进入 MySQL 容器
docker exec -it lab-mysql mysql -u lab_user -p

# 备份数据库
docker exec lab-mysql mysqldump -u lab_user -p lab_management > backup.sql

# 恢复数据库
docker exec -i lab-mysql mysql -u lab_user -p lab_management < backup.sql
```

## 目录结构

```
.
├── docker-compose.yml      # Docker Compose 配置
├── .env.example            # 环境变量模板
├── .env                    # 实际环境变量（不要提交到 Git）
├── backend/                # 后端代码
│   └── Dockerfile
├── frontend/
│   └── dist/               # 前端构建产物
└── docker/
    ├── nginx/
    │   └── default.conf    # Nginx 配置
    └── init-db/
        └── 01-init.sql     # 数据库初始化脚本
```

## 生产环境建议

1. **修改默认密码**: 登录后立即修改 admin 密码
2. **配置 HTTPS**: 使用 Let's Encrypt 或上传 SSL 证书
3. **设置防火墙**: 只开放 80/443 端口
4. **定期备份**: 配置数据库自动备份
5. **监控日志**: 使用 `docker-compose logs -f` 监控服务状态
