/// <reference types="mocha" />
import assert from "node:assert/strict";
import { UniCloudClient } from "@certd/plugin-plus";

describe("UniCloudClient", () => {
  it("调用控制台接口并返回域名列表", async () => {
    let call: any;
    const http = { request: async (opts: any) => { call = opts; return { data: { success: true, data: { data: { data: { domains: [{ domain: "a.example.com" }] } } } } }; } };
    const client = new UniCloudClient({ access: { email: "test@example.com", password: "test" }, http: http as any, logger: {} as any });
    client.xToken = "account-token";
    client.token = "cloud-token";
    client.cookie = "cookie=test";
    const result = await client.getDomainList({ provider: "aliyun", spaceId: "space-1" });
    assert.deepEqual(result, [{ domain: "a.example.com" }]);
    const params = JSON.parse(call.data.params);
    assert.equal(params.functionArgs.data.action, "host/domain-list");
    assert.deepEqual(params.functionArgs.data.params, { provider: "aliyun", spaceId: "space-1" });
    assert.equal(call.logParams, false);
    assert.equal(call.logData, false);
    assert.equal(call.logRes, false);
  });

  it("登录遭拒时停止认证", async () => {
    let count = 0;
    const http = { request: async () => { count++; return { data: { ret: 403 } }; } };
    const client = new UniCloudClient({ access: { email: "test@example.com", password: "test" }, http: http as any, logger: {} as any });
    await assert.rejects(client.getToken(), /UniCloud/);
    assert.equal(count, 1);
  });

  it("证书部署接口失败时向上抛错", async () => {
    const http = { request: async () => ({ data: { success: false, error: { message: "failed" } } }) };
    const client = new UniCloudClient({ access: { email: "test@example.com", password: "test" }, http: http as any, logger: {} as any });
    client.token = "cloud-token";
    client.cookie = "cookie=test";
    await assert.rejects(client.createCert({ provider: "aliyun", spaceId: "space-1", domain: "a.example.com", cert: { crt: "test", key: "test" } }), /UniCloud/);
  });
});
