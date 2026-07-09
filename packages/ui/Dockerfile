ARG base_type=alpine

FROM --platform=linux/amd64 node:22-alpine AS base-amd64-alpine
FROM --platform=linux/arm64 node:22-alpine AS base-arm64-alpine
FROM --platform=linux/arm/v7 node:22-alpine AS base-arm-v7-alpine

FROM --platform=linux/amd64 node:22-trixie-slim AS base-amd64-slim
FROM --platform=linux/arm64 node:22-trixie-slim AS base-arm64-slim
FROM --platform=linux/arm/v7 node:22-alpine AS base-arm-v7-slim

FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT}-${base_type} AS builder

WORKDIR /workspace/
COPY . /workspace/

RUN npm install -g pnpm@10.33.4

# native addon 编译工具（aws-crt 等需要 cmake/g++/python3）
RUN if [ -f /etc/alpine-release ]; then \
        apk add --no-cache python3 make g++ cmake linux-headers; \
    else \
        apt-get update && apt-get install -y --no-install-recommends \
            python3 make g++ cmake && \
        rm -rf /var/lib/apt/lists/*; \
    fi

# --mount=type=cache 缓存 pnpm store，跨构建复用已下载的包
RUN --mount=type=cache,id=pnpm-store-${TARGETARCH},target=/root/.local/share/pnpm/store \
    pnpm install

# 构建所有库和插件包（ui-client 和 ui-server 单独处理）
RUN pnpm -r --filter='!@certd/ui-client' --filter='!@certd/ui-server' run build

# 构建前端
RUN cd /workspace/packages/ui/certd-client && npm run build

# 将前端产物复制到后端 public 目录
RUN mkdir -p /workspace/packages/ui/certd-server/public && \
    cp -rf /workspace/packages/ui/certd-client/dist/* /workspace/packages/ui/certd-server/public/

# 构建后端（编译 TS + 导出插件 YAML）
RUN cd /workspace/packages/ui/certd-server && \
    node ./before-build.js && \
    pnpm run build-only && \
    node export-plugin-yaml.js docoff

# 删除源码和开发工具，缩小最终镜像体积
RUN find /workspace/packages -name "src" -type d \
        -not -path "*/node_modules/*" \
        -exec rm -rf {} + 2>/dev/null || true
RUN find /workspace/packages -name "*.ts" \
        -not -name "*.d.ts" \
        -not -path "*/node_modules/*" \
        -delete 2>/dev/null || true
RUN find /workspace/node_modules -name "*.map" -delete 2>/dev/null || true

# ------------------------------------------------------------------
# 生产镜像
# ------------------------------------------------------------------
ARG base_type=alpine

FROM base-${TARGETARCH}${TARGETVARIANT:+-}${TARGETVARIANT}-${base_type}
EXPOSE 7001
EXPOSE 7002

ARG base_type=alpine

RUN if [ -f /etc/debian_version ]; then \
        apt-get update \
        && apt-get install -y --no-install-recommends \
            ca-certificates wget openssl netcat-openbsd iputils-ping dnsutils iproute2 \
        && apt-get clean && rm -rf /var/lib/apt/lists/*; \
    elif [ -f /etc/alpine-release ]; then \
        apk add --no-cache openssl wget ca-certificates; \
    else \
        echo "Unsupported base image"; exit 1; \
    fi

ENV TERM=xterm
ENV LEGO_VERSION=4.30.1
ENV LEGO_DOWNLOAD_DIR=/workspace/tools/lego

ENV JKS_GO_VERSION=1.0.3
ENV JKS_GO_DOWNLOAD_DIR=/workspace/tools/jks-go

ENV ALIYUN_CLIENT_CONNECT_TIMEOUT=10000
ENV ALIYUN_CLIENT_READ_TIMEOUT=20000

RUN mkdir -p $LEGO_DOWNLOAD_DIR

RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_amd64.tar.gz \
            https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_amd64.tar.gz; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_arm64.tar.gz \
            https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_arm64.tar.gz; \
    else \
        echo "Unsupported architecture for lego: $ARCH"; \
    fi

RUN mkdir -p $JKS_GO_DOWNLOAD_DIR

RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 \
            https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_amd64 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_amd64 /usr/local/bin/jks-go; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 \
            https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_arm64 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm64 /usr/local/bin/jks-go; \
    elif [ "$ARCH" = "armv7l" ]; then \
        wget -O $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 \
            https://github.com/certd/jks-go/releases/download/v${JKS_GO_VERSION}/jks-go_linux_arm_armv7 && \
        chmod +x $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 && \
        ln -s $JKS_GO_DOWNLOAD_DIR/jks-go_linux_arm_armv7 /usr/local/bin/jks-go; \
    else \
        echo "Unsupported architecture for jks-go: $ARCH"; \
    fi

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production

# 拷贝整个 workspace（包含 node_modules 和所有构建产物）
COPY --from=builder /workspace/ /workspace/

# 兼容旧版挂载路径 /app/data：将服务器运行时的 ./data 软链到 /app/data
RUN mkdir -p /app && \
    ln -sf /app/data /workspace/packages/ui/certd-server/data

WORKDIR /workspace/packages/ui/certd-server
CMD ["node", "--optimize-for-size", "./bootstrap.js"]
