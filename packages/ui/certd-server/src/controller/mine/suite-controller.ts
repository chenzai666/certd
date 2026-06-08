import { Controller, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";

/**
 * Self-hosted suite controller - all features unlimited.
 */
@Provide()
@Controller("/api/mine/suite")
export class SuiteController extends BaseController {
  @Post("/detail", { description: Constants.per.authOnly })
  async detail() {
    return this.ok({
      enabled: false,
      suites: [],
      suiteList: [],
      addonList: [],
      pipelineCount: { max: -1, used: 0 },
      domainCount: { max: -1, used: 0 },
      wildcardDomainCount: { max: -1, used: 0 },
      deployCount: { max: -1, used: 0 },
      monitorCount: { max: -1, used: 0 },
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
