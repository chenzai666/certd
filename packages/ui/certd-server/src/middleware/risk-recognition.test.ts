/// <reference types="mocha" />
import assert from "node:assert/strict";
import { RiskRecognitionMiddleware } from "./risk-recognition.js";

describe("RiskRecognitionMiddleware", () => {
  function setup(setting: { ipBlacklist?: string[]; userWhitelist?: number[] }) {
    const middleware = new RiskRecognitionMiddleware();
    middleware.sysSettingsService = { getSetting: async () => setting } as any;
    middleware.userService = { getAdmins: async () => [] } as any;
    middleware.emailService = { send: async () => undefined } as any;
    middleware.notificationService = { getBindUrl: async () => "" } as any;
    return middleware.resolve();
  }

  function context(ip: string, userId?: number) {
    return {
      ip,
      user: userId == null ? undefined : { id: userId },
      method: "GET",
      path: "/api/example",
      request: { ip, body: {} },
    } as any;
  }

  it("allows requests when the blacklist is empty", async () => {
    let nextCalled = false;
    await setup({ ipBlacklist: [], userWhitelist: [] })(context("192.0.2.1"), async () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it("blocks a listed IP and does not execute the next handler", async () => {
    const ctx = context("192.0.2.1");
    let nextCalled = false;
    await setup({ ipBlacklist: ["192.0.2.1"], userWhitelist: [] })(ctx, async () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(ctx.status, 403);
    assert.deepEqual(ctx.body, { code: 403, message: "禁止访问" });
  });

  it("allows an authenticated whitelisted user from a listed IP", async () => {
    let nextCalled = false;
    await setup({ ipBlacklist: ["192.0.2.1"], userWhitelist: [7] })(context("192.0.2.1", 7), async () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it("does not treat an unlisted or anonymous user as whitelisted", async () => {
    for (const userId of [undefined, 8]) {
      const ctx = context("192.0.2.1", userId);
      await setup({ ipBlacklist: ["192.0.2.1"], userWhitelist: [7] })(ctx, async () => assert.fail("应当拒绝"));
      assert.equal(ctx.status, 403);
    }
  });

  it("uses the framework-resolved IP rather than request headers", async () => {
    const ctx = context("192.0.2.1");
    ctx.headers = { "x-forwarded-for": "192.0.2.2" };
    await setup({ ipBlacklist: ["192.0.2.1"] })(ctx, async () => assert.fail("应当拒绝"));
    assert.equal(ctx.status, 403);
  });

  it("does not parse unrelated request bodies as pipeline JSON", async () => {
    const ctx = context("192.0.2.1");
    ctx.request.body = { pipeline: "not-json" };
    let nextCalled = false;
    await setup({})(ctx, async () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it("alerts administrators for a pipeline title containing probe", async () => {
    const middleware = new RiskRecognitionMiddleware();
    middleware.sysSettingsService = { getSetting: async () => ({}) } as any;
    middleware.userService = { getAdmins: async () => [{ email: "admin@example.com" }] } as any;
    let mail: any;
    middleware.emailService = { send: async (value: any) => { mail = value; } } as any;
    middleware.notificationService = { getBindUrl: async (path: string) => path } as any;
    const ctx = context("192.0.2.91", 7);
    ctx.method = "POST";
    ctx.path = "/api/pi/pipeline/save";
    ctx.request.body = { pipeline: JSON.stringify({ title: "My Probe" }) };
    await middleware.resolve()(ctx, async () => { ctx.body = { data: { id: 123 } }; });
    assert.deepEqual(mail.receivers, ["admin@example.com"]);
    assert.match(mail.content, /My Probe/);
    assert.match(mail.content, /123/);
  });

  it("preserves a successful save when looking up alert recipients fails", async () => {
    const middleware = new RiskRecognitionMiddleware();
    middleware.sysSettingsService = { getSetting: async () => ({}) } as any;
    middleware.userService = { getAdmins: async () => { throw new Error("查询失败"); } } as any;
    const ctx = context("192.0.2.92", 7);
    ctx.method = "POST";
    ctx.path = "/api/pi/pipeline/save";
    ctx.request.body = { title: "Probe" };
    await middleware.resolve()(ctx, async () => { ctx.body = { code: 0, data: { id: 124 } }; });
    assert.deepEqual(ctx.body, { code: 0, data: { id: 124 } });
  });
});
