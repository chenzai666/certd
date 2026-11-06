import { createRequire } from "node:module";
import type { EventEmitter } from "node:events";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { HttpRequestConfig } from "@certd/basic";
import type { SysInstallInfo } from "../../settings/index.js";

type WorkerReply = { ok: true; data: unknown } | { ok: false; error: string };
type WorkerHandle = { once: EventEmitter["once"]; terminate(): Promise<number> };
type WorkerFactory = (installInfo: SysInstallInfo, config: HttpRequestConfig) => WorkerHandle;

// 在隔离线程中使用官方 SDK 的独立模块状态；进程内本地会员模块完全不参与。
const workerSource = `
const { parentPort, workerData } = require("node:worker_threads");
(async () => {
  const sdk = await import(workerData.sdkUrl);
  const quiet = { info() {}, warn() {}, error() {}, debug() {} };
  sdk.setLogger(quiet);
  const client = new sdk.PlusRequestService({
    subjectId: workerData.installInfo.siteId,
    installTime: workerData.installInfo.installTime,
    bindUrl: workerData.installInfo.bindUrl,
    bindUrl2: workerData.installInfo.bindUrl2,
    saveLicense: async () => {},
  });
  client.logger = quiet;
  await client.register();
  const data = await client.request(workerData.config);
  parentPort.postMessage({ ok: true, data });
})().catch(() => parentPort.postMessage({ ok: false, error: "在线插件服务请求失败" }));
`;

function createSdkWorker(installInfo: SysInstallInfo, config: HttpRequestConfig): WorkerHandle {
  const require = createRequire(import.meta.url);
  const sdkUrl = pathToFileURL(require.resolve("@certd/online-plugin-sdk")).href;
  return new Worker(workerSource, {
    eval: true,
    workerData: { sdkUrl, installInfo, config: { url: config.url, data: config.data, method: config.method } },
  });
}

export class OnlinePluginClient {
  constructor(private readonly createWorker: WorkerFactory = createSdkWorker, private readonly timeoutMs = 30000) {}

  async request(config: HttpRequestConfig, installInfo: SysInstallInfo): Promise<unknown> {
    const url = config.url;
    if (typeof url !== "string" || !/^\/activation\/plugin\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(url)) {
      throw new Error("仅允许访问在线插件接口");
    }
    if (!installInfo.siteId || !installInfo.installTime) {
      throw new Error("站点安装信息不完整，无法访问在线插件服务");
    }

    const worker = this.createWorker(installInfo, config);
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("在线插件服务请求超时")), this.timeoutMs);
        worker.once("message", (reply: WorkerReply) => {
          clearTimeout(timeout);
          if ("error" in reply) reject(new Error(reply.error));
          else resolve(reply.data);
        });
        worker.once("error", (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
        worker.once("exit", (code: number) => {
          clearTimeout(timeout);
          reject(new Error(`在线插件服务工作线程退出：${code}`));
        });
      });
    } finally {
      await worker.terminate();
    }
  }
}
