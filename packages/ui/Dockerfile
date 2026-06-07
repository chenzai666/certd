FROM node:22-alpine3.21 AS builder

WORKDIR /workspace/

# Copy workspace root files
COPY pnpm-workspace.yaml /workspace/
COPY package.json /workspace/

# Copy all packages (with pre-built dist/ from CI)
COPY packages/ /workspace/packages/

# pnpm v11打包会报错，暂时固定10.33.4版本
RUN npm install -g pnpm@10.33.4

# Install all dependencies (server dist is already pre-built, no TS compile needed)
RUN cd /workspace/packages/ui/certd-server && pnpm install

# Copy pre-built client dist to server public dir
RUN cp /workspace/packages/ui/certd-client/dist/* /workspace/packages/ui/certd-server/public/ -rf

# Prune dev dependencies for production image
RUN cd /workspace/packages/ui/certd-server && pnpm prune --prod


FROM node:22-alpine3.21
EXPOSE 7001
EXPOSE 7002

RUN apk add --no-cache openssl
RUN apk add --no-cache openjdk8
RUN apk add --no-cache gcompat
WORKDIR /app/
COPY --from=builder /workspace/packages/ui/certd-server/ /app/

COPY ./packages/ui/patch/ssh2/*.js /app/node_modules/.pnpm/node_modules/ssh2/lib/protocol/

ENV LEGO_VERSION=4.30.1
ENV LEGO_DOWNLOAD_DIR=/app/tools/lego

ENV ALIYUN_CLIENT_CONNECT_TIMEOUT=10000
ENV ALIYUN_CLIENT_READ_TIMEOUT=20000

RUN mkdir -p $LEGO_DOWNLOAD_DIR

# 根据架构下载不同的文件
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_amd64.tar.gz https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_amd64.tar.gz; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -O $LEGO_DOWNLOAD_DIR/lego_v${LEGO_VERSION}_linux_arm64.tar.gz https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_arm64.tar.gz; \
    else \
        echo "Unsupported architecture: $ARCH"; \
    fi

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV MIDWAY_SERVER_ENV=production
CMD ["node", "--optimize-for-size", "./bootstrap.js"]
