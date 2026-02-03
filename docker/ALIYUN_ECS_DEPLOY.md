# 阿里云 ECS Docker 部署详细指南

## 一、购买并配置 ECS 实例

### 1.1 登录阿里云控制台

1. 访问 https://ecs.console.aliyun.com/
2. 点击「创建实例」

### 1.2 选择配置

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| 地域 | 华东1（杭州）或离用户最近 | 影响访问速度 |
| 实例规格 | ecs.c6.large (2核4G) | 小规模使用足够 |
| 镜像 | Ubuntu 22.04 64位 | 推荐 |
| 系统盘 | 高效云盘 40GB | 存放系统和Docker镜像 |
| 数据盘 | 可选，20GB+ | 存放MySQL数据（生产环境建议） |
| 带宽 | 按量付费 5Mbps+ | 根据访问量调整 |

### 1.3 配置安全组

在安全组中开放以下端口：

| 端口 | 协议 | 说明 |
|------|------|------|
| 22 | TCP | SSH 远程连接 |
| 80 | TCP | HTTP 网站访问 |
| 443 | TCP | HTTPS 网站访问 |

> ⚠️ **不要开放 3306 端口**（MySQL），保持数据库仅内网访问

---

## 二、连接服务器

### 2.1 获取连接信息

在 ECS 控制台获取：
- **公网 IP**: 如 `47.98.xxx.xxx`
- **登录密码**: 创建实例时设置的密码

### 2.2 SSH 连接

```bash
# macOS / Linux
ssh root@47.98.xxx.xxx

# Windows: 使用 PuTTY 或 Windows Terminal
ssh root@47.98.xxx.xxx
```

首次连接输入 `yes` 确认，然后输入密码。

---

## 三、安装 Docker

```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要工具
apt install -y curl wget git

# 一键安装 Docker（使用阿里云镜像加速）
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 启动 Docker 并设置开机自启
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 3.1 配置 Docker 镜像加速（重要！）

```bash
# 创建配置文件
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF

# 重启 Docker
systemctl daemon-reload
systemctl restart docker
```

---

## 四、上传项目代码

### 方式一：Git 克隆（推荐）

```bash
# 进入工作目录
cd /opt

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/PatrickLiYunpeng/lab-management-system.git

# 进入项目目录
cd lab-management-system
```

### 方式二：SCP 上传

在**本地电脑**执行：

```bash
# 上传整个项目
scp -r /path/to/lab-management-system root@47.98.xxx.xxx:/opt/

# 或只上传部署包
scp lab-management-v2.1-deploy.tar.gz root@47.98.xxx.xxx:/opt/
```

在**服务器**上解压：

```bash
cd /opt
tar -xzf lab-management-v2.1-deploy.tar.gz
mv deploy-package lab-management-system
cd lab-management-system
```

---

## 五、配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 生成安全密钥
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
echo "生成的 SECRET_KEY: $SECRET_KEY"

# 编辑配置文件
nano .env
```

修改 `.env` 文件内容：

```bash
# 必须修改的配置
SERVER_IP=47.98.xxx.xxx          # 你的ECS公网IP

# 数据库密码（生产环境必须修改！）
MYSQL_ROOT_PASSWORD=YourStrongRootPass2026!
MYSQL_PASSWORD=YourStrongUserPass2026!

# JWT密钥（使用上面生成的）
SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 其他保持默认
DEBUG=false
```

保存并退出：`Ctrl+X`，然后 `Y`，然后 `Enter`

---

## 六、构建和启动服务

### 6.1 确保前端已构建

如果是 Git 克隆的项目，需要先构建前端：

```bash
# 检查是否有构建产物
ls frontend/dist/

# 如果没有，需要构建（需要 Node.js）
apt install -y nodejs npm
cd frontend
npm install
npm run build
cd ..
```

如果使用部署包，前端已经构建好了。

### 6.2 启动所有服务

```bash
# 构建并启动（后台运行）
docker compose up -d --build

# 查看构建日志
docker compose logs -f
```

首次启动需要 5-10 分钟下载镜像和构建。

### 6.3 验证服务状态

```bash
# 查看所有容器状态
docker compose ps
```

正常输出：
```
NAME           STATUS                   PORTS
lab-backend    Up 2 minutes             8000/tcp
lab-mysql      Up 2 minutes (healthy)   0.0.0.0:3306->3306/tcp
lab-nginx      Up 2 minutes             0.0.0.0:80->80/tcp
```

---

## 七、访问测试

### 7.1 在浏览器中访问

打开浏览器，访问：`http://47.98.xxx.xxx`（替换为你的 ECS 公网 IP）

### 7.2 默认登录账号

- **用户名**: admin
- **密码**: admin123

> ⚠️ **首次登录后请立即修改密码！**

### 7.3 测试 API

```bash
# 在服务器上测试
curl http://localhost/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 八、常用运维命令

```bash
# 查看所有容器日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 重启某个服务
docker compose restart backend

# 停止所有服务
docker compose down

# 停止并删除所有数据（慎用！）
docker compose down -v

# 查看容器资源使用
docker stats

# 进入 MySQL 容器
docker exec -it lab-mysql mysql -u lab_user -p
```

---

## 九、数据备份

### 9.1 手动备份

```bash
# 备份数据库
docker exec lab-mysql mysqldump -u lab_user -p'YourPassword' lab_management > backup_$(date +%Y%m%d).sql

# 查看备份
ls -la backup_*.sql
```

### 9.2 设置自动备份（推荐）

```bash
# 创建备份脚本
cat > /opt/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/opt/backups
mkdir -p $BACKUP_DIR
docker exec lab-mysql mysqldump -u lab_user -p'YourPassword' lab_management > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
# 保留最近7天的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# 添加定时任务（每天凌晨2点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh") | crontab -
```

---

## 十、配置 HTTPS（可选但推荐）

### 10.1 准备域名

1. 在阿里云购买域名或使用已有域名
2. 添加 A 记录指向 ECS 公网 IP
3. 等待 DNS 生效（通常几分钟）

### 10.2 申请免费 SSL 证书

```bash
# 安装 certbot
apt install -y certbot

# 停止 nginx 临时释放 80 端口
docker compose stop nginx

# 申请证书（替换域名）
certbot certonly --standalone -d your-domain.com

# 证书会保存在 /etc/letsencrypt/live/your-domain.com/
```

### 10.3 配置 HTTPS

```bash
# 复制证书到 Docker 目录
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/
```

更新 `docker/nginx/default.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... 其他配置保持不变
}
```

重启服务：
```bash
docker compose up -d
```

---

## 十一、故障排查

### 问题1：页面打不开

```bash
# 检查容器状态
docker compose ps

# 如果有容器 Exited，查看日志
docker compose logs backend
docker compose logs nginx
```

### 问题2：登录失败

```bash
# 检查后端日志
docker compose logs backend | tail -50

# 检查数据库连接
docker exec -it lab-mysql mysql -u lab_user -p -e "SELECT COUNT(*) FROM users;"
```

### 问题3：数据库连接失败

```bash
# 等待 MySQL 完全启动
docker compose logs db | grep "ready for connections"

# 重启所有服务
docker compose restart
```

### 问题4：内存不足

```bash
# 查看内存使用
free -h

# 如果内存不足，考虑：
# 1. 升级 ECS 配置
# 2. 添加 swap 空间
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 快速命令参考卡

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 重启
docker compose restart

# 日志
docker compose logs -f

# 状态
docker compose ps

# 进入后端容器
docker exec -it lab-backend bash

# 进入MySQL
docker exec -it lab-mysql mysql -u lab_user -p
```
