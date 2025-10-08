#!/bin/bash

# Docker 镜像构建脚本
# 用法: ./build-docker.sh

set -e

echo "🚀 开始 Docker 镜像构建..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}📁 部署目录: $SCRIPT_DIR${NC}"
echo -e "${BLUE}📁 项目目录: $PROJECT_ROOT${NC}"
echo ""

# ==================== 步骤 1: 检查 .env 文件 ====================
echo -e "${YELLOW}步骤 1/2: 检查环境配置${NC}"

cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"

    if [ -f .env.build.example ]; then
        echo -e "${BLUE}📝 从模板创建 .env 文件...${NC}"
        cp .env.build.example .env
        echo -e "${GREEN}✅ 已创建 .env 文件: $SCRIPT_DIR/.env${NC}"
        echo ""
        echo -e "${RED}请先编辑 .env 文件配置以下内容：${NC}"
        echo -e "  - NEXT_PUBLIC_SITE_NAME (站点名称)"
        echo -e "  - NEXT_PUBLIC_MACCMS_API_BASE (后端API地址)"
        echo ""
        echo -e "${BLUE}编辑命令: vi $SCRIPT_DIR/.env${NC}"
        echo ""

        read -p "$(echo -e ${YELLOW}配置完成后按回车继续... ${NC})"
    else
        echo -e "${RED}❌ 未找到 .env.build.example 模板${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 找到 .env 文件: $SCRIPT_DIR/.env${NC}"
    echo ""
    echo -e "${YELLOW}当前配置:${NC}"
    grep -E "^(NEXT_PUBLIC_SITE_NAME|NEXT_PUBLIC_MACCMS_API_BASE)=" .env | head -3 || true
    echo ""

    read -p "$(echo -e ${YELLOW}确认使用当前配置继续? \(y/n\): ${NC})" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 已取消${NC}"
        exit 1
    fi
fi

# ==================== 步骤 2: 构建镜像 ====================
echo ""
echo -e "${YELLOW}步骤 2/2: 构建 Docker 镜像${NC}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi

# 创建 output 目录
cd "$PROJECT_ROOT"
mkdir -p output

# 镜像信息
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="resourcetv"
IMAGE_TAG="latest"
IMAGE_FULL="${IMAGE_NAME}:${IMAGE_TAG}"
OUTPUT_FILE="output/${IMAGE_NAME}-${TIMESTAMP}.tar"

# 检测平台并提示用户选择
CURRENT_ARCH=$(uname -m)
echo -e "${BLUE}当前系统架构: ${GREEN}${CURRENT_ARCH}${NC}"
echo ""
echo -e "${YELLOW}请选择构建平台:${NC}"
echo -e "  ${GREEN}1.${NC} linux/amd64 (x86_64 服务器，推荐)"
echo -e "  ${GREEN}2.${NC} linux/arm64 (ARM 服务器)"
echo -e "  ${GREEN}3.${NC} 同时构建 amd64 + arm64 (两个部署包)"
echo -e "  ${GREEN}4.${NC} 自动检测（本机架构）"
echo ""
read -p "$(echo -e ${YELLOW}请输入选项 [1-4, 默认 1]: ${NC})" -n 1 -r PLATFORM_CHOICE
echo ""
echo ""

# 确定要构建的平台列表
PLATFORMS_TO_BUILD=()

case $PLATFORM_CHOICE in
    2)
        PLATFORMS_TO_BUILD=("linux/arm64:arm64")
        ;;
    3)
        PLATFORMS_TO_BUILD=("linux/amd64:amd64" "linux/arm64:arm64")
        echo -e "${GREEN}✓${NC} 将构建两个平台的部署包"
        ;;
    4)
        if [ "$CURRENT_ARCH" = "arm64" ] || [ "$CURRENT_ARCH" = "aarch64" ]; then
            PLATFORMS_TO_BUILD=("linux/arm64:arm64")
        else
            PLATFORMS_TO_BUILD=("linux/amd64:amd64")
        fi
        ;;
    *)
        PLATFORMS_TO_BUILD=("linux/amd64:amd64")
        ;;
esac

echo ""

# 从数组中提取平台信息（当前只构建第一个平台）
PLATFORM_INFO="${PLATFORMS_TO_BUILD[0]}"
TARGET_PLATFORM="${PLATFORM_INFO%%:*}"
PLATFORM_SUFFIX="${PLATFORM_INFO##*:}"

