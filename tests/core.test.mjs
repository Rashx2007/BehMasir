import test from "node:test";
import assert from "node:assert/strict";
import {
  isoDate,
  hhmm,
  withinShift,
  plateKey,
  passwordHash,
  verifyPassword,
  preferences,
  integer,
} from "../backend/core.mjs";
test("valid dates and leap boundaries", () => {
  assert.equal(isoDate("2028-02-29"), "2028-02-29");
  assert.throws(() => isoDate("2027-02-29"));
  assert.throws(() => isoDate("1405/07/23"));
});
test("24 hour clock and midnight shifts", () => {
  assert.equal(hhmm("23:59"), "23:59");
  assert.throws(() => hhmm("24:00"));
  assert(
    withinShift({ shift_start: "22:00:00", shift_end: "06:00:00" }, "01:00"),
  );
  assert(
    !withinShift({ shift_start: "22:00:00", shift_end: "06:00:00" }, "12:00"),
  );
  assert(withinShift({ shift_start: null, shift_end: null }, "12:00"));
});
test("plate normalization and bounded input", () => {
  assert.equal(plateKey("۱۲۳ - الف"), "123الف");
  assert.throws(() => integer(-1));
  assert.throws(() => preferences({ theme: "unexpected" }));
});
test("salted password hashes and password length", async () => {
  const a = await passwordHash("A long unique password 1");
  const b = await passwordHash("A long unique password 1");
  assert.notEqual(a, b);
  assert(await verifyPassword("A long unique password 1", a));
  assert(!(await verifyPassword("incorrect", a)));
  await assert.rejects(() => passwordHash("short"));
});
