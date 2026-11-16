import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const read = path => readFileSync(path, "utf8");
// Windows App Execution Alias может вести в WSL без /bin/bash.
// Git сам сообщает свой каталог; пользовательский STOCKFLOW_BASH имеет приоритет.
function defaultBash() {
  if (process.platform !== "win32") return "bash";
  const git = spawnSync("git", ["--exec-path"], { encoding: "utf8" });
  if (git.status === 0) {
    const candidate = resolve(git.stdout.trim(), "../../..", "bin/bash.exe");
    if (existsSync(candidate)) return candidate;
  }
  return "bash";
}
const bash = process.env.STOCKFLOW_BASH || defaultBash();

test("Publish запускается только вручную и использует артефакты той же цепочки", () => {
  const dsl = read(".teamcity/settings.kts").split("object Publish :")[1];
  assert.equal([...dsl.matchAll(/\btriggers\s*\{/g)].length, 1);
  const triggers = dsl.split("triggers {")[1].split("    artifactRules")[0];
  assert.equal([...triggers.matchAll(/\bfinishBuildTrigger\s*\{/g)].length, 1);
  assert.match(triggers, /finishBuildTrigger\s*\{\s*enabled\s*=\s*false/);
  assert.doesNotMatch(triggers, /\b(?:vcs|schedule|retryBuild)\s*\{/);
  assert.match(dsl, /buildRule = sameChain\(\)/);
  assert.match(dsl, /checks\/ci-images\.\* => incoming/);
  assert.doesNotMatch(read("scripts/ci/publish.sh"), /docker (?:build|buildx)/);
  assert.match(read("scripts/ci/bundle.sh"), /split-bundle\.sh artifacts/);
});

const checksum = data => createHash("sha256").update(data).digest("hex");
function bundleFixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "stockflow-parts-test-"));
  const unix = dir.replaceAll("\\", "/");
  const execute = (script, env = {}) => spawnSync(bash, [script, unix], {
    encoding: "utf8", timeout: 15000, env: { ...process.env, ...env },
  });
  try {
    // Настоящий tar/gzip, Docker полностью подменён и не запускает daemon.
    writeFileSync(join(dir, "payload"), "verified image bytes".repeat(200));
    const tar = spawnSync(bash, ["-c", 'tar --force-local -czf "$1/ci-images.tar.gz" -C "$1" payload', "test", unix], { encoding: "utf8", timeout: 15000 });
    assert.equal(tar.status, 0, tar.stderr);
    const archive = readFileSync(join(dir, "ci-images.tar.gz"));
    writeFileSync(join(dir, "docker"), '#!/usr/bin/env bash\nset -eu\nprintf "%s\\n" "$1" >> "$DOCKER_CALLS"\ncase "$1" in\nload) cat > "$LOADED_ARCHIVE";;\nimage) printf "%s\\n" "${MOCK_IMAGE_REVISION:-$MOCK_REVISION}";;\n*) exit 99;;\nesac\n', { mode: 0o755 });
    // BASH_ENV задаёт функцию вместо поиска docker.exe в Windows PATH.
    // node:24-bookworm-slim не обязан содержать git: обе внешние зависимости
    // загрузчика подменены только внутри тестового процесса.
    writeFileSync(join(dir, "mock-env"), 'docker() { bash "$MOCK_DOCKER" "$@"; }\ngit() { printf "%s\\n" "$MOCK_REVISION"; }\nexport -f docker git\n');
    const env = { BASH_ENV: `${unix}/mock-env`, MOCK_DOCKER: `${unix}/docker`, DOCKER_CALLS: `${unix}/calls`, LOADED_ARCHIVE: `${unix}/loaded.tar`, MOCK_REVISION: "1".repeat(40) };
    const split = execute("scripts/ci/split-bundle.sh", { STOCKFLOW_BUNDLE_PART_BYTES: "40" });
    assert.equal(split.status, 0, split.stderr);
    const parts = readdirSync(dir).filter(name => name.startsWith("ci-images.tar.gz.part-")).sort();
    assert.ok(parts.length > 1);
    assert.ok(parts.every(name => statSync(join(dir, name)).size <= 40));
    assert.equal(existsSync(join(dir, "ci-images.tar.gz")), false);
    assert.equal(readFileSync(join(dir, "ci-images.sha256"), "utf8").replace(" *ci-images", "  ci-images"), `${checksum(archive)}  ci-images.tar.gz\n`);
    run({ dir, parts, archive, load: (override = {}) => execute("scripts/ci/load-bundle.sh", { ...env, ...override }) });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("Фрагменты восстанавливают исходный архив и загружают те же байты", () => {
  bundleFixture(({ dir, archive, load }) => {
    const result = load();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(dir, "calls"), "utf8"), "load\nimage\nimage\n");
    assert.deepEqual(readFileSync(join(dir, "loaded.tar")), gunzipSync(archive));
    const tar = spawnSync(bash, ["-c", 'tar --force-local -xOf "$1/loaded.tar" payload', "test", dir.replaceAll("\\", "/")], { encoding: "utf8", timeout: 15000 });
    assert.equal(tar.status, 0, tar.stderr);
    assert.equal(tar.stdout, "verified image bytes".repeat(200));
  });
});

test("Загруженные образы с revision другого snapshot отвергаются", () => {
  bundleFixture(({ dir, load }) => {
    const result = load({ MOCK_IMAGE_REVISION: "2".repeat(40) });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(readFileSync(join(dir, "calls"), "utf8"), "load\nimage\n");
  });
});

for (const scenario of ["corrupt", "missing", "extra", "manifest-missing", "traversal", "full-checksum", "invalid-gzip", "invalid-tar", "legacy", "mixed"]) {
  test(`Архив: ${scenario}, проверка до Docker`, () => {
    bundleFixture(({ dir, parts, archive, load }) => {
      if (scenario === "corrupt") writeFileSync(join(dir, parts[1]), "damaged");
      if (scenario === "missing") rmSync(join(dir, parts[1]));
      if (scenario === "extra") writeFileSync(join(dir, "ci-images.tar.gz.part-999999"), "extra");
      if (scenario === "manifest-missing") rmSync(join(dir, "ci-images.parts.sha256"));
      if (scenario === "traversal") writeFileSync(join(dir, "ci-images.parts.sha256"), `${"0".repeat(64)}  ../payload\n`);
      if (scenario === "full-checksum") writeFileSync(join(dir, "ci-images.sha256"), `${"0".repeat(64)}  ci-images.tar.gz\n`);
      if (["invalid-gzip", "invalid-tar", "legacy"].includes(scenario)) {
        for (const part of parts) rmSync(join(dir, part));
        rmSync(join(dir, "ci-images.parts.sha256"));
        const bytes = scenario === "legacy" ? archive : scenario === "invalid-tar" ? gzipSync(Buffer.alloc(10240, 65)) : Buffer.from("not gzip");
        writeFileSync(join(dir, "ci-images.tar.gz"), bytes);
        writeFileSync(join(dir, "ci-images.sha256"), `${checksum(bytes)}  ci-images.tar.gz\n`);
      }
      if (scenario === "mixed") writeFileSync(join(dir, "ci-images.tar.gz"), archive);
      const result = load();
      if (scenario === "legacy") assert.equal(result.status, 0, result.stderr);
      else {
        assert.notEqual(result.status, 0, result.stderr);
        assert.equal(existsSync(join(dir, "calls")), false, "Docker не должен вызываться при повреждении");
      }
    });
  });
}

test("Размер частей нельзя увеличить сверх безопасного лимита", () => {
  const result = spawnSync(bash, ["scripts/ci/split-bundle.sh"], { encoding: "utf8", env: { ...process.env, STOCKFLOW_BUNDLE_PART_BYTES: "300000000" } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /200000000/);
});

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
