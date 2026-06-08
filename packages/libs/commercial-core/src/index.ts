/*
 * Self-Hosted Edition - @certd/commercial-core
 * All enterprise/commercial features unlocked.
 */

import { BaseEntity } from "typeorm";
import { Provide, Configuration as MwConfiguration, App } from "@midwayjs/core";

// ==================== Configuration ====================

@MwConfiguration({ namespace: "commercial-core" })
export class CommercialConfiguration {
  @App()
  app: any;

  async onReady(_container: any) {
    // self-hosted: all features unlocked
  }
}

export { CommercialConfiguration as Configuration };
export { CommercialConfiguration as InnerConfiguration };

// ==================== Entities ====================

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
  title?: string;
  tradeNo?: string;
}

// ==================== Settings ====================

export class SysInviteCommissionSetting {
  static __title__ = "邀请返佣设置";
  static __key__ = "sys.inviteCommission";
  static __access__ = "private";

  static getCacheKey() {
    return "settings." + this.__key__;
  }

  enabled: boolean = true;
  levelEnabled: boolean = false;
  fixedCommissionRate: number = 10;
}

// ==================== Types ====================

export async function updateTrade(opts: any): Promise<void> {
  // self-hosted: no-op
}

export type UpdateTradeInfo = any;
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
  payNotify?(trade: TradeEntity): Promise<void>;
  refund?(trade: TradeEntity): Promise<void>;
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
    return { enabled: false };
  }

  async getMySuiteDetail(_userId: number) {
    return null;
  }

  async checkHasDeployCount(_userId: number): Promise<UserSuiteEntity | null> {
    return null;
  }

  async consumeDeployCount(_suite: UserSuiteEntity | null, _count: number) {
    // unlimited
  }

  async presentGiftSuite(_userId: number) {
    // no-op
  }
}

/**
 * InviteService stub - self-hosted.
 */
@Provide()
export class InviteService {
  async bindInvitee(_inviter: any, _opts: { inviteeUserId: number; inviteCode: string }) {
    // no-op
  }
}

// ==================== Entities Array ====================

export const commercialEntities = [
  UserSuiteEntity,
  TradeEntity,
];
