import { featureTransitions } from './features.js';
import type { Feature, FeatureInput, FeatureStatusFilter } from './features.js';
import type { Project, ProjectInput, ProjectStatusFilter } from './projects.js';
import type { Idea, IdeaStatusFilter } from './ideas.js';

function ideaStatusLabel(status: Idea['status']): string {
  return status === 'new' ? 'New' : status === 'abandoned' ? 'Abandoned' : 'Promoted';
}

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

function ideaCards(ideas: Idea[]): string {
  return `<ul class="ideas">${ideas.map(idea => `<li><a href="/ideas/${idea.id}">${escape(idea.title)}</a><span class="badge">${ideaStatusLabel(idea.status)}</span><p class="muted">Updated ${time(idea.updated_at)}</p></li>`).join('')}</ul>`;
}

export function home(ideas: Idea[], experimenting: Project[], developing: Project[]): string {
  return layout('Home', `<div class="page-heading"><div><p class="eyebrow">Your workspace</p><h1>Ideas &amp; projects</h1>
    <p class="muted">Small sparks. Possibilities worth keeping.</p><div class="actions"><a href="/ideas">Browse all ideas</a><a href="/projects">Browse all projects</a></div></div><div class="actions"><a class="button" href="/ideas/new">Add idea</a><a class="button" href="/projects/new">Add project</a></div></div>
    <section aria-labelledby="new-ideas"><div class="section-heading"><h2 id="new-ideas">New ideas <span class="count">${ideas.length}</span></h2><span class="muted">Recently updated first</span></div>
    ${ideas.length ? ideaCards(ideas) : '<div class="empty"><div class="spark" aria-hidden="true">✳</div><h3>No ideas yet</h3><p>Have something in mind? Add your first idea and give it a home.</p></div>'}</section>${projectSection(experimenting, 'experimenting')}${projectSection(developing, 'developing')}`);
}

export function ideaForm(error = '', title = '', description = '', id?: number): string {
  const editing = id !== undefined;
  return layout(editing ? 'Edit idea' : 'Add idea', `<a class="back" href="/ideas">← All ideas</a><p class="eyebrow">Make a little room</p><h1>${editing ? 'Edit idea' : 'Add an idea'}</h1><p class="muted">A title is all you need. The details can come later.</p>
    <form method="post" action="${editing ? `/ideas/${id}/edit` : '/ideas'}">
    ${error ? `<p class="error" id="title-error" role="alert">${escape(error)}</p>` : ''}
    <label for="title">Title</label><input id="title" name="title" required value="${escape(title)}" ${error ? 'aria-invalid="true" aria-describedby="title-error"' : ''}>
    <label for="description">Description <span class="muted">(optional)</span></label><p class="hint" id="description-hint">Keep a few notes in plain text.</p>
    <textarea id="description" name="description" rows="7" aria-describedby="description-hint">\n${escape(description)}</textarea>
    <div class="actions"><button type="submit">Save idea</button><a href="${editing ? `/ideas/${id}` : '/'}">Cancel</a></div></form>`);
}

export function ideaDetail(idea: Idea, project?: Project): string {
  const statusAction = idea.status === 'promoted' ? '' : `<form method="post" action="/ideas/${idea.id}/${idea.status === 'new' ? 'abandon' : 'restore'}"><button type="submit">${idea.status === 'new' ? 'Abandon idea' : 'Restore idea'}</button></form>`;
  const projectLink = idea.project_id != null
    ? `<section class="detail"><h2>Project</h2><a href="/projects/${idea.project_id}">${escape(project?.title ?? 'View project')}</a></section>`
    : '';
  return layout(idea.title, `<a class="back" href="/ideas">← All ideas</a><p class="eyebrow">Idea</p><h1>${escape(idea.title)}</h1><span class="badge">${ideaStatusLabel(idea.status)}</span>
    <div class="actions"><a class="button" href="/ideas/${idea.id}/edit">Edit idea</a>${idea.status === 'new' ? `<a class="button" href="/ideas/${idea.id}/promote">Promote idea</a>` : ''}</div>
    ${statusAction}${projectLink}
    <section class="detail"><h2>Description</h2>${idea.description ? `<p class="description">${escape(idea.description)}</p>` : '<p class="muted">No description yet.</p>'}</section>
    <dl class="timestamps"><div><dt>Created</dt><dd>${time(idea.created_at)}</dd></div><div><dt>Last updated</dt><dd>${time(idea.updated_at)}</dd></div></dl>`);
}

export function ideaList(ideas: Idea[], status: IdeaStatusFilter, search: string): string {
  return layout('All ideas', `<a class="back" href="/">← Home</a>
    <div class="page-heading"><h1>All ideas</h1><a class="button" href="/ideas/new">Add idea</a></div>
    <form method="get" action="/ideas">
      <label for="status">Status</label><select id="status" name="status">
      ${(['all', 'new', 'abandoned', 'promoted'] as const).map(value => `<option value="${value}" ${value === status ? 'selected' : ''}>${value === 'all' ? 'All statuses' : ideaStatusLabel(value)}</option>`).join('')}</select>
      <label for="search">Search titles</label><input id="search" name="search" type="search" value="${escape(search)}">
      <div class="actions"><button type="submit">Apply filters</button><a href="/ideas">Clear filters</a></div>
    </form><p class="muted">Recently updated first</p>
    ${ideas.length ? ideaCards(ideas) : '<p>No matching ideas.</p>'}`);
}

