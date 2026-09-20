import type { Idea } from './ideas.js';

function escape(text: string): string {
  return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function layout(title: string, content: string): string {
  return `<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(title)} · Devforge</title><link rel="stylesheet" href="/style.css"></head>
    <body><header><a class="brand" href="/">Devforge<span>Your next idea starts here.</span></a></header>
    <main>${content}</main><footer>A little space for what comes next.</footer></body></html>`;
}

function time(value: string): string {
  return `<time datetime="${escape(value)}">${escape(new Date(value).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }))} UTC</time>`;
}

export function home(ideas: Idea[]): string {
  return layout('Ideas', `<div class="page-heading"><div><p class="eyebrow">Your workspace</p><h1>Ideas</h1>
    <p class="muted">Small sparks. Possibilities worth keeping.</p></div><a class="button" href="/ideas/new">Add idea</a></div>
    <section aria-labelledby="new-ideas"><div class="section-heading"><h2 id="new-ideas">New ideas <span class="count">${ideas.length}</span></h2><span class="muted">Recently updated first</span></div>
    ${ideas.length ? `<ul class="ideas">${ideas.map(idea => `<li><a href="/ideas/${idea.id}">${escape(idea.title)}</a><span class="badge">New</span><p class="muted">Updated ${time(idea.updated_at)}</p></li>`).join('')}</ul>` : '<div class="empty"><div class="spark" aria-hidden="true">✳</div><h3>No ideas yet</h3><p>Have something in mind? Add your first idea and give it a home.</p></div>'}</section>`);
}

export function ideaForm(error = '', title = '', description = ''): string {
  return layout('Add idea', `<a class="back" href="/">← All ideas</a><p class="eyebrow">Make a little room</p><h1>Add an idea</h1><p class="muted">A title is all you need. The details can come later.</p>
    <form method="post" action="/ideas">
    ${error ? `<p class="error" id="title-error" role="alert">${escape(error)}</p>` : ''}
    <label for="title">Title</label><input id="title" name="title" required value="${escape(title)}" ${error ? 'aria-invalid="true" aria-describedby="title-error"' : ''}>
    <label for="description">Description <span class="muted">(optional)</span></label><p class="hint" id="description-hint">Keep a few notes in plain text.</p>
    <textarea id="description" name="description" rows="7" aria-describedby="description-hint">\n${escape(description)}</textarea>
    <div class="actions"><button type="submit">Save idea</button><a href="/">Cancel</a></div></form>`);
}

export function ideaDetail(idea: Idea): string {
  return layout(idea.title, `<a class="back" href="/">← All ideas</a><p class="eyebrow">Idea</p><h1>${escape(idea.title)}</h1><span class="badge">New</span>
    <section class="detail"><h2>Description</h2>${idea.description ? `<p class="description">${escape(idea.description)}</p>` : '<p class="muted">No description yet.</p>'}</section>
    <dl class="timestamps"><div><dt>Created</dt><dd>${time(idea.created_at)}</dd></div><div><dt>Last updated</dt><dd>${time(idea.updated_at)}</dd></div></dl>`);
}
