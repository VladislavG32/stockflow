// Ошибка в КОПИИ бизнес-кода, не в тесте и не в основной ветке.
// Один и тот же исходный тест сначала падает, затем проходит после исправления.
import { mkdtempSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const temp = mkdtempSync(join(process.cwd(), ".demo-test-"));
try {
  cpSync("src", join(temp, "src"), { recursive: true });
  cpSync("tests", join(temp, "tests"), { recursive: true });
  const path = join(temp, "src/lib/inventory.ts");
  const correct = readFileSync(path, "utf8");
  writeFileSync(path, correct.replace("balance < minimumStock", "balance <= minimumStock"));
  const run = () => spawnSync(process.execPath, ["--import", "tsx", "--test", join(temp, "tests/inventory.test.ts")], { stdio: "inherit" });
  if (run().status !== 1) throw new Error("Ожидалось падение теста из-за изменённой формулы");
  writeFileSync(path, correct);
  if (run().status !== 0) throw new Error("Исправленный код должен пройти тот же тест");
  console.log("PASS: неверный код обнаружен; исправленный код прошёл тот же тест");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
