/*
 * Self-Hosted Edition - @certd/plus-core
 * All VIP/pro features unlocked.
 */
import { http, logger } from "@certd/basic";

export const AppKey = "certd-self-hosted";

/** Always pass - self-hosted edition has all features */
export function checkPlus() {
  // No-op: all features enabled
}

/** Always pass - self-hosted edition has all features */
export function checkComm() {
  // No-op: all features enabled
}

/** Self-hosted edition is always "plus" (VIP) */
export function isPlus(): boolean {
  return true;
}

/** Self-hosted edition is always "commercial" */
export function isComm(): boolean {
  return true;
}

/** Return full VIP info for self-hosted edition */
export function getPlusInfo() {
  return {
    isPlus: true,
    isComm: true,
    vipType: "comm",
    originVipType: "comm", // <-- added
    expireTime: -1, // never expires
    secret: "self-hosted",
    license: "",
    bindUrl: "",
    suiteEnabled: true,
    suiteCount: -1, // unlimited
    subjectId: "self-hosted",
  };
}

/**
 * Simplified PlusRequestService for self-hosted edition.
 * All license checks pass automatically.
 */
export class PlusRequestService {
  subjectId: string;
  _bindUrl: string;
  _bindUrl2: string;
  installTime: number | string;
  saveLicense: any;

  constructor(opts: {
    subjectId: string;
    bindUrl: string;
    bindUrl2: string;
    installTime: number | string;
    saveLicense: (license: string) => Promise<void>;
  }) {
    this.subjectId = opts.subjectId || "self-hosted";
    this._bindUrl = opts.bindUrl || "";
    this._bindUrl2 = opts.bindUrl2 || "";
    this.installTime = opts.installTime || "";
    this.saveLicense = opts.saveLicense;
  }

  async active(_code: string, _inviteCode?: string) {
    return { success: true };
  }

  async updateLicense(_info: { license: string }) {
    // Self-hosted always ok
  }

  async verify(_info: { license: string }) {
    // Self-hosted always ok - no exception thrown
  }

  async bindUrl(_url: string, _url2?: string) {
    return { success: true };
  }

  async register() {
    // Self-hosted always ok
  }

  async requestWithoutSign(opts: { url: string; method: string; data: any }) {
    logger.info("PlusRequestService.requestWithoutSign (self-hosted)", opts.url);
    return { success: true };
  }

  async request(opts: { url: string; data?: any; method?: string }) {
    logger.info("PlusRequestService.request (self-hosted)", opts.url);
    return { success: true, license: "", duration: 0 };
  }

  getSubjectId() {
    return this.subjectId;
  }

  async getAccessToken() {
    return {
      accessToken: "self-hosted-token",
      expiresIn: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    };
  }

  async getOrderCount() {
    return 0;
  }

  getBaseURL() {
    return "http://127.0.0.1:11007";
  }
}