function projectSection(projects: Project[], status: Project['status']): string {
  const name = status === 'experimenting' ? 'Experimenting' : 'Developing';
  return `<section class="project-section" aria-labelledby="${status}-projects"><div class="section-heading"><h2 id="${status}-projects">${name} projects <span class="count">${projects.length}</span></h2><span class="muted">Recently updated first</span></div>
    ${projects.length ? `<ul class="ideas">${projects.map(project => `<li><a href="/projects/${project.id}">${escape(project.title)}</a><p class="muted">Updated ${time(project.updated_at)}</p></li>`).join('')}</ul>` : `<p>No ${status} projects yet.</p>`}</section>`;
}

export function projectForm(error = '', input: ProjectInput = { title: '', description: '', repository_url: '' }, status: Project['status'] = 'experimenting', id?: number, ideaId?: number): string {
  const editing = id !== undefined;
  const promoting = ideaId !== undefined;
  const title = editing ? 'Edit project' : promoting ? 'Promote idea' : 'Add project';
  const heading = editing ? 'Edit project' : promoting ? 'Promote to a project' : 'Add a project';
  const action = editing ? `/projects/${id}/edit` : promoting ? `/ideas/${ideaId}/promote` : '/projects';
  const cancel = editing ? `/projects/${id}` : promoting ? `/ideas/${ideaId}` : '/';
  return layout(title, `<a class="back" href="${promoting ? `/ideas/${ideaId}` : '/'}">${promoting ? '← Idea' : 'Home'}</a><h1>${heading}</h1>
    <form method="post" action="${action}">
    ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
    <label for="title">Title</label><input id="title" name="title" required value="${escape(input.title)}">
    <label for="description">Description <span class="muted">(optional, plain text)</span></label><textarea id="description" name="description" rows="7">\n${escape(input.description)}</textarea>
    <label for="repository-url">Repository URL <span class="muted">(optional)</span></label><input id="repository-url" name="repository_url" type="url" value="${escape(input.repository_url)}" aria-describedby="repository-hint">
    <p class="hint" id="repository-hint">A manually maintained reference. No GitHub connection is needed.</p>
    ${editing ? '' : `<label for="status">Status</label><select id="status" name="status" aria-describedby="status-hint"><option value="experimenting" ${status === 'experimenting' ? 'selected' : ''}>Experimenting</option><option value="developing" ${status === 'developing' ? 'selected' : ''}>Developing</option></select><p class="hint" id="status-hint">Experimenting verifies an MVP. Developing means an ongoing project you intend to maintain, including between coding sessions.</p>`}
    <div class="actions"><button type="submit">Save project</button><a href="${cancel}">Cancel</a></div></form>`);
}

export function projectDetail(project: Project, features: Feature[] = [], status: FeatureStatusFilter = 'all', search = ''): string {
  return layout(project.title, `<a class="back" href="/">Home</a><a class="back" href="/projects">All projects</a><p class="eyebrow">Project</p><h1>${escape(project.title)}</h1><span class="badge">${project.status === 'experimenting' ? 'Experimenting' : project.status === 'developing' ? 'Developing' : 'Abandoned'}</span>
    <div class="actions"><a class="button" href="/projects/${project.id}/edit">Edit project</a></div>
    <form method="post" action="/projects/${project.id}/status">
      <label for="status">Change status</label><select id="status" name="status">
      ${(['experimenting', 'developing', 'abandoned'] as const).filter(status => status !== project.status).map(status => `<option value="${status}">${status === 'experimenting' ? 'Experimenting' : status === 'developing' ? 'Developing' : 'Abandoned'}</option>`).join('')}</select>
      <div class="actions"><button type="submit">Save status</button></div>
    </form>
    <section class="detail"><h2>Description</h2>${project.description ? `<p class="description">${escape(project.description)}</p>` : '<p class="muted">No description yet.</p>'}</section>
    <section class="detail"><h2>Repository</h2>${project.repository_url ? `<a class="repository" href="${escape(project.repository_url)}" rel="noreferrer">${escape(project.repository_url)}</a>` : '<p class="muted">No repository link yet.</p>'}</section>
    <dl class="timestamps"><div><dt>Created</dt><dd>${time(project.created_at)}</dd></div><div><dt>Last updated</dt><dd>${time(project.updated_at)}</dd></div></dl>${featureList(project, features, status, search)}`);
}

