import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const password = process.env.DEVFORGE_PASSWORD ?? "devforge-smoke-password";

test("visitor can log in, create a Project, and see it on the dashboard", async () => {
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
  assert.equal(rejected.headers.get("set-cookie"), null);

  const accepted = await fetch(`${baseUrl}/api/session`, {
    method: "POST",
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  assert.equal(accepted.status, 303);
  const acceptedLocation = new URL(accepted.headers.get("location"), baseUrl);
  assert.equal(`${acceptedLocation.pathname}${acceptedLocation.search}`, "/");

  const cookie = accepted.headers.get("set-cookie");
  assert.match(cookie ?? "", /^devforge_session=/);
  const sessionCookie = cookie.split(";", 1)[0];

  const dashboard = await fetch(baseUrl, {
    headers: { cookie: sessionCookie },
    redirect: "manual",
  });
  assert.equal(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /Create Project/);

  const name = `Smoke Project ${Date.now()}`;
  const created = await submitForm({
    html: dashboardHtml,
    marker: "Create Project",
    cookie: sessionCookie,
    url: baseUrl,
    fields: {
      name,
      description: "Coarse smoke Project",
      repositoryUrl: "https://example.com/smoke",
      stack: "Next.js",
      lifecycleState: "building",
      objective: "Prove the login-to-dashboard path",
      nextAction: "Open the dashboard",
    },
  });
  assert.equal(created.status, 303);
  assert.match(created.headers.get("location") ?? "", /^\/projects\//);

  const afterCreate = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  assert.equal(afterCreate.status, 200);
  assert.match(await afterCreate.text(), new RegExp(name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

async function submitForm({ html, marker, cookie, url, fields }) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)]
    .map((match) => match[0])
    .find((candidate) => candidate.includes(marker));
  assert.ok(form, `form containing ${marker} not found`);

  const tag = form.match(/^<form\b[^>]*>/i)?.[0] ?? "";
  const action = /action="([^"]*)"/.exec(tag)?.[1] ?? "";
  const body = new FormData();

  for (const input of form.matchAll(/<input\b[^>]*>/gi)) {
    const name = /name="([^"]*)"/.exec(input[0])?.[1];
    if (!name || Object.hasOwn(fields, name)) continue;
    body.set(name, (/value="([^"]*)"/.exec(input[0])?.[1] ?? "").replaceAll("&amp;", "&"));
  }

  for (const [name, value] of Object.entries(fields)) {
    body.set(name, value);
  }

  return fetch(new URL(action || "/", url), {
    method: "POST",
    headers: { cookie },
    body,
    redirect: "manual",
  });
}
