import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const password = process.env.DEVFORGE_PASSWORD ?? "devforge-smoke-password";

test("visitor can log in and see the empty dashboard", async () => {
  const anonymous = await fetch(baseUrl, { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  const anonymousLocation = new URL(anonymous.headers.get("location"), baseUrl);
  assert.equal(`${anonymousLocation.pathname}${anonymousLocation.search}`, "/login");

  const rejected = await fetch(`${baseUrl}/api/session`, {
    method: "POST",
    body: new URLSearchParams({ password: `${password}-wrong` }),
    redirect: "manual",
  });
  assert.equal(rejected.status, 303);
  const rejectedLocation = new URL(rejected.headers.get("location"), baseUrl);
  assert.equal(`${rejectedLocation.pathname}${rejectedLocation.search}`, "/login?error=1");
  assert.equal(rejectedLocation.origin, new URL(baseUrl).origin);
  assert.equal(rejected.headers.get("set-cookie"), null);

  const accepted = await fetch(`${baseUrl}/api/session`, {
    method: "POST",
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  assert.equal(accepted.status, 303);
  const acceptedLocation = new URL(accepted.headers.get("location"), baseUrl);
  assert.equal(`${acceptedLocation.pathname}${acceptedLocation.search}`, "/");
  assert.equal(acceptedLocation.origin, new URL(baseUrl).origin);

  const cookie = accepted.headers.get("set-cookie");
  assert.match(cookie ?? "", /^devforge_session=/);
  assert.match(cookie ?? "", /HttpOnly/i);
  assert.match(cookie ?? "", /SameSite=Lax/i);

  const dashboard = await fetch(baseUrl, {
    headers: { cookie: cookie.split(";", 1)[0] },
    redirect: "manual",
  });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Capture your first idea/);
});
