# ---- 第 1 阶段：安装依赖 ----
# 平台由 docker build --platform 参数指定
FROM node:20-alpine AS deps

# 启用 corepack 并激活 pnpm（Node20 默认提供 corepack）
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 仅复制依赖清单，提高构建缓存利用率
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（含 devDependencies，后续会裁剪）
RUN pnpm install --frozen-lockfile

# ---- 第 2 阶段：构建项目 ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
# 复制全部源代码
COPY . .

# 在构建阶段也显式设置 DOCKER_ENV，
ENV DOCKER_ENV=true

# 接收构建参数（从 .env 文件传入，带默认值）
ARG NEXT_PUBLIC_SITE_NAME=SunShineTV
ARG NEXT_PUBLIC_CLARITY_ID=
ARG NEXT_PUBLIC_MACCMS_API_BASE=http://localhost:8089
ARG NEXT_PUBLIC_DATA_SOURCE=maccms
ARG NEXT_PUBLIC_SHOW_FILTER_TOOLBAR=false
ARG NEXT_PUBLIC_FLUID_SEARCH=false
ARG NEXT_PUBLIC_DISABLE_YELLOW_FILTER=false

# 将构建参数转为环境变量（供 Next.js 构建时使用）
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
ENV NEXT_PUBLIC_CLARITY_ID=${NEXT_PUBLIC_CLARITY_ID}
ENV NEXT_PUBLIC_MACCMS_API_BASE=${NEXT_PUBLIC_MACCMS_API_BASE}
ENV NEXT_PUBLIC_DATA_SOURCE=${NEXT_PUBLIC_DATA_SOURCE}
ENV NEXT_PUBLIC_SHOW_FILTER_TOOLBAR=${NEXT_PUBLIC_SHOW_FILTER_TOOLBAR}
ENV NEXT_PUBLIC_FLUID_SEARCH=${NEXT_PUBLIC_FLUID_SEARCH}
ENV NEXT_PUBLIC_DISABLE_YELLOW_FILTER=${NEXT_PUBLIC_DISABLE_YELLOW_FILTER}

# ⚠️ 注意：NEXT_PUBLIC_STORAGE_TYPE 和 KVROCKS_URL 不在构建时设置
# 这些配置会在运行时通过 docker-compose.yml 的 .env 文件注入
# 构建时默认使用 localstorage，避免连接外部数据库导致超时

# 生成生产构建
RUN pnpm run build

# ---- 第 3 阶段：生成运行时镜像 ----
FROM node:20-alpine AS runner

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DOCKER_ENV=true


# 从构建器中复制 standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 从构建器中复制 scripts 目录
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# 从构建器中复制 start.js
COPY --from=builder --chown=nextjs:nodejs /app/start.js ./start.js
# 从构建器中复制 public 和 .next/static 目录
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非特权用户
USER nextjs

EXPOSE 3000

# 使用自定义启动脚本，先预加载配置再启动服务器
CMD ["node", "start.js"] 