echo -e "${GREEN}✓${NC} 目标平台: ${GREEN}${TARGET_PLATFORM}${NC}"
echo ""

# 更新输出文件名，包含平台信息
OUTPUT_FILE="output/${IMAGE_NAME}-${PLATFORM_SUFFIX}-${TIMESTAMP}.tar"

# 从 .env 文件读取变量并构建 build-args
BUILD_ARGS=()
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${BLUE}📝 读取 .env 配置并传递给 Docker...${NC}"

    # 读取需要传递的变量
    while IFS= read -r line; do
        # 跳过注释和空行
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue

        # 提取 key 和 value
        key="${line%%=*}"
        value="${line#*=}"

        # 只传递 NEXT_PUBLIC_ 开头的变量
        if [[ "$key" =~ ^NEXT_PUBLIC_ ]]; then
            # 去除值两端的引号
            value=$(echo "$value" | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//')
            BUILD_ARGS+=("--build-arg" "${key}=${value}")
            echo -e "  ${GREEN}✓${NC} ${key}=${value}"
        fi
    done < "$SCRIPT_DIR/.env"
    echo ""
fi

echo -e "${BLUE}🔨 构建镜像: ${IMAGE_FULL}${NC}"
echo -e "${BLUE}   平台: ${TARGET_PLATFORM}${NC}"
echo -e "${BLUE}   Dockerfile: scripts/deploy/Dockerfile${NC}"
echo ""

# 使用 scripts/deploy/Dockerfile 进行构建，指定目标平台
# 添加 --no-cache 避免使用缓存的错误架构镜像
docker build --platform "${TARGET_PLATFORM}" --no-cache -f "$SCRIPT_DIR/Dockerfile" "${BUILD_ARGS[@]}" -t "${IMAGE_FULL}" .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 构建成功${NC}"

# 导出镜像
echo -e "${BLUE}📦 导出镜像...${NC}"
docker save -o "${OUTPUT_FILE}" "${IMAGE_FULL}"

# 压缩
echo -e "${BLUE}🗜️  压缩镜像...${NC}"
gzip "${OUTPUT_FILE}"
IMAGE_TAR_GZ="${OUTPUT_FILE}.gz"

# ==================== 创建完整部署包 ====================
echo ""
echo -e "${BLUE}📦 打包部署文件...${NC}"

# 创建临时部署目录（包含平台信息）
DEPLOY_PACKAGE_DIR="output/deploy-${PLATFORM_SUFFIX}-${TIMESTAMP}"
mkdir -p "${DEPLOY_PACKAGE_DIR}"

# 复制镜像文件
cp "${IMAGE_TAR_GZ}" "${DEPLOY_PACKAGE_DIR}/"
echo -e "  ${GREEN}✓${NC} 镜像文件"

# 复制部署脚本
cp "$SCRIPT_DIR/docker-compose.yml" "${DEPLOY_PACKAGE_DIR}/"
echo -e "  ${GREEN}✓${NC} docker-compose.yml"

cp "$SCRIPT_DIR/.env.deploy.example" "${DEPLOY_PACKAGE_DIR}/.env.deploy.example"
echo -e "  ${GREEN}✓${NC} .env.deploy.example"

cp "$SCRIPT_DIR/docker-deploy.sh" "${DEPLOY_PACKAGE_DIR}/"
chmod +x "${DEPLOY_PACKAGE_DIR}/docker-deploy.sh"
echo -e "  ${GREEN}✓${NC} docker-deploy.sh"

# 创建部署说明文件
cat > "${DEPLOY_PACKAGE_DIR}/README.md" << 'EOF'
# ResourceTV 部署包

## 文件清单

- `resourcetv-*.tar.gz` - Docker 镜像文件
- `docker-compose.yml` - Docker Compose 配置
- `.env.deploy.example` - 环境变量配置模板
- `docker-deploy.sh` - 部署管理脚本

## 快速部署

### 1. 配置环境变量

```bash
# 复制配置模板
cp .env.deploy.example .env

# 编辑配置文件
vi .env
```

必须配置的关键参数：
- `KVROCKS_URL` - Kvrocks 连接地址（默认已配置）
- `NEXT_PUBLIC_MACCMS_API_BASE` - 后端 API 地址
- `USERNAME` / `PASSWORD` - 管理员账号密码

### 2. 启动服务

```bash
# 启动服务（自动加载镜像）
./docker-deploy.sh start

# 查看运行状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs
```

**注意**：首次运行 `start` 命令时，脚本会自动检测并加载 `resourcetv-*.tar.gz` 镜像文件。

### 3. 访问应用

- 应用地址: http://your-server-ip:80
- 管理后台: http://your-server-ip:80/admin

## 管理命令

```bash
./docker-deploy.sh start    # 启动服务（自动加载镜像）
./docker-deploy.sh stop     # 停止服务
./docker-deploy.sh restart  # 重启服务
./docker-deploy.sh logs     # 查看日志
./docker-deploy.sh reload   # 重新加载镜像并启动
./docker-deploy.sh status   # 查看状态
```

## 服务说明

- **resourcetv** - 主应用服务 (端口 80)
- **resourcetv-kvrocks** - 数据存储服务 (端口 6666)

## 数据备份

```bash
# 备份 Kvrocks 数据
docker run --rm -v resourcetv_kvrocks-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/kvrocks-backup.tar.gz -C /data .

# 恢复数据
docker run --rm -v resourcetv_kvrocks-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/kvrocks-backup.tar.gz -C /data
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs -f

# 检查容器状态
docker ps -a

# 检查网络连接
docker network inspect resourcetv-network
```

### 数据库连接失败

确认 `.env` 文件中 `KVROCKS_URL` 配置正确：
```
KVROCKS_URL=redis://resourcetv-kvrocks:6666
```
EOF

echo -e "  ${GREEN}✓${NC} README.md"

# 打包成 zip
cd output
ZIP_NAME="${IMAGE_NAME}-${PLATFORM_SUFFIX}-deploy-${TIMESTAMP}.zip"
zip -r "${ZIP_NAME}" "deploy-${PLATFORM_SUFFIX}-${TIMESTAMP}" > /dev/null
cd ..

# 清理临时目录和单独的镜像文件
rm -rf "${DEPLOY_PACKAGE_DIR}"

# 获取镜像大小（删除前）
IMAGE_SIZE=$(du -h "${IMAGE_TAR_GZ}" | cut -f1)

# 删除单独的镜像文件（已包含在 zip 中）
echo -e "${BLUE}🗑️  清理临时文件...${NC}"
rm -f "${IMAGE_TAR_GZ}"
echo -e "  ${GREEN}✓${NC} 已删除单独的镜像文件"

# 获取 zip 文件大小
ZIP_FILE="output/${ZIP_NAME}"
ZIP_SIZE=$(du -h "${ZIP_FILE}" | cut -f1)

# 结果
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 构建完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📦 部署包: ${GREEN}${ZIP_FILE}${NC}"
echo -e "${BLUE}📊 大小: ${GREEN}${ZIP_SIZE}${NC}"
echo ""
echo -e "${BLUE}包含文件:${NC}"
echo -e "  ${GREEN}✓${NC} 镜像文件 (${IMAGE_SIZE})"
echo -e "  ${GREEN}✓${NC} docker-compose.yml"
echo -e "  ${GREEN}✓${NC} .env.deploy.example"
echo -e "  ${GREEN}✓${NC} docker-deploy.sh"
echo -e "  ${GREEN}✓${NC} README.md"
echo ""
echo -e "${YELLOW}部署步骤:${NC}"
echo -e "  ${BLUE}1.${NC} 上传到服务器"
echo -e "     ${GREEN}scp ${ZIP_FILE} user@server:/path/${NC}"
echo ""
echo -e "  ${BLUE}2.${NC} 解压部署包"
echo -e "     ${GREEN}unzip ${ZIP_NAME}${NC}"
echo -e "     ${GREEN}cd deploy-${PLATFORM_SUFFIX}-${TIMESTAMP}${NC}"
echo ""
echo -e "  ${BLUE}3.${NC} 配置环境变量"
echo -e "     ${GREEN}cp .env.deploy.example .env${NC}"
echo -e "     ${GREEN}vi .env${NC}"
echo ""
echo -e "  ${BLUE}4.${NC} 启动服务（自动加载镜像）"
echo -e "     ${GREEN}./docker-deploy.sh start${NC}"
echo ""
echo -e "${YELLOW}注意: 此镜像为 ${TARGET_PLATFORM} 平台构建${NC}"
echo ""
