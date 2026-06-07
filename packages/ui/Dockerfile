FROM node:22-alpine AS builder

WORKDIR /workspace/

# Copy workspace config and lockfile
COPY pnpm-workspace.yaml /workspace/
COPY package.json /workspace/
COPY pnpm-lock.yaml /workspace/

# Copy all packages (with pre-built dist/ from CI)
COPY packages/ /workspace/packages/

# Install ALL dependencies
RUN npm install -g pnpm@10.33.4 && \
    pnpm install --frozen-lockfile

# Copy certd-client dist into certd-server/public
RUN mkdir -p /workspace/packages/ui/certd-server/public && \
    cp -r /workspace/packages/ui/certd-client/dist/* /workspace/packages/ui/certd-server/public/ 2>/dev/null || true

# Prune devDependencies in each workspace package
RUN cd /workspace && pnpm --filter=@certd/ui-server --filter=@certd/ui-client prune --prod

# --- Final stage ---
FROM node:22-alpine

WORKDIR /home/certd/

# Copy production node_modules and built code from builder
COPY --from=builder /workspace/node_modules/ ./node_modules/
COPY --from=builder /workspace/packages/ui/certd-server/ ./packages/ui/certd-server/
COPY --from=builder /workspace/packages/ui/certd-client/dist/ ./packages/ui/certd-server/public/
COPY --from=builder /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/package.json ./

# Copy bootstrap.js
COPY --from=builder /workspace/packages/ui/certd-server/bootstrap.js ./packages/ui/certd-server/

ENV NODE_ENV=production

WORKDIR /home/certd/packages/ui/certd-server/

EXPOSE 7001

CMD ["node", "bootstrap.js"]
