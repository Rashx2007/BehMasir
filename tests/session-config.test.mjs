import test from "node:test";
import assert from "node:assert/strict";
import { sessionCookieName } from "../backend/session-config.mjs";

test("default cookie name preserves the existing environment contract", () => {
  assert.equal(sessionCookieName({}), "__Host-behmasir");
});

test("test environment can use a distinct host-only secure cookie name", () => {
  const testName = sessionCookieName({
    SESSION_COOKIE_NAME: "__Host-behmasir-upgrade",
  });
  assert.notEqual(testName, sessionCookieName({}));
  assert.equal(testName, "__Host-behmasir-upgrade");
});

test("cookie configuration rejects empty and non-Host names", () => {
  for (const name of ["", "behmasir", "__Secure-behmasir", "__Host-"]) {
    assert.throws(
      () => sessionCookieName({ SESSION_COOKIE_NAME: name }),
      /SESSION_COOKIE_NAME/,
    );
  }
});

test("cookie configuration rejects header injection and oversized names", () => {
  for (const name of [
    "__Host-x; Domain=example.com",
    "__Host-x\r\nSet-Cookie: injected=yes",
    "__Host-x y",
    "__Host-" + "x".repeat(65),
  ]) {
    assert.throws(() => sessionCookieName({ SESSION_COOKIE_NAME: name }));
  }
});
