/// <reference types="mocha" />
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { OnlinePluginClient } from "./online-plugin-client.js";

class FakeWorker extends EventEmitter {
  terminated = false;
  terminate() {
    this.terminated = true;
    return Promise.resolve(0);
  }
}

describe("OnlinePluginClient", () => {
  const installInfo = { siteId: "site", installTime: 123 };

  it("rejects paths outside the plugin API", async () => {
    const client = new OnlinePluginClient(() => { throw new Error("unexpected worker"); });
    for (const url of ["/activation/subject/register", "/activation/plugin/../subject/register", "https://evil.example/activation/plugin/page"]) {
      await assert.rejects(client.request({ url }, installInfo), /插件接口/);
    }
  });

  it("returns the worker result and terminates it", async () => {
    const worker = new FakeWorker();
    const client = new OnlinePluginClient(() => worker);
    const promise = client.request({ url: "/activation/plugin/page", data: { page: 1 } }, installInfo);
    worker.emit("message", { ok: true, data: { records: [1] } });
    assert.deepEqual(await promise, { records: [1] });
    assert.equal(worker.terminated, true);
  });

  it("terminates on worker error and timeout", async () => {
    const worker = new FakeWorker();
    const client = new OnlinePluginClient(() => worker, 5);
    await assert.rejects(client.request({ url: "/activation/plugin/page" }, installInfo), /超时/);
    assert.equal(worker.terminated, true);
    const failed = new FakeWorker();
    const promise = new OnlinePluginClient(() => failed).request({ url: "/activation/plugin/page" }, installInfo);
    failed.emit("error", new Error("worker failed"));
    await assert.rejects(promise, /worker failed/);
    assert.equal(failed.terminated, true);
  });
});
