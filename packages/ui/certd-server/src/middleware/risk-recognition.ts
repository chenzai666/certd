import { Inject, Provide } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { cache, logger } from "@certd/basic";
import { SysSafeSetting, SysSettingsService } from "@certd/lib-server";

const RISK_ALERT_TTL = 60 * 60 * 1000;

@Provide()
export class RiskRecognitionMiddleware implements IWebMiddleware {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject("userService")
  userService: any;

  @Inject("emailService")
  emailService: any;

  @Inject("notificationService")
  notificationService: any;

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      // 使用 Koa 已解析的地址，代理信任策略由应用统一控制。
      const ip = ctx.ip || ctx.request.ip || "unknown";
      const userId = ctx.user?.id;
      const setting = await this.sysSettingsService.getSetting<SysSafeSetting>(SysSafeSetting);
      if (setting.ipBlacklist?.includes(ip) && !setting.userWhitelist?.includes(userId)) {
        ctx.status = 403;
        ctx.body = { code: 403, message: "禁止访问" };
        return;
      }

      let riskTitle = "";
      if (ctx.method === "POST" && ctx.path === "/api/pi/pipeline/save") {
        const body = ctx.request.body as any;
        riskTitle = body?.title || "";
        if (!riskTitle && typeof body?.pipeline === "string") {
          try {
            riskTitle = JSON.parse(body.pipeline)?.title || "";
          } catch {
            // 无效流水线交给原业务入口处理。
          }
        }
      }

      await next();
      if (typeof riskTitle === "string" && riskTitle.toLowerCase().includes("probe")) {
        await this.recordRiskPipeline(ctx, userId, ip, riskTitle);
      }
    };
  }

  private async recordRiskPipeline(ctx: IMidwayKoaContext, userId: number | undefined, ip: string, title: string) {
    const recordKey = `risk.pipeline.ip:${ip}`;
    const now = Date.now();
    const records: any[] = (cache.get(recordKey) || []) as any[];
    const recent = records.filter(item => now - item.createdAt < RISK_ALERT_TTL);
    const response = ctx.body as any;
    const request = ctx.request.body as any;
    const pipelineId = Number(response?.data?.id || request?.id) || undefined;
    recent.push({ pipelineId, userId, createdAt: now });
    cache.set(recordKey, recent, { ttl: RISK_ALERT_TTL });

    const recipients = (await this.userService.getAdmins()).map((user: any) => user.email).filter(Boolean);
    const alertKey = `risk.pipeline.alert:${ip}`;
    if (recipients.length === 0 || cache.get(alertKey)) {
      return;
    }
    cache.set(alertKey, true, { ttl: RISK_ALERT_TTL });
    try {
      const url = await this.notificationService.getBindUrl(`#/cert/pipeline/detail?id=${pipelineId || ""}`);
      await this.emailService.send({
        receivers: recipients,
        subject: "可疑的流水线创建请求，请排查",
        content: `用户${userId}创建了一条可疑的流水线「${title}」\n流水线ID：${pipelineId || "暂无"}\n来源IP：${ip}\n\n流水线地址：${url}`,
      });
    } catch (err) {
      cache.delete(alertKey);
      logger.error("发送流水线安全告警邮件失败", err);
    }
  }
}
