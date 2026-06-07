/*
 * Self-Hosted Edition - @certd/commercial-core
 * All enterprise/commercial features unlocked.
 */

import { BaseEntity } from "typeorm";
import { Provide, Inject, Configuration, type IMidwayContainer } from "@midwayjs/core";
import { logger } from "@certd/basic";

// ==================== Configuration ====================

@Configuration({
  namespace: "commercial-core",
})
export class CommercialConfiguration {
  async onReady(_container: IMidwayContainer) {
    logger.info("[self-hosted] commercial-core ready - all features unlocked");
  }
}

// fix: Midway expects the named export "Configuration"
export { CommercialConfiguration as Configuration };

// ==================== Entities ====================

export { CommercialConfiguration as InnerConfiguration };

export class UserSuiteEntity extends BaseEntity {
  id: number;
  userId: number;
  productId: number;
  expiredAt: Date;
  deployCount: number;
  deployCountUsed: number;
  domainCount: number;
  domainCountUsed: number;
  wildcardDomainCount: number;
  wildcardDomainCountUsed: number;
  monitorCount: number;
  monitorCountUsed: number;
  pipelineCount: number;
  pipelineCountUsed: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TradeEntity extends BaseEntity {
  id: number;
  userId: number;
  productId: number;
  amount: number;
  status: string;
  createdAt: Date;
  // additional fields used by payment providers
  title?: string;
  tradeNo?: string;
}

// ==================== Settings ====================

export class SysInviteCommissionSetting {
  static __title__ = "邀请返佣设置";
  static __key__ = "sys.inviteCommission";
  static __access__ = "private";

  enabled: boolean = true;
  levelEnabled: boolean = false;
  fixedCommissionRate: number = 10;
}

// ==================== Types ====================

// `updateTrade` function (called as `await updateTrade({ id, status })`)
// NOTE: do NOT export a type called `UpdateTrade` - it conflicts with the function name
// and causes TypeScript to resolve `updateTrade` as a type (not callable).
export async function updateTrade(opts: any): Promise<void> {
  // self-hosted: no-op
  logger.info("[self-hosted] updateTrade called", opts);
}

// UpdateTradeInfo: used as a type import in payment providers.
// Make it any to avoid type mismatches in self-hosted edition.
// ts-ignore-next-line
export type UpdateTradeInfo = any;

// Keep a minimal UpdateTrade type for code that imports it as a type
export type UpdateTrade = any;

// ==================== Interfaces ====================

export interface IUsedCountService {
  getUsedCount(userId: number): Promise<{
    pipelineCountUsed: number;
    domainCountUsed: number;
    wildcardDomainCountUsed: number;
    monitorCountUsed: number;
  }>;
}

export interface IPaymentProvider {
  createOrder(trade: TradeEntity, opts?: any): Promise<any>;
  payNotify?(trade: TradeEntity): Promise<void>;  // optional: self-hosted stubs may not implement
  refund?(trade: TradeEntity): Promise<void>;      // optional
}

// ==================== Payment Factory ====================

export const paymentProviderFactory = {
  providers: new Map<string, () => Promise<any>>(),
  registerProvider(name: string, factory: () => Promise<any>) {
    this.providers.set(name, factory);
  },
  async getProvider(name: string) {
    const factory = this.providers.get(name);
    if (factory) return factory();
    return null;
  },
};

// ==================== Services ====================

/**
 * UserSuiteService stub - self-hosted unlimited.
 */
@Provide()
export class UserSuiteService {
  async getSuiteSetting() {
    return { enabled: false }; // self-hosted: no need for paid suites
  }

  async getMySuiteDetail(_userId: number) {
    return null; // no suite needed, everything unlimited
  }

  /**
   * Self-hosted: always returns null (unlimited, no deploy count check needed).
   */
  async checkHasDeployCount(_userId: number): Promise<UserSuiteEntity | null> {
    return null; // unlimited
  }

  /**
   * Self-hosted: no-op, unlimited deployments.
   */
  async consumeDeployCount(_suite: UserSuiteEntity | null, _count: number) {
    // unlimited - no need to deduct
  }

  /**
   * Self-hosted: presentGiftSuite - no-op.
   */
  async presentGiftSuite(_userId: number) {
    // no-op in self-hosted
  }
}

/**
 * InviteService stub - self-hosted.
 */
@Provide()
export class InviteService {
  async bindInvitee(_inviter: any, _opts: { inviteeUserId: number; inviteCode: string }) {
    // self-hosted: no-op
  }
}

// ==================== Entities Array ====================

export const commercialEntities = [
  UserSuiteEntity,
  TradeEntity,
];
