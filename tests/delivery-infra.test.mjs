import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const gitPath = process.platform === "win32" ? spawnSync("git", ["--exec-path"], { encoding: "utf8" }).stdout.trim() : "";
const bash = process.env.STOCKFLOW_BASH || (process.platform === "win32" ? resolve(gitPath, "../../..", "bin/bash.exe") : "bash");
const sha = "1".repeat(40), oldSha = "2".repeat(40);
const oldImage = `sha256:${"3".repeat(64)}`, newImage = `sha256:${"4".repeat(64)}`;
const app = `training/stockflow@sha256:${"5".repeat(64)}`, migrator = `training/stockflow@sha256:${"6".repeat(64)}`;
const read = path => readFileSync(path, "utf8");

function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "stockflow-delivery-"));
  const unix = dir.replaceAll("\\", "/");
  // Все инфраструктурные операции перехватываются только внутри дочернего Bash.
  // Реальные Docker, SSH, БД, публикация и доставка никогда не вызываются.
  const mock = `
bash() { if [[ "$1" == */scripts/ci/preflight.sh ]]; then return 0; else command bash "$@"; fi; }
hostname() { printf '%s\\n' stage-fixture; }
flock() { [[ "\$MODE" != locked ]]; }
sleep() { :; }
git() { if [[ " $* " == *' archive '* ]]; then printf 'archive fixture'; else echo "$RELEASE_SHA_FIXTURE"; fi; }
ssh() { printf '%s\\n' "$*" >> "$FIXTURE/ssh-calls"; cat >/dev/null; }
docker() {
  printf '%s\\n' "$* | APP_IMAGE=\${APP_IMAGE:-}" >> "$FIXTURE/calls"
  if [[ "$1" == compose ]]; then
    shift
    while [[ $# -gt 0 && "$1" != ps && "$1" != up && "$1" != exec && "$1" != config ]]; do shift; done
    case "$1" in
      config) return 0 ;;
      ps) if [[ "\${*: -1}" == db ]]; then echo db-id; else echo app-id; fi ;;
      up)
        if [[ "\$APP_IMAGE" == "$OLD_IMAGE" ]]; then echo "$OLD_IMAGE" > "$FIXTURE/running";
        else echo "$NEW_IMAGE" > "$FIXTURE/running"; fi
        [[ "$MODE" != up-fail || "\$APP_IMAGE" == "$OLD_IMAGE" ]] ;;
      exec)
        [[ "$MODE" != rollback-fail ]] || return 1
        [[ "$MODE" != readiness-fail && "$MODE" != up-fail || "$(cat "$FIXTURE/running")" == "$OLD_IMAGE" ]] ;;
      *) return 99 ;;
    esac
  elif [[ "$1" == pull ]]; then
    [[ "$MODE" != pull-fail ]]
  elif [[ "$1" == inspect ]]; then
    if [[ "$2" == db-id ]]; then
      if [[ "$MODE" == wrong-volume ]]; then echo wrong; else echo pg-existing; fi
    else cat "$FIXTURE/running"; fi
  elif [[ "$1 $2" == 'image inspect' ]]; then
    if [[ "\${*: -1}" == '{{.Id}}' ]]; then
      if [[ "$3" == "$OLD_IMAGE" ]]; then echo "$OLD_IMAGE"; else echo "$NEW_IMAGE"; fi
    elif [[ "$3" == "$OLD_IMAGE" ]]; then echo "$OLD_SHA";
    elif [[ "$MODE" == wrong-revision ]]; then echo "$OLD_SHA";
    else echo "$RELEASE_SHA_FIXTURE"; fi
  else return 99; fi
}
export -f bash hostname flock sleep docker git ssh
`;
  try {
    writeFileSync(join(dir, "mock-env"), mock);
    writeFileSync(join(dir, "compose.yaml"), "# mock only\n");
    writeFileSync(join(dir, ".env"), "# no credentials\n");
    writeFileSync(join(dir, "running"), oldImage + "\n");
    // cygpath handles Windows temp paths; Linux uses unchanged POSIX paths.
    const mapped = spawnSync(bash, ["-c", 'if command -v cygpath >/dev/null; then cygpath -u "$1"; else printf "%s" "$1"; fi', "test", unix], { encoding: "utf8" });
    assert.equal(mapped.status, 0, mapped.stderr);
    const posix = mapped.stdout.trim();
    writeFileSync(join(dir, "target.env"), `TARGET=stage\nTARGET_HOST=stage-fixture\nDEPLOY_DIR='${posix}'\nPROJECT=existing-project\nEXPECTED_DB_VOLUME=pg-existing\n`);
    const execute = (script, args = [], overrides = {}) => spawnSync(bash, [script, ...args], {
      encoding: "utf8", timeout: 15000,
      env: { ...process.env, BASH_ENV: `${unix}/mock-env`, FIXTURE: posix, STOCKFLOW_CONFIG_DIR: posix, OLD_IMAGE: oldImage, NEW_IMAGE: newImage, OLD_SHA: oldSha, RELEASE_SHA_FIXTURE: sha, MODE: "ok", ...overrides },
    });
    run({ dir, posix, execute, deploy: mode => execute("scripts/ops/deploy.sh", ["stage", app, migrator, sha], { MODE: mode }) });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("Stage: DEV, TEST-agent, та же цепочка Publish, автостарт отключён", () => {
  const dsl = read(".teamcity/settings.kts").split("object Stage :")[1].split("object ")[0];
  assert.match(dsl, /snapshot\(Publish\)/);
  assert.match(dsl, /buildRule = sameChain\(\)/);
  assert.match(dsl, /release.env => incoming/);
  assert.match(dsl, /stockflow-test-agent/);
  assert.match(dsl, /finishBuildTrigger \{ enabled = false/);
  assert.doesNotMatch(dsl, /\+:prod/);
});

test("Все shell-скрипты проходят bash -n", () => {
  for (const folder of ["scripts/ci", "scripts/ops"]) {
    for (const file of readdirSync(folder).filter(x => x.endsWith(".sh"))) {
      const result = spawnSync(bash, ["-n", `${folder}/${file}`], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
  }
});

test("Успешная доставка меняет только app, фиксирует digest и исходный образ", () => fixture(({ dir, deploy }) => {
  const result = deploy("ok");
  assert.equal(result.status, 0, result.stderr);
  assert.match(read(join(dir, "state/current.env")), new RegExp(`APP_IMAGE=${app}`));
  assert.match(read(join(dir, "state/previous.env")), new RegExp(`APP_IMAGE=${oldImage}`));
  const calls = read(join(dir, "calls"));
  assert.equal(calls.split("\n").filter(x => x.includes(" up ")).length, 1);
  assert.match(calls, /up -d --no-deps --no-build --pull never app/);
  assert.doesNotMatch(calls, /(?:^| )(?:down|build|prune|rm)(?: |$)|exec -T db|up .*\bdb\b/m);
}));

for (const mode of ["wrong-volume", "wrong-revision", "pull-fail", "locked"]) {
  test(`Доставка ${mode}: отказ до изменения приложения`, () => fixture(({ dir, deploy }) => {
    const result = deploy(mode);
    assert.notEqual(result.status, 0, result.stderr);
    assert.doesNotMatch(existsSync(join(dir, "calls")) ? read(join(dir, "calls")) : "", / up /);
    assert.equal(existsSync(join(dir, "state/current.env")), false);
  }));
}

for (const mode of ["readiness-fail", "up-fail", "rollback-fail"]) {
  test(`Доставка ${mode}: возврат старого app и проверка rollback`, () => fixture(({ dir, deploy }) => {
    mkdirSync(join(dir, "state"));
    writeFileSync(join(dir, "state/current.env"), "previous verified state\n");
    const result = deploy(mode);
    assert.equal(result.status, mode === "rollback-fail" ? 2 : 1, result.stderr);
    assert.equal(read(join(dir, "running")).trim(), oldImage);
    assert.equal(read(join(dir, "state/current.env")), "previous verified state\n");
    assert.match(result.stderr, mode === "rollback-fail" ? /ОШИБКА ROLLBACK/ : /Rollback проверен/);
  }));
}

test("Ручной rollback восстанавливает образ, readiness и current.env", () => fixture(({ dir, deploy, execute }) => {
  assert.equal(deploy("ok").status, 0);
  const result = execute("scripts/ops/rollback-app.sh");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(join(dir, "running")).trim(), oldImage);
  assert.equal(read(join(dir, "state/current.env")), `APP_IMAGE=${oldImage}\nRELEASE_SHA=${oldSha}\n`);
}));

test("Неверные digest/аргументы deploy отвергаются до Docker", () => fixture(({ dir, execute }) => {
  for (const args of [["stage", "repo:latest", migrator, sha], ["prod", app, migrator, sha], ["stage"], ["stage", app, migrator, "invalid"]]) {
    assert.notEqual(execute("scripts/ops/deploy.sh", args).status, 0);
    assert.equal(existsSync(join(dir, "calls")), false);
  }
}));

test("Обязательные target.env переменные проверяются до Docker", () => fixture(({ dir, deploy }) => {
  const original = read(join(dir, "target.env"));
  for (const key of ["DEPLOY_DIR", "PROJECT", "TARGET", "TARGET_HOST", "EXPECTED_DB_VOLUME"]) {
    writeFileSync(join(dir, "target.env"), original.replace(new RegExp(`^${key}=.*\\n`, "m"), ""));
    assert.notEqual(deploy("ok").status, 0);
    assert.equal(existsSync(join(dir, "calls")), false);
  }
}));

test("release.env: корректный манифест принимается, некорректные и shell-код отвергаются", () => fixture(({ dir, posix, execute }) => {
  const valid = `APP_IMAGE=${app}\nMIGRATOR_IMAGE=${migrator}\nRELEASE_SHA=${sha}\n`;
  const inputs = [valid, valid.replace(app, "training/stockflow:latest"), valid.replace(sha, "bad"), valid + `APP_IMAGE=${app}\n`, valid + "UNKNOWN=value\n", valid.replace(migrator, `other/repo@sha256:${"7".repeat(64)}`), valid.replace(app, `$(touch '${posix}/executed')`)];
  for (const [index, content] of inputs.entries()) {
    writeFileSync(join(dir, "release.env"), content);
    const result = execute("-c", ['source scripts/ci/release-lib.sh; read_release "$FIXTURE/release.env"']);
    assert.equal(result.status === 0, index === 0, result.stderr);
    assert.equal(existsSync(join(dir, "executed")), false);
  }
}));

test("Deliver требует DEV и CI_BRANCH до обращения к SSH", () => fixture(({ execute }) => {
  for (const branch of ["", "feature/lab5-zero-stock", "prod"]) {
    const result = execute("scripts/ci/deliver.sh", ["stage"], { CI_BRANCH: branch });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /CI_BRANCH|только из dev/);
  }
}));

test("Deliver связывает release с checkout и передаёт только проверенные digest через SSH", () => fixture(({ dir, posix, execute }) => {
  mkdirSync(join(dir, "scripts/ci"), { recursive: true });
  mkdirSync(join(dir, "incoming"));
  for (const file of ["deliver.sh", "release-lib.sh"]) copyFileSync(`scripts/ci/${file}`, join(dir, `scripts/ci/${file}`));
  const file = join(dir, "incoming/release.env");
  writeFileSync(file, `APP_IMAGE=${app}\nMIGRATOR_IMAGE=${migrator}\nRELEASE_SHA=${oldSha}\n`);
  const wrong = execute(`${posix}/scripts/ci/deliver.sh`, ["stage"], { CI_BRANCH: "dev" });
  assert.notEqual(wrong.status, 0);
  assert.match(wrong.stderr, /другого snapshot/);
  assert.equal(existsSync(join(dir, "ssh-calls")), false);
  writeFileSync(file, `APP_IMAGE=${app}\nMIGRATOR_IMAGE=${migrator}\nRELEASE_SHA=${sha}\n`);
  const result = execute(`${posix}/scripts/ci/deliver.sh`, ["stage"], { CI_BRANCH: "dev" });
  assert.equal(result.status, 0, result.stderr);
  const calls = read(join(dir, "ssh-calls"));
  assert.equal(calls.trim().split("\n").length, 3);
  assert.match(calls, /StrictHostKeyChecking=yes/);
  assert.ok(calls.includes(`deploy.sh stage '${app}' '${migrator}' '${sha}'`));
}));
