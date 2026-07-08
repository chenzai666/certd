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

# pnpm v11 打包会报错，暂时固定 10.33.4 版本
RUN npm install -g pnpm@10.33.4

# native addon 编译工具（aws-crt 等需要 cmake/g++/python3）
RUN if [ -f /etc/alpine-release ]; then \
        apk add --no-cache python3 make g++ cmake linux-headers; \
    else \
        apt-get update && apt-get install -y --no-install-recommends \
            python3 make g++ cmake && \
        rm -rf /var/lib/apt/lists/*; \
    fi

# 安装所有工作区依赖（仓库无 lockfile，直接 install）
RUN pnpm install

# 构建所有工作区包（除 ui-client，单独处理）
RUN pnpm -r --filter='!@certd/ui-client' run build

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

# 用 pnpm deploy 打出自包含的生产包（自动解析工作区依赖为真实文件）
RUN pnpm --filter=@certd/ui-server deploy --prod /app

# 补充 deploy 不会自动包含的运行时文件
RUN cp -rf /workspace/packages/ui/certd-server/dist      /app/dist
RUN cp -rf /workspace/packages/ui/certd-server/public    /app/public
RUN cp -rf /workspace/packages/ui/certd-server/db        /app/db
RUN cp    /workspace/packages/ui/certd-server/bootstrap.js /app/bootstrap.js

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

WORKDIR /app/

ENV TERM=xterm
ENV LEGO_VERSION=4.30.1
ENV LEGO_DOWNLOAD_DIR=/app/tools/lego

ENV JKS_GO_VERSION=1.0.3
ENV JKS_GO_DOWNLOAD_DIR=/app/tools/jks-go

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

COPY --from=builder /app/ /app/

CMD ["node", "--optimize-for-size", "./bootstrap.js"]
