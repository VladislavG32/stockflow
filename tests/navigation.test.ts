import assert from "node:assert/strict";
import { test } from "node:test";
import { activeSection } from "../src/lib/navigation";

test("Раздел определяется прокруткой: возврат наверх не сохраняет старые Остатки", () => {
  assert.equal(activeSection([{ id: "main", top: 100 }, { id: "materials", top: 1000 }, { id: "balances", top: 2000 }], 98, false), "main");
  assert.equal(activeSection([{ id: "main", top: -2000 }, { id: "materials", top: -500 }, { id: "balances", top: 96 }], 98, false), "balances");
});

test("Длинный раздел остаётся активным до следующего заголовка, независимо от высоты", () => {
  assert.equal(activeSection([{ id: "main", top: -5000 }, { id: "materials", top: -4000 }, { id: "suppliers", top: 400 }], 98, false), "materials");
});

test("Учитывается мобильный отступ, конец страницы и отсутствие данных", () => {
  const positions = [{ id: "main", top: -1000 }, { id: "balances", top: -100 }, { id: "replenishment", top: 200 }];
  assert.equal(activeSection(positions, 18, true), "replenishment");
  assert.equal(activeSection([{ id: "materials", top: 80 }], 82, false), "materials");
  assert.equal(activeSection([], 98, false), "main");
});
