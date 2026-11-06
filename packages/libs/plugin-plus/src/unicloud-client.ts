/**
 * uniCloud 控制台协议适配，参考 @certd/plugin-plus 1.46.0（AGPL-3.0）。
 * 按上游协议使用运行环境提供的控制台签名值，禁止写入日志。
 */
import { constants, createCipheriv, createHmac, publicEncrypt, randomBytes } from "node:crypto";

type UniCloudOptions = {
  access: { email: string; password: string };
  http: { request: (options: any) => Promise<any> };
  logger: any;
};

export class UniCloudClient {
  private opts: UniCloudOptions;
  private deviceId = String(Date.now() + Math.floor(Math.random() * 1_000_000));
  xToken = "";
  token = "";
  cookie = "";

  constructor(opts: UniCloudOptions) {
    this.opts = opts;
  }

  private sign(data: Record<string, any>, secret: string): string {
    const text = Object.keys(data).sort().filter(key => data[key]).map(key => `${key}=${data[key]}`).join("&");
    return createHmac("md5", secret).update(text).digest("hex");
  }

  private clientInfo(appId: string): Record<string, any> {
    const isAccount = appId === "__UNI__uniid_server";
    const version = isAccount ? "4.45" : "4.57";
    return {
      PLATFORM: "web", OS: "windows", APPID: appId, DEVICEID: this.deviceId, scene: 1001, appId,
      appLanguage: "zh-Hans", appName: isAccount ? "账号中心" : "uniCloud控制台", appVersion: "1.0.0", appVersionCode: "100",
      browserName: "chrome", browserVersion: "122.0.6261.95", deviceId: this.deviceId, deviceModel: "PC", deviceType: "pc",
      hostName: "chrome", hostVersion: "122.0.6261.95", osName: "windows", osVersion: "10 x64",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36",
      uniCompilerVersion: version, uniPlatform: "web", uniRuntimeVersion: version, locale: "zh-Hans", LOCALE: "zh-Hans",
    };
  }

  async doRequest(options: any): Promise<any> {
    const response = await this.opts.http.request({ ...options, logParams: false, logData: false, logRes: false, returnOriginRes: true });
    const body = response?.data;
    if (!body || typeof body !== "object") throw new Error("UniCloud 返回了无效响应");
    if (body.ret != null) {
      if (body.ret !== 0) throw new Error("UniCloud 请求失败");
      return body.data;
    }
    if (!body.success || body.data?.errCode) throw new Error("UniCloud 请求失败");
    return body.data;
  }

  private createPasswordEnvelope(challenge: any) {
    if (challenge?.algorithm !== "RSA-OAEP-256+A256GCM") throw new Error("UniCloud 密码加密算法不受支持");
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const metadata = { version: challenge.version, algorithm: challenge.algorithm, keyId: challenge.keyId, challengeId: challenge.challengeId };
    const payload = { action: "login", challengeId: challenge.challengeId, issuedAt: Date.now(), password: this.opts.access.password, email: this.opts.access.email };
    cipher.setAAD(Buffer.from(JSON.stringify(metadata), "utf8"));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    const encryptedKey = publicEncrypt({ key: challenge.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, key);
    return { ...metadata, encryptedKey: encryptedKey.toString("base64"), iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
  }

  async login(): Promise<string> {
    if (this.xToken) return this.xToken;
    const clientInfo = this.clientInfo("__UNI__uniid_server");
    const endpoint = "https://account.dcloud.net.cn";
    const request = async (method: string, params: any[]) => {
      const body = {
        method: "serverless.function.runtime.invoke",
        params: JSON.stringify({ functionTarget: "uni-id-co", functionArgs: { method, params, clientInfo } }),
        spaceId: "uni-id-server", timestamp: Date.now(),
      };
      return this.doRequest({ url: `${endpoint}/client`, method: "POST", data: body, headers: { "X-Serverless-Sign": this.sign(body, "ba461799-fde8-429f-8cc4-4b6d306e2339"), Origin: endpoint, Referer: endpoint } });
    };
    const challenge = await request("createPasswordChallenge", [{ action: "login", resetAppId: "__UNI__unicloud_console", resetUniPlatform: "web" }]);
    const passwordEnvelope = this.createPasswordEnvelope(challenge);
    const result = await request("login", [{ captcha: "", resetAppId: "__UNI__unicloud_console", resetUniPlatform: "web", isReturnToken: false, passwordEnvelope }]);
    if (!result?.newToken?.token) throw new Error("UniCloud 登录响应缺少令牌");
    this.xToken = result.newToken.token;
    return this.xToken;
  }

  private async callConsole(action: string, data: Record<string, any>, token: string, cookie = "") {
    const secret = "4c1f7fbf-c732-42b0-ab10-4634a8bbe834";
    const clientInfo = this.clientInfo("__UNI__unicloud_console");
    const endpoint = "https://unicloud.dcloud.net.cn";
    const body = {
      method: "serverless.function.runtime.invoke",
      params: JSON.stringify({ functionTarget: "uni-cloud-kernel", functionArgs: { action, data, clientInfo, uniIdToken: token } }),
      spaceId: "dc-6nfabcn6ada8d3dd", timestamp: Date.now(),
    };
    return this.doRequest({
      url: `${endpoint}/client`, method: "POST", data: body,
      headers: { "X-Client-Info": encodeURIComponent(JSON.stringify(clientInfo)), "X-Serverless-Sign": this.sign(body, secret), "X-Client-Token": token, Cookie: cookie, Origin: endpoint, Referer: endpoint },
    });
  }

  async getToken(): Promise<{ token: string; cookie: string }> {
    if (this.token) return { token: this.token, cookie: this.cookie };
    const accountToken = await this.login();
    const result = await this.callConsole("user/getUserToken", { isLogin: true }, accountToken);
    const token = result?.data?.data?.token;
    if (!token || !Array.isArray(result.headers?.["set-cookie"])) throw new Error("UniCloud 控制台认证响应无效");
    this.token = token;
    this.cookie = result.headers["set-cookie"].map((entry: string) => entry.split(";", 1)[0]).join(";");
    return { token: this.token, cookie: this.cookie };
  }

  async getDomainList(req: { spaceId: string; provider: string }): Promise<Array<{ domain: string }>> {
    const { token, cookie } = await this.getToken();
    const result = await this.callConsole("proxy/invoke", { method: "get", token, action: "host/domain-list", params: req }, this.xToken, cookie);
    const domains = result?.data?.data?.domains;
    if (!Array.isArray(domains)) throw new Error("UniCloud 域名列表响应无效");
    return domains;
  }

  async createCert(req: { spaceId: string; domain: string; provider: string; cert: { crt: string; key: string } }): Promise<void> {
    const { token, cookie } = await this.getToken();
    const data = { appid: "", provider: req.provider, spaceId: req.spaceId, domain: req.domain, cert: encodeURIComponent(req.cert.crt), key: encodeURIComponent(req.cert.key) };
    await this.doRequest({ url: "https://unicloud-api.dcloud.net.cn/unicloud/api/host/create-domain-with-cert", method: "POST", data, headers: { Token: token, Cookie: cookie } });
  }
}
