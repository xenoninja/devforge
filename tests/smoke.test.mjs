import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const password = process.env.DEVFORGE_PASSWORD ?? "devforge-smoke-password";

test("visitor can log in and manage the Idea Inbox", async () => {
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

  const sessionCookie = cookie.split(";", 1)[0];
  const dashboard = await fetch(baseUrl, {
    headers: { cookie: sessionCookie },
    redirect: "manual",
  });
  assert.equal(dashboard.status, 200);

  const dashboardHtml = await dashboard.text();
  const existingIdeaIds = [...dashboardHtml.matchAll(/data-idea-id="([^"]+)"/g)].map((match) => match[1]);
  for (const id of existingIdeaIds) {
    const response = await fetch(`${baseUrl}/api/ideas`, {
      method: "POST",
      headers: { cookie: sessionCookie },
      body: new URLSearchParams({ action: "discard", id }),
      redirect: "manual",
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/");
  }

  const emptyDashboard = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  assert.match(await emptyDashboard.text(), /Capture your first idea/);

  const missingTitle = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({ action: "capture", title: "  ", notes: "No title" }),
    redirect: "manual",
  });
  assert.equal(missingTitle.status, 400);
  const createIdea = async (title, notes) => {
    const response = await fetch(`${baseUrl}/api/ideas`, {
      method: "POST",
      headers: { cookie: sessionCookie },
      body: new URLSearchParams({ action: "capture", title, notes }),
      redirect: "manual",
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/");
  };

  await createIdea("First smoke idea", "");
  await createIdea("Second smoke idea", "Newer notes");

  const populated = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  const populatedHtml = await populated.text();
  assert.ok(populatedHtml.indexOf("Second smoke idea") < populatedHtml.indexOf("First smoke idea"));
  assert.match(populatedHtml, /Newer notes/);

  const secondIdeaId = populatedHtml.match(
    /<article[^>]*data-idea-id="([^"]+)"[^>]*>[\s\S]*?Second smoke idea[\s\S]*?<\/article>/,
  )?.[1];
  assert.ok(secondIdeaId);

  const edited = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({
      action: "edit",
      id: secondIdeaId,
      title: "Second smoke idea, revised",
      notes: "Notes revised across sittings",
    }),
    redirect: "manual",
  });
  assert.equal(edited.status, 303);

  const revised = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  assert.match(await revised.text(), /Second smoke idea, revised[\s\S]*Notes revised across sittings/);

  const discarded = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({ action: "discard", id: secondIdeaId }),
    redirect: "manual",
  });
  assert.equal(discarded.status, 303);

  const inbox = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  assert.doesNotMatch(await inbox.text(), /Second smoke idea, revised/);

  const archived = await fetch(`${baseUrl}/?view=archived`, {
    headers: { cookie: sessionCookie },
  });
  const archivedHtml = await archived.text();
  assert.match(archivedHtml, /Second smoke idea, revised/);
  assert.match(archivedHtml, /Discarded/);
});
