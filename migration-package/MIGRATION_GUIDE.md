# 实验室管理系统迁移指南

## 包含内容

```
migration-package/
├── database_backup.sql    # MySQL 数据库完整备份
├── backend.tar.gz         # 后端代码 (Python/FastAPI)
├── frontend-dist.tar.gz   # 前端构建产物 (Vite/React)
├── nginx/                 # Nginx 配置模板
├── scripts/               # 部署脚本
├── .env.example           # 环境变量模板
├── DEPLOYMENT.md          # 详细部署文档
└── MIGRATION_GUIDE.md     # 本文件
```

## 迁移步骤

### 1. 环境准备

目标服务器需安装：
- Python 3.11+
- MySQL 8.0+
- Nginx
- Node.js 18+ (可选，仅开发时需要)

### 2. 恢复数据库

```bash
# 创建数据库和用户
mysql -u root -p << EOF
CREATE DATABASE lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lab_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON lab_management.* TO 'lab_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 导入数据
mysql -u lab_user -p lab_management < database_backup.sql
```

### 3. 部署后端

```bash
# 解压后端代码
tar -xzf backend.tar.gz
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp ../.env.example .env
# 编辑 .env 文件，设置数据库连接和密钥

# 启动服务 (生产环境建议使用 systemd)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 部署前端

```bash
# 解压前端构建产物
tar -xzf frontend-dist.tar.gz

# 复制到 Nginx 目录
sudo cp -r frontend/dist/* /var/www/lab-management/
```

### 5. 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp nginx/lab-management.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lab-management.conf /etc/nginx/sites-enabled/

# 测试并重载配置
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 配置 Systemd 服务 (可选)

创建 `/etc/systemd/system/lab-management.service`:

```ini
[Unit]
Description=Lab Management System Backend
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lab-management/backend
Environment="PATH=/opt/lab-management/backend/venv/bin"
ExecStart=/opt/lab-management/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable lab-management
sudo systemctl start lab-management
```

## 重要配置

### 环境变量 (.env)

```bash
# 数据库连接 - 必须修改
DATABASE_URL=mysql+pymysql://lab_user:your_password@localhost/lab_management?charset=utf8mb4

# JWT密钥 - 生产环境必须修改
SECRET_KEY=your-secure-secret-key-here

# CORS配置 - 根据实际域名修改
CORS_ORIGINS=["https://your-domain.com"]
```

### 生成安全密钥

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 验证部署

1. 访问前端: `http://your-server/`
2. 检查 API: `http://your-server/api/v1/health`
3. 默认管理员账号: admin / admin123 (首次登录后请修改密码)

## 备份建议

定期备份数据库：
```bash
mysqldump -u lab_user -p lab_management > backup_$(date +%Y%m%d).sql
```

---
生成时间: 2026-02-05