export function projectList(projects: Project[], status: ProjectStatusFilter, search: string): string {
  return layout('All projects', `<a class="back" href="/">← Home</a>
    <div class="page-heading"><h1>All projects</h1><a class="button" href="/projects/new">Add project</a></div>
    <form method="get" action="/projects">
      <label for="status">Status</label><select id="status" name="status">
      ${['all', 'experimenting', 'developing', 'abandoned'].map(value => `<option value="${value}" ${value === status ? 'selected' : ''}>${value === 'all' ? 'All statuses' : value[0]!.toUpperCase() + value.slice(1)}</option>`).join('')}</select>
      <label for="search">Search titles</label><input id="search" name="search" type="search" value="${escape(search)}">
      <div class="actions"><button type="submit">Apply filters</button><a href="/projects">Clear filters</a></div>
    </form><p class="muted">Recently updated first</p>
    ${projects.length ? `<ul class="ideas">${projects.map(project => `<li><a href="/projects/${project.id}">${escape(project.title)}</a><span class="badge">${project.status[0]!.toUpperCase() + project.status.slice(1)}</span><p class="muted">Updated ${time(project.updated_at)}</p></li>`).join('')}</ul>` : '<p>No matching projects.</p>'}`);
}

function featureList(project: Project, features: Feature[], status: FeatureStatusFilter, search: string): string {
  return `<section aria-labelledby="features-heading" class="project-section"><div class="section-heading"><h2 id="features-heading">Features</h2>
    ${project.status === 'abandoned' ? '<p>Restore this project before adding features.</p>' : `<a class="button" href="/projects/${project.id}/features/new">Add feature</a>`}</div>
    <form method="get" action="/projects/${project.id}">
      <label for="feature-status">Feature status</label><select id="feature-status" name="status">${['all', 'new', 'developing', 'completed', 'abandoned'].map(value => `<option value="${value}" ${value === status ? 'selected' : ''}>${value === 'all' ? 'All statuses' : value[0]!.toUpperCase() + value.slice(1)}</option>`).join('')}</select>
      <label for="feature-search">Search feature titles</label><input id="feature-search" name="search" type="search" value="${escape(search)}">
      <div class="actions"><button type="submit">Apply filters</button><a href="/projects/${project.id}">Clear filters</a></div>
    </form><p class="muted">Recently updated first</p>
    ${features.length ? `<ul class="ideas">${features.map(feature => `<li><a href="/projects/${project.id}/features/${feature.id}">${escape(feature.title)}</a><span class="badge">${feature.status[0]!.toUpperCase() + feature.status.slice(1)}</span><p class="muted">Updated ${time(feature.updated_at)}</p></li>`).join('')}</ul>` : '<p>No matching features.</p>'}</section>`;
}

export function featureForm(project: Project, error = '', input: FeatureInput = { title: '', description: '', issue_url: '' }, id?: number): string {
  const editing = id !== undefined;
  const base = `/projects/${project.id}`;
  return layout(editing ? 'Edit feature' : 'Add feature', `<a class="back" href="${base}">Back to project</a><p class="eyebrow">${escape(project.title)}</p><h1>${editing ? 'Edit feature' : 'Add a feature'}</h1>
    <form method="post" action="${base}/features${editing ? `/${id}/edit` : ''}">
    ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
    <label for="title">Title</label><input id="title" name="title" required value="${escape(input.title)}">
    <label for="description">Description <span class="muted">(optional, plain text)</span></label><textarea id="description" name="description" rows="7">\n${escape(input.description)}</textarea>
    <label for="issue-url">Issue URL <span class="muted">(optional)</span></label><input id="issue-url" name="issue_url" type="url" value="${escape(input.issue_url)}" aria-describedby="issue-hint">
    <p class="hint" id="issue-hint">A manually maintained reference. No GitHub connection is needed.</p>
    <div class="actions"><button type="submit">Save feature</button><a href="${base}${editing ? `/features/${id}` : ''}">Cancel</a></div></form>`);
}

export function featureDetail(project: Project, feature: Feature): string {
  return layout(feature.title, `<a class="back" href="/projects/${project.id}">Back to project</a><p class="eyebrow">Feature in ${escape(project.title)}</p><h1>${escape(feature.title)}</h1><span class="badge">${feature.status[0]!.toUpperCase() + feature.status.slice(1)}</span>
    <div class="actions"><a class="button" href="/projects/${project.id}/features/${feature.id}/edit">Edit feature</a></div>
    ${project.status === 'abandoned' ? '<p>Restore this project before changing feature status.</p>' : `<form method="post" action="/projects/${project.id}/features/${feature.id}/status">
      <label for="status">Change status</label><select id="status" name="status">
      ${featureTransitions[feature.status].map(status => `<option value="${status}">${status[0]!.toUpperCase() + status.slice(1)}</option>`).join('')}</select>
      <div class="actions"><button type="submit">Save status</button></div>
    </form>`}
    <section class="detail"><h2>Description</h2>${feature.description ? `<p class="description">${escape(feature.description)}</p>` : '<p class="muted">No description yet.</p>'}</section>
    <section class="detail"><h2>Issue</h2>${feature.issue_url ? `<a class="repository" href="${escape(feature.issue_url)}" rel="noreferrer">${escape(feature.issue_url)}</a>` : '<p class="muted">No issue link yet.</p>'}</section>
    <dl class="timestamps"><div><dt>Created</dt><dd>${time(feature.created_at)}</dd></div><div><dt>Last updated</dt><dd>${time(feature.updated_at)}</dd></div></dl>`);
}
