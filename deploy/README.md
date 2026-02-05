# Lab Management System - 部署指南

## 目录结构

```
deploy/
├── frontend/          # 前端静态文件
├── backend/           # 后端Python应用
│   ├── app/          # 应用代码
│   ├── requirements.txt
│   ├── .env.example  # 环境变量模板
│   └── start.sh      # 启动脚本
└── nginx.conf.example # Nginx配置示例
```

## 系统要求

- Python 3.10+
- MySQL 5.7+ 或 MariaDB 10.3+
- Nginx (用于生产环境)
- Node.js 18+ (仅开发时需要)

## 部署步骤

### 1. 数据库配置

```sql
CREATE DATABASE lab_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'labuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON lab_management.* TO 'labuser'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 后端部署

```bash
cd backend

# 复制并配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等

# 创建虚拟环境并安装依赖
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 启动服务 (开发/测试)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 或使用 gunicorn (生产环境)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### 3. 前端部署

```bash
# 复制前端文件到web目录
sudo mkdir -p /var/www/lab-management
sudo cp -r frontend/* /var/www/lab-management/frontend/
```

### 4. Nginx配置

```bash
# 复制并修改Nginx配置
sudo cp nginx.conf.example /etc/nginx/sites-available/lab-management
sudo ln -s /etc/nginx/sites-available/lab-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Systemd服务 (可选)

创建 `/etc/systemd/system/lab-backend.service`:

```ini
[Unit]
Description=Lab Management Backend
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/lab-management/backend
Environment="PATH=/var/www/lab-management/backend/venv/bin"
ExecStart=/var/www/lab-management/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lab-backend
sudo systemctl start lab-backend
```

## 默认账户

首次启动后，系统会自动创建管理员账户:
- 用户名: `admin`
- 密码: `admin123`

**请在首次登录后立即修改密码！**

## 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| DATABASE_URL | 数据库连接字符串 | mysql+pymysql://user:pass@localhost:3306/lab_management |
| SECRET_KEY | JWT密钥 | 随机生成的长字符串 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token过期时间(分钟) | 1440 |
| CORS_ORIGINS | 允许的跨域来源 | http://localhost:3000 |

## 常见问题

### Q: 前端页面刷新404
确保Nginx配置中有 `try_files $uri $uri/ /index.html;`

### Q: API返回CORS错误
检查 `.env` 中的 `CORS_ORIGINS` 是否包含前端域名

### Q: 数据库连接失败
检查MySQL服务状态和 `DATABASE_URL` 配置
