// Убираем только нестабильные служебные строки pg_dump; DDL сохраняем полностью.
import { readFileSync, writeFileSync } from "node:fs";
const [input, output] = process.argv.slice(2);
writeFileSync(output, readFileSync(input, "utf8").split(/\r?\n/)
  .filter(line => !line.startsWith("--") && !/^\\(un)?restrict /.test(line) && line.trim())
  .join("\n") + "\n");
