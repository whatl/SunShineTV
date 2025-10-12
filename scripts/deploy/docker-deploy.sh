#!/bin/bash

# Docker 部署脚本
# 用法: ./docker-deploy.sh [start|stop|restart|logs|rebuild]

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取当前目录
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
    if [ -f .env.deploy.example ]; then
        echo -e "${BLUE}📝 正在创建 .env 文件...${NC}"
        cp .env.deploy.example .env
        echo -e "${GREEN}✅ 已创建 .env 文件，请编辑配置后重新运行${NC}"
        echo -e "${YELLOW}编辑命令: vi .env${NC}"
        exit 0
    else
        echo -e "${RED}❌ 未找到 .env.deploy.example 文件${NC}"
        exit 1
    fi
fi

# 检查并加载镜像
check_and_load_image() {
    # 查找镜像文件
    IMAGE_FILE=$(ls resourcetv-*.tar.gz 2>/dev/null | head -1)

    if [ -z "$IMAGE_FILE" ]; then
        # 没有镜像文件，检查镜像是否已加载
        if docker images | grep -q "^resourcetv.*latest"; then
            echo -e "${GREEN}✓${NC} 镜像 resourcetv:latest 已存在"

            # 显示镜像架构
            ARCH=$(docker inspect resourcetv:latest --format='{{.Architecture}}' 2>/dev/null)
            if [ -n "$ARCH" ]; then
                echo -e "${BLUE}   架构: ${GREEN}${ARCH}${NC}"
            fi
            return 0
        else
            echo -e "${RED}❌ 未找到镜像文件 (resourcetv-*.tar.gz)${NC}"
            echo -e "${YELLOW}请确保镜像文件在当前目录${NC}"
            exit 1
        fi
    fi

    # 有镜像文件，检查是否需要重新加载
    if docker images | grep -q "^resourcetv.*latest"; then
        CURRENT_ARCH=$(docker inspect resourcetv:latest --format='{{.Architecture}}' 2>/dev/null)
        echo -e "${YELLOW}⚠️  镜像 resourcetv:latest 已存在 (架构: ${CURRENT_ARCH})${NC}"
        echo -e "${BLUE}📦 发现新的镜像文件: ${IMAGE_FILE}${NC}"
        echo -e "${YELLOW}将删除旧镜像并加载新镜像...${NC}"
        docker rmi resourcetv:latest 2>/dev/null || true
    else
        echo -e "${YELLOW}⚠️  未找到 resourcetv:latest 镜像${NC}"
    fi

    echo -e "${BLUE}📦 正在加载镜像: ${IMAGE_FILE}${NC}"
    docker load -i "$IMAGE_FILE"

    if [ $? -eq 0 ]; then
        NEW_ARCH=$(docker inspect resourcetv:latest --format='{{.Architecture}}' 2>/dev/null)
        echo -e "${GREEN}✅ 镜像加载成功${NC}"
        echo -e "${BLUE}   新镜像架构: ${GREEN}${NEW_ARCH}${NC}"
    else
        echo -e "${RED}❌ 镜像加载失败${NC}"
        exit 1
    fi
}

# 命令处理
COMMAND=$1

# 如果没有提供命令，显示帮助信息
if [ -z "$COMMAND" ]; then
    echo -e "${YELLOW}用法: $0 [start|stop|restart|logs|reload|status]${NC}"
    echo ""
    echo -e "${BLUE}命令说明:${NC}"
    echo -e "  ${GREEN}start${NC}    - 启动服务（自动加载镜像）"
    echo -e "  ${GREEN}stop${NC}     - 停止服务"
    echo -e "  ${GREEN}restart${NC}  - 重启服务"
    echo -e "  ${GREEN}logs${NC}     - 查看日志"
    echo -e "  ${GREEN}reload${NC}   - 重新加载镜像并启动"
    echo -e "  ${GREEN}status${NC}   - 查看状态"
    echo ""
    echo -e "${BLUE}示例:${NC}"
    echo -e "  ${GREEN}./docker-deploy.sh start${NC}   # 启动服务"
    echo -e "  ${GREEN}./docker-deploy.sh logs${NC}    # 查看日志"
    exit 0
fi

case $COMMAND in
    start)
        echo -e "${BLUE}🚀 启动 ResourceTV...${NC}"
        check_and_load_image
        docker-compose up -d
        echo -e "${GREEN}✅ 启动完成${NC}"
        echo -e "${BLUE}📊 查看状态: docker-compose ps${NC}"
        echo -e "${BLUE}📋 查看日志: docker-compose logs -f${NC}"
        ;;

    stop)
        echo -e "${BLUE}🛑 停止 ResourceTV...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ 已停止${NC}"
        ;;

    restart)
        echo -e "${BLUE}🔄 重启 ResourceTV...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ 重启完成${NC}"
        ;;

    logs)
        echo -e "${BLUE}📋 查看日志 (Ctrl+C 退出)...${NC}"
        docker-compose logs -f
        ;;

    reload)
        echo -e "${BLUE}🔄 重新加载镜像并启动...${NC}"
        docker-compose down

        # 删除旧镜像
        echo -e "${BLUE}🗑️  删除旧镜像...${NC}"
        docker rmi resourcetv:latest 2>/dev/null || true

        # 加载新镜像
        check_and_load_image

        docker-compose up -d
        echo -e "${GREEN}✅ 重新加载完成${NC}"
        ;;

    status)
        echo -e "${BLUE}📊 服务状态:${NC}"
        docker-compose ps
        ;;

    *)
        echo -e "${RED}❌ 未知命令: $COMMAND${NC}"
        echo ""
        echo -e "${YELLOW}可用命令: start, stop, restart, logs, reload, status${NC}"
        echo -e "${YELLOW}运行 './docker-deploy.sh' 查看详细帮助${NC}"
        exit 1
        ;;
esac
