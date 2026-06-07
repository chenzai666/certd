/*
 * Self-Hosted Edition - @certd/plugin-plus
 * Plus plugin base classes and cloud provider client stubs.
 * NOTE: No imports from workspace packages - this is a standalone stub.
 */

/**
 * AbstractPlusTaskPlugin - self-hosted passthrough.
 * We inline a minimal AbstractTaskPlugin stub so we don't need @certd/pipeline.
 */
export abstract class AbstractPlusTaskPlugin {
  // Minimal stub - real implementation comes from @certd/pipeline at runtime
  // via pnpm workspace resolution. This is only for TypeScript compilation.
}

// ============================================================
// BaseClient: accepts both (http, logger) and ({ http, logger, access })
// ============================================================
class BaseClient {
  http: any;
  logger: any;
  access: any;

  constructor(...args: any[]) {
    if (args.length >= 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
      const opts = args[0] as any;
      this.http = opts.http;
      this.logger = opts.logger;
      this.access = opts.access;
    } else if (args.length >= 2) {
      this.http = args[0];
      this.logger = args[1];
    }
  }

  async request(opts: any): Promise<any> {
    if (this.http) return this.http.request(opts);
    return { data: {} };
  }
}

// ============================================================
// MaoyunClient stub
// ============================================================
export class MaoyunClient extends BaseClient {
  async login(...args: any[]): Promise<any> {
    this.logger?.info?.("[MaoyunClient] login");
    return { token: "self-hosted" };
  }
  async doRequest(opts: any): Promise<any> {
    return this.request({ url: opts?.url || "/api", method: opts?.method || "POST", data: opts?.params || opts?.data || {} });
  }
  async getDomainList(...args: any[]): Promise<any> {
    return { list: [] };
  }
}

// ============================================================
// XinnetClient stub
// ============================================================
export class XinnetClient extends BaseClient {
  async login(...args: any[]): Promise<any> {
    this.logger?.info?.("[XinnetClient] login");
    return { success: true };
  }
  async getDomainList(...args: any[]): Promise<any> {
    return { list: [], totalRows: 0 };
  }
  async getDcpCookie(...args: any[]): Promise<any> {
    return "mock-cookie";
  }
  async addDomainDnsRecord(...args: any[]): Promise<any> {
    return { success: true };
  }
  async deleteDomainDnsRecord(...args: any[]): Promise<any> {
    return { success: true };
  }
  async doRequest(opts: any): Promise<any> {
    return this.request(opts);
  }
}

// ============================================================
// UniCloudClient stub
// ============================================================
export class UniCloudClient extends BaseClient {
  async login(...args: any[]): Promise<any> {
    this.logger?.info?.("[UniCloudClient] login");
    return { token: "self-hosted" };
  }
  async getToken(...args: any[]): Promise<any> {
    return { token: "self-hosted", expiresIn: Date.now() + 86400000 };
  }
  async createCert(...args: any[]): Promise<any> {
    return { success: true, certId: "mock-cert-id" };
  }
  async getSpaceList(...args: any[]): Promise<any[]> {
    return [];
  }
  async doRequest(opts: any): Promise<any> {
    return this.request(opts);
  }
}

// ============================================================
// SynologyClient stub
// ============================================================
export class SynologyClient {
  access: any;
  http: any;
  logger: any;
  skipSslVerify: boolean;

  constructor(access: any, http?: any, logger?: any, skipSslVerify?: boolean) {
    this.access = access;
    this.http = http!;
    this.logger = logger!;
    this.skipSslVerify = skipSslVerify || false;
  }

  async doLogin(...args: any[]): Promise<any> {
    return this.login(...args);
  }
  async login(...args: any[]): Promise<any> {
    this.logger?.info?.("[SynologyClient] login");
    return { sid: "self-hosted-sid", success: true };
  }
  async doLoginWithOTPCode(...args: any[]): Promise<any> {
    return { sid: "self-hosted-sid" };
  }
  async getCertList(...args: any[]): Promise<any> {
    return this.getCertificateList();
  }
  async getCertificateList(...args: any[]): Promise<any[]> {
    return [];
  }
  async updateCertToPanel(...args: any[]): Promise<any> {
    this.logger?.info?.("[SynologyClient] updateCertToPanel");
    return { success: true };
  }
  async doRequest(opts: any): Promise<any> {
    return this.request(opts);
  }
  async request(opts: any): Promise<any> {
    if (this.http) return this.http.request(opts);
    return { data: {}, success: true };
  }
}
