import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const read = path => readFileSync(path, "utf8");
const bash = process.env.STOCKFLOW_BASH || "bash";

test("CI: сборки отделены от TEST и Windows localhost", () => {
  const dsl = read(".teamcity/settings.kts");
  const verify = dsl.split("object Verify :")[1].split("object ")[0];
  const publish = dsl.split("object Publish :")[1].split("object ")[0];
  assert.match(verify, /stockflow-build-agent/);
  assert.match(publish, /stockflow-build-agent/);
  assert.doesNotMatch(read("infra/teamcity/compose.agent.yaml"), /18111|network_mode: host/);
  assert.match(read("infra/teamcity/compose.agent.yaml"), /TEAMCITY_SERVER_URL:\?/);
  if (existsSync("compose.ci.yaml")) {
    const acceptance = dsl.split("object Acceptance :")[1].split("object ")[0];
    assert.match(acceptance, /stockflow-test-agent/);
    assert.match(publish, /snapshot\(Acceptance\)/);
    assert.doesNotMatch(read("compose.ci.yaml"), /^\s+build:/m);
    assert.doesNotMatch(read("scripts/ci/integration.sh"), /^[ \t]*(?:docker[ \t]+build\b|"\$\{ci\[@\]\}"[ \t]+build\b)/m);
  }
  if (dsl.includes("object Prod :")) {
    assert.doesNotMatch(dsl.split("object Prod :")[1], /triggers\s*\{/);
  }
});

test("Повреждённый архив отвергается до docker load", () => {
  const dir = mkdtempSync(join(tmpdir(), "stockflow-bundle-test-"));
  try {
    writeFileSync(join(dir, "ci-images.tar.gz"), "corrupted data");
    writeFileSync(join(dir, "ci-images.sha256"), `${"0".repeat(64)}  ci-images.tar.gz\n`);
    const result = spawnSync(bash, ["scripts/ci/load-bundle.sh", dir.replaceAll("\\", "/")], { encoding: "utf8" });
    assert.equal(result.status, 1, result.error?.message || result.stderr);
    assert.match(result.stderr, /Повреждён архив/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Publish отвергает feature без обращения к Docker Hub", () => {
  const result = spawnSync(bash, ["scripts/ci/publish.sh"], {
    encoding: "utf8", env: { ...process.env, CI_BRANCH: "refs/heads/feature/test", IMAGE_REPO: "training/stockflow", DOCKERHUB_USER: "training", DOCKERHUB_TOKEN: "not-a-credential" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Публикация разрешена только dev\/prod/);
});
