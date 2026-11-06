import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// 固定整合前基线，防止后续上游同步覆盖用户要求保留的实现。
const baseline = "779e316642d109223fc3c29ea11875b63718179c";
const protectedFiles = [
  "packages/libs/plus-core/src/index.ts",
  "packages/libs/commercial-core/src/index.ts",
  "packages/ui/certd-server/src/controller/mine/suite-controller.ts",
];
for (const file of protectedFiles) {
  const original = execFileSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" });
  const current = fs.readFileSync(file, "utf8");
  assert.equal(current.replaceAll("\r\n", "\n"), original.replaceAll("\r\n", "\n"), `${file} 必须保持原样`);
}

const packages = [
  "packages/core/pipeline/package.json",
  "packages/libs/lib-server/package.json",
  "packages/ui/certd-server/package.json",
];
const localPackages = ["@certd/plus-core", "@certd/commercial-core", "@certd/plugin-plus"];
for (const file of packages) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const name of localPackages) {
    if (pkg.dependencies[name]) assert.equal(pkg.dependencies[name], "workspace:*", `${file}: ${name}`);
  }
}

const editor = fs.readFileSync("packages/ui/certd-client/src/components/plugins/cert/domains-verify-plan-editor/index.vue", "utf8");
assert.match(editor, /if \(domainGroupItem\.isIp\)\s*\{\s*type = "http"/);
const apply = fs.readFileSync("packages/ui/certd-server/src/plugins/plugin-cert/plugin/cert-plugin/apply.ts", "utf8");
assert.match(apply, /Google CA 不支持 IP 地址证书/);

// 元数据合并保留上游新增字段，同时禁止恢复旧插件的会员标志。
const metadata = "packages/ui/certd-server/metadata";
const oldFiles = execFileSync("git", ["ls-tree", "-r", "--name-only", baseline, metadata], { encoding: "utf8" }).trim().split("\n");
let preserved = 0;
for (const file of oldFiles) {
  const previous = execFileSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" });
  if (!/^needPlus: false$/m.test(previous)) continue;
  if (!fs.existsSync(file)) continue;
  assert.match(fs.readFileSync(file, "utf8"), /^needPlus: false\r?$/m, `${file} 保留原标志`);
  preserved++;
}
console.log(`整合保护检查通过：${protectedFiles.length} 个受保护文件、${preserved} 个插件、IP 证书与 workspace 依赖。`);
