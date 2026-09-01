import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const password = process.env.DEVFORGE_PASSWORD ?? "devforge-smoke-password";

test("visitor can manage Ideas and a Project story", async () => {
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

  await createIdea("First smoke idea", "Starting material notes");
  await createIdea("Second smoke idea", "Newer notes");

  const populated = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  const populatedHtml = await populated.text();
  assert.ok(populatedHtml.indexOf("Second smoke idea") < populatedHtml.lastIndexOf("First smoke idea"));
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

  const firstIdeaId = populatedHtml.match(
    /<article[^>]*data-idea-id="([^"]+)"[^>]*>(?:(?!<\/article>)[\s\S])*?First smoke idea/,
  )?.[1];
  assert.ok(firstIdeaId);

  const invalidPromotion = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({ action: "promote", id: firstIdeaId, lifecycleState: "automatic" }),
    redirect: "manual",
  });
  assert.equal(invalidPromotion.status, 400);

  const promoted = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({ action: "promote", id: firstIdeaId, lifecycleState: "exploring" }),
    redirect: "manual",
  });
  assert.equal(promoted.status, 303);
  assert.match(promoted.headers.get("location") ?? "", /^\/projects\/[0-9a-f-]+$/);

  const promotedProject = await fetch(new URL(promoted.headers.get("location"), baseUrl), {
    headers: { cookie: sessionCookie },
  });
  const promotedProjectHtml = await promotedProject.text();
  assert.match(promotedProjectHtml, /First smoke idea/);
  assert.match(promotedProjectHtml, /Starting material notes/);
  assert.match(promotedProjectHtml, /Exploring/);
  assert.match(promotedProjectHtml, /Origin Idea/);
  assert.match(promotedProjectHtml, new RegExp(`\\/\\?view=archived#idea-${firstIdeaId}`));

  const projectLocation = promoted.headers.get("location");
  const projectId = projectLocation?.split("/").at(-1);
  assert.ok(projectId);

  const writeProjectStory = async (fields) => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { cookie: sessionCookie },
      body: new URLSearchParams({ id: projectId, ...fields }),
      redirect: "manual",
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), projectLocation);
  };

  await writeProjectStory({
    action: "create-journal-entry",
    markdown:
      "Built **the parser**.\n\n```js\nconst safe = true;\n```\n\n[Reference](https://example.com)\n\n[Unsafe](javascript:alert('unsafe'))\n\n<script>alert('unsafe')</script>",
  });
  const missingRationale = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({
      action: "create-decision",
      id: projectId,
      decided: "This should not be recorded",
      rationale: "  ",
    }),
    redirect: "manual",
  });
  assert.equal(missingRationale.status, 400);

  await writeProjectStory({
    action: "create-decision",
    decided: "Keep Journal Entries in Markdown",
    rationale: "Portable text keeps the record durable.",
  });
  await writeProjectStory({
    action: "create-journal-entry",
    markdown: "Newest Journal Entry",
  });

  const storyPage = await fetch(new URL(projectLocation, baseUrl), {
    headers: { cookie: sessionCookie },
  });
  const storyHtml = await storyPage.text();
  assert.match(storyHtml, /<strong>the parser<\/strong>/);
  assert.match(storyHtml, /<pre[^>]*><code class="language-js[^"]*">const safe = true;/);
  assert.match(storyHtml, /href="https:\/\/example.com"/);
  assert.doesNotMatch(storyHtml, /<script>alert\('unsafe'\)<\/script>/);
  assert.doesNotMatch(storyHtml, /href="javascript:/);
  assert.match(storyHtml, /Keep Journal Entries in Markdown[\s\S]*Portable text keeps the record durable\./);
  assert.ok(storyHtml.indexOf("Newest Journal Entry") < storyHtml.indexOf("Keep Journal Entries in Markdown"));
  assert.ok(storyHtml.indexOf("Keep Journal Entries in Markdown") < storyHtml.indexOf("Built"));

  const journalEntryIds = [...storyHtml.matchAll(/data-story-type="journal-entry" data-story-id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(journalEntryIds.length, 2);

  await writeProjectStory({
    action: "edit-journal-entry",
    entryId: journalEntryIds[1],
    markdown: "Revised with ~~obsolete wording~~ clearer context.",
  });
  await writeProjectStory({
    action: "delete-journal-entry",
    entryId: journalEntryIds[0],
  });

  const revisedStory = await fetch(new URL(projectLocation, baseUrl), {
    headers: { cookie: sessionCookie },
  });
  const revisedStoryHtml = await revisedStory.text();
  assert.match(revisedStoryHtml, /Revised with/);
  assert.doesNotMatch(revisedStoryHtml, /Newest Journal Entry/);

  await writeProjectStory({
    action: "update-objective",
    objective: "Ship the first usable cockpit",
  });
  await writeProjectStory({
    action: "update-next-action",
    nextAction: "Fix the CI",
  });
  await writeProjectStory({
    action: "update-objective",
    objective: "Prove the daily project workflow",
  });
  await writeProjectStory({
    action: "update-next-action",
    nextAction: "Deploy the cockpit",
  });

  const intentPage = await fetch(new URL(projectLocation, baseUrl), {
    headers: { cookie: sessionCookie },
  });
  const intentHtml = await intentPage.text();
  assert.match(intentHtml, /Objective[\s\S]*Prove the daily project workflow/);
  assert.match(intentHtml, /Next Action[\s\S]*Deploy the cockpit/);
  assert.match(
    intentHtml,
    /data-story-type="journal-entry"[^>]*>[\s\S]*Previous Objective[\s\S]*Ship the first usable cockpit/,
  );
  assert.match(
    intentHtml,
    /data-story-type="journal-entry"[^>]*>[\s\S]*Previous Next Action[\s\S]*Fix the CI/,
  );

  const intentDashboard = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  const intentDashboardHtml = await intentDashboard.text();
  assert.match(intentDashboardHtml, /First smoke idea[\s\S]*Objective[\s\S]*Prove the daily project workflow/);


  const discarded = await fetch(`${baseUrl}/api/ideas`, {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: new URLSearchParams({ action: "discard", id: secondIdeaId }),
    redirect: "manual",
  });
  assert.equal(discarded.status, 303);

  const inbox = await fetch(baseUrl, { headers: { cookie: sessionCookie } });
  const inboxHtml = await inbox.text();
  assert.doesNotMatch(inboxHtml, /Second smoke idea, revised/);
  assert.doesNotMatch(inboxHtml, new RegExp(`data-idea-id="${firstIdeaId}"`));


  const archived = await fetch(`${baseUrl}/?view=archived`, {
    headers: { cookie: sessionCookie },
  });
  const archivedHtml = await archived.text();
  assert.match(archivedHtml, /Second smoke idea, revised/);
  assert.match(archivedHtml, /Discarded/);
  assert.match(archivedHtml, /First smoke idea/);
  assert.match(archivedHtml, /Promoted/);
});
