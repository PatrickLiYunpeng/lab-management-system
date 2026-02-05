#!/bin/bash
set -e

echo "=========================================="
echo "  实验室管理系统 Docker 部署脚本"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "未检测到 .env 文件，从模板创建..."
    cp .env.example .env
    echo "请编辑 .env 文件配置数据库密码和密钥后重新运行此脚本"
    exit 1
fi

# 检查是否修改了默认密码
if grep -q "your_root_password_here\|your_secure_password_here\|your-secure-secret-key" .env; then
    echo "警告: 检测到默认密码，请修改 .env 文件中的密码配置"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo ">> 构建并启动服务..."

# 使用 docker compose (新版) 或 docker-compose (旧版)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# 构建镜像
$COMPOSE_CMD build

# 启动服务
$COMPOSE_CMD up -d

echo ""
echo ">> 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo ">> 服务状态:"
$COMPOSE_CMD ps

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - 前端: http://localhost"
echo "  - API:  http://localhost:8000/api/v1"
echo "  - 文档: http://localhost:8000/docs"
echo ""
echo "默认管理员账号: admin / admin123"
echo "(首次登录后请修改密码)"
echo ""
echo "常用命令:"
echo "  查看日志: $COMPOSE_CMD logs -f"
echo "  停止服务: $COMPOSE_CMD down"
echo "  重启服务: $COMPOSE_CMD restart"
echo ""
