import { Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { MyCountService } from "../../modules/suite/service/my-count-service.js";

/**
 * Self-hosted suite controller - all features unlimited.
 */
@Provide()
@Controller("/api/mine/suite")
export class SuiteController extends BaseController {
  @Inject()
  myCountService: MyCountService;

  @Post("/detail", { description: Constants.per.authOnly })
  async detail() {
    const userId = this.ctx.userInfo?.id;
    let used = { pipelineCountUsed: 0, domainCountUsed: 0, wildcardDomainCountUsed: 0, monitorCountUsed: 0 };
    if (userId) {
      used = await this.myCountService.getUsedCount(userId);
    }
    return this.ok({
      enabled: false,
      suites: [],
      suiteList: [],
      addonList: [],
      pipelineCount: { max: -1, used: used.pipelineCountUsed },
      domainCount: { max: -1, used: used.domainCountUsed },
      wildcardDomainCount: { max: -1, used: used.wildcardDomainCountUsed },
      deployCount: { max: -1, used: 0 },
      monitorCount: { max: -1, used: used.monitorCountUsed },
    });
  }

  @Post("/page", { description: Constants.per.authOnly })
  async page() {
    return this.ok({ list: [], total: 0 });
  }

  @Post("/add", { description: Constants.per.authOnly })
  async add() {
    return this.ok({ id: 0 });
  }

  @Post("/update", { description: Constants.per.authOnly })
  async update() {
    return this.ok({ success: true });
  }

  @Post("/delete", { description: Constants.per.authOnly })
  async delete() {
    return this.ok({ success: true });
  }

  @Post("/info", { description: Constants.per.authOnly })
  async info() {
    return this.ok(null);
  }

  @Post("/all", { description: Constants.per.authOnly })
  async all() {
    return this.ok({ list: [] });
  }
}
