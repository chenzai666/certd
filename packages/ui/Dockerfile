FROM node:22-alpine AS builder

WORKDIR /workspace/

# Copy workspace config and lockfile
COPY pnpm-workspace.yaml /workspace/
COPY package.json /workspace/
COPY pnpm-lock.yaml /workspace/

# Copy all packages (with pre-built dist/ from CI)
COPY packages/ /workspace/packages/

# Install build tools for native Node.js addons (aws-crt needs cmake/gcc/python)
RUN apk add --no-cache python3 make g++ cmake linux-headers

# Install deps ONLY for server + client (use --filter to avoid installing everything)
RUN npm install -g pnpm@10.33.4 && \
    pnpm install --frozen-lockfile --filter=@certd/ui-server... --filter=@certd/ui-client...

# Copy certd-client dist into certd-server/public
RUN mkdir -p /workspace/packages/ui/certd-server/public && \
    cp -r /workspace/packages/ui/certd-client/dist/* /workspace/packages/ui/certd-server/public/ 2>/dev/null || true

# --- Final stage ---
FROM node:22-alpine

# Install runtime dependencies (openssl needed for certificate operations)
RUN apk add --no-cache openssl

WORKDIR /home/certd/

# Copy production node_modules (contains symlinks to workspace packages)
COPY --from=builder /workspace/node_modules/ ./node_modules/

# Copy ALL workspace packages (needed because node_modules symlinks point here)
COPY --from=builder /workspace/packages/ ./packages/

# Copy certd-client dist into certd-server/public
COPY --from=builder /workspace/packages/ui/certd-client/dist/ ./packages/ui/certd-server/public/

COPY --from=builder /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/package.json ./

# Copy bootstrap.js
COPY --from=builder /workspace/packages/ui/certd-server/bootstrap.js ./packages/ui/certd-server/

ENV NODE_ENV=production

WORKDIR /home/certd/packages/ui/certd-server/

EXPOSE 7001

CMD ["node", "bootstrap.js"]
