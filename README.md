# Certd（全功能解锁版）

本仓库是 [certd/certd](https://github.com/certd/certd) 的 Fork，在上游基础上做了以下修改：

- **全功能解锁**：移除了专业版/商业版限制，所有插件和功能免费使用
- **IP 证书支持**：申请证书时可填写 IP 地址，自动选择 HTTP-01 验证方式
- **跟随上游更新**：定期合并上游最新版本，保持功能同步

> 上游项目文档：[certd.docmirror.cn](https://certd.docmirror.cn/guide/)

## 镜像地址

| 镜像仓库 | 地址 |
| --- | --- |
| Docker Hub | `chenzai666/certd:latest` |
| GitHub Packages | `ghcr.io/chenzai666/certd:latest` |

镜像由 GitHub Actions 自动构建，[点击查看构建日志](https://github.com/chenzai666/certd/actions)。

---

## 部署方式

### 方式一：docker-compose（推荐）

**第一步：创建目录并编写配置文件**

```bash
mkdir -p /data/certd
cd /data/certd
```

新建 `docker-compose.yml`，内容如下：

```yaml
services:
  certd:
    image: chenzai666/certd:latest
    # 国内拉取慢可换 ghcr：
    # image: ghcr.io/chenzai666/certd:latest
    container_name: certd
    restart: unless-stopped
    volumes:
      # 数据目录，冒号右侧不要修改
      - /data/certd/data:/app/data
      # 时区同步（可选）
      # - /etc/localtime:/etc/localtime:ro
    ports:
      - "7001:7001"   # Web 管理界面
      # - "7002:7002" # HTTPS 端口（如有需要）
    environment:
      - TZ=Asia/Shanghai
      # 忘记密码时设为 true，重启容器后密码重置为 123456，用完立即改回 false
      - certd_system_resetAdminPasswd=false
      # IPv6 监听改为 ::，IPv4 保持 0.0.0.0
      - certd_koa_hostname=0.0.0.0
```

**第二步：启动服务**

```bash
docker compose up -d
```

**第三步：访问**

浏览器打开 `http://<服务器IP>:7001`，默认账号 `admin`，默认密码 `123456`，**登录后请立即修改密码**。

---

### 方式二：docker run（单命令）

```bash
docker run -d \
  --name certd \
  --restart unless-stopped \
  -p 7001:7001 \
  -v /data/certd/data:/app/data \
  -e TZ=Asia/Shanghai \
  chenzai666/certd:latest
```

---

## Nginx 反向代理（推荐）

不建议直接暴露 7001 端口，推荐在前面加 Nginx 并启用 HTTPS。

```nginx
server {
    listen 443 ssl;
    server_name certd.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 附件上传不限大小
    client_max_body_size 0;

    location / {
        proxy_pass         http://127.0.0.1:7001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 300s;
    }
}

server {
    listen 80;
    server_name certd.example.com;
    return 301 https://$host$request_uri;
}
```

---

## 外部数据库（可选）

默认使用 SQLite，数据存于 `/app/data`，开箱即用。如需对接外部数据库，在 `docker-compose.yml` 的 `environment` 中追加：

**PostgreSQL**

```yaml
environment:
  - certd_flyway_scriptDir=./db/migration-pg
  - certd_typeorm_dataSource_default_type=postgres
  - certd_typeorm_dataSource_default_host=数据库地址
  - certd_typeorm_dataSource_default_port=5432
  - certd_typeorm_dataSource_default_username=postgres
  - certd_typeorm_dataSource_default_password=你的密码
  - certd_typeorm_dataSource_default_database=certd
```

**MySQL / MariaDB**（需提前建库，字符集 `utf8mb4`，排序规则 `utf8mb4_bin`）

```yaml
environment:
  - certd_flyway_scriptDir=./db/migration-mysql
  - certd_typeorm_dataSource_default_type=mysql
  - certd_typeorm_dataSource_default_host=数据库地址
  - certd_typeorm_dataSource_default_port=3306
  - certd_typeorm_dataSource_default_username=root
  - certd_typeorm_dataSource_default_password=你的密码
  - certd_typeorm_dataSource_default_database=certd
```

> 注意：数据库类型一旦选定不支持更换，请提前规划。

---

## 升级

```bash
# 拉取最新镜像
docker pull chenzai666/certd:latest

# 重新创建容器（数据不会丢失）
docker compose up -d --force-recreate
```

或指定版本号：

```bash
# 将 docker-compose.yml 中的 image 改为固定版本，例如：
image: chenzai666/certd:1.42.2
```

---

## IP 证书申请

本 Fork 支持为 IP 地址申请证书（上游已支持底层逻辑，本 Fork 完善了 UI 体验）：

1. **证书域名**填写 IP 地址，例如 `123.123.123.123`
2. **证书颁发机构**选择 `Let's Encrypt`（支持IP证书）或 `ZeroSSL`，不能选 Google
3. **域名验证方式**选择 `HTTP文件验证`（IP证书只能使用此方式）
4. 在验证方案编辑器中，为该 IP 配置好文件上传路径，确保 `http://<IP>/.well-known/acme-challenge/` 公网可访问

---

## 数据备份

数据全部存储在宿主机的数据目录中（默认 `/data/certd/data`），定期备份此目录即可：

```bash
tar -czf certd-backup-$(date +%Y%m%d).tar.gz /data/certd/data
```

---

## DNS 解析异常

如遇 `getaddrinfo EAI_AGAIN` 或 `ENOTFOUND` 错误，在 `docker-compose.yml` 中添加 DNS 配置：

```yaml
services:
  certd:
    dns:
      - 223.5.5.5   # 阿里云公共 DNS
      - 223.6.6.6
```

---

## 常见问题

**忘记管理员密码**

在 `docker-compose.yml` 中将 `certd_system_resetAdminPasswd` 设为 `true`，执行 `docker compose up -d` 重建容器，密码重置为 `123456`，登录后立即改密并将该环境变量改回 `false`。

**上传附件报 413**

Nginx 配置中加 `client_max_body_size 0;`（见上方反向代理配置）。

**时间不准**

挂载宿主机时区文件：

```yaml
volumes:
  - /etc/localtime:/etc/localtime:ro
```

---

## 与上游的差异

| 项目 | 上游 certd/certd | 本 Fork chenzai666/certd |
| --- | --- | --- |
| 专业版功能 | 需付费激活 | 全部解锁 |
| IP 证书 UI | 需手动设置验证类型 | 自动识别 IP 并切换为 HTTP 验证 |
| 镜像源 | Docker Hub `greper/certd` | Docker Hub `chenzai666/certd` |
| 版本同步 | 上游维护 | 定期跟进上游 |

更多功能说明请参考上游文档：[certd.docmirror.cn](https://certd.docmirror.cn/guide/)
