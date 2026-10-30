import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
test("unit manager history guide describes delivered records in authorized units, while legacy guides and request permissions stay unchanged", async () => {
  const source = await readFile(
    new URL("../public/app.js", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("function sectionGuideInfo(tab)"),
    end = source.indexOf("function guideDismissed(tab)", start);
  assert(start >= 0 && end > start);
  const defaults = {
    history: ["legacy history", "unchanged"],
    requests: ["legacy requests", "unchanged"],
  };
  const context = vm.createContext({
    currentUser: { role: "unit_manager" },
    SECTION_GUIDES: defaults,
  });
  vm.runInContext(source.slice(start, end), context);
  const history = vm.runInContext("sectionGuideInfo('history')", context);
  assert.equal(history[0], "سوابق سفرهای محدوده");
  for (const text of [
    "تحویل‌شده",
    "واحدهای مجاز",
    "نه صرفاً",
    "زیرواحدها",
    "امکان تغییر یا حذف آن‌ها وجود ندارد",
  ])
    assert(history[1].includes(text), text);
  const lines = history[1].split("\n");
  assert.equal(lines.length, 3);
  assert.equal(
    lines[1],
    "سوابق زیرواحدها فقط در صورت قرارگرفتن در محدودهٔ مجاز قابل مشاهده است.",
  );
  assert.equal(
    lines[2],
    "در این بخش فقط می‌توانید سوابق را ببینید؛ امکان تغییر یا حذف آن‌ها وجود ندارد.",
  );
  const css = await readFile(
    new URL("../public/style.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.guide-banner p,\s*\.guide-dialog > p\s*\{\s*white-space: pre-line;/,
  );
  const requests = vm.runInContext("sectionGuideInfo('requests')", context);
  assert(
    requests[1].includes(
      "ایجاد، تأیید، ویرایش، حذف یا تخصیص درخواست مجاز نیست",
    ),
  );
  for (const role of ["admin", "dispatcher", "requester", "driver"]) {
    context.currentUser = { role };
    assert.equal(
      vm.runInContext("sectionGuideInfo('history')", context),
      defaults.history,
    );
    assert.equal(
      vm.runInContext("sectionGuideInfo('requests')", context),
      defaults.requests,
    );
  }
});
