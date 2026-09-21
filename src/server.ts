import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { openDatabase } from './database.js';
import { FormTooLargeError, readForm, parseProjectInput, projectInputError, isHttpUrl } from './forms.js';
import { Projects } from './projects.js';
import { Features, isFeatureStatus } from './features.js';
import { Ideas } from './ideas.js';
import { featureForm, featureDetail, home, ideaDetail, ideaForm, ideaList, layout, projectForm, projectDetail, projectList } from './views.js';

const database = openDatabase(process.env.DATA_DIR ?? './data');
const ideas = new Ideas(database);
const projects = new Projects(database);
const features = new Features(database);
const stylesheet = readFileSync(new URL('../public/style.css', import.meta.url));
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (request.method === 'GET' && path === '/style.css') {
      response.setHeader('Content-Type', 'text/css; charset=utf-8');
      response.end(stylesheet);
    } else if (request.method === 'GET' && path === '/') {
      response.end(home(ideas.list('new'), projects.list('experimenting'), projects.list('developing')));
    } else if (request.method === 'POST' && /^\/projects\/\d+\/features\/\d+\/status$/.test(path)) {
      const projectId = Number(path.split('/')[2]);
      const id = Number(path.split('/')[4]);
      if (!projects.get(projectId) || !features.get(projectId, id)) {
        response.writeHead(404).end(layout('Feature not found', '<h1>Feature not found</h1>'));
        return;
      }
      const form = await readForm(request);
      const status = form.get('status');
      if (!isFeatureStatus(status)) {
        response.writeHead(422).end(layout('Invalid status', '<h1>Choose new, developing, completed, or abandoned.</h1>'));
      } else if (!features.changeStatus(projectId, id, status)) {
        response.writeHead(409).end(layout('Cannot change feature status', `<h1>Cannot change feature status</h1><p>The transition must be allowed and the project must be restored before changing feature status.</p><a href="/projects/${projectId}/features/${id}">View feature</a>`));
      } else response.writeHead(303, { Location: `/projects/${projectId}/features/${id}` }).end();
    } else if (/^\/projects\/\d+\/features(?:\/(?:new|\d+(?:\/edit)?))?$/.test(path) && (request.method === 'GET' || request.method === 'POST')) {
      const project = projects.get(Number(path.split('/')[2]));
      if (!project) {
        response.writeHead(404).end(layout('Project not found', '<h1>Project not found</h1>'));
        return;
      }
      const segment = path.split('/')[4];
      const editing = path.endsWith('/edit');
      const existing = editing ? features.get(project.id, Number(segment)) : undefined;
      if (editing && !existing) {
        response.writeHead(404).end(layout('Feature not found', '<h1>Feature not found</h1>'));
        return;
      }
      if (request.method === 'GET' && segment && segment !== 'new' && !editing) {
        const feature = features.get(project.id, Number(segment));
        if (feature) response.end(featureDetail(project, feature));
        else response.writeHead(404).end(layout('Feature not found', '<h1>Feature not found</h1>'));
      } else if ((request.method === 'GET' && segment === 'new') || (request.method === 'POST' && !segment) || editing) {
        if (!editing && project.status === 'abandoned') {
          response.writeHead(409).end(layout('Restore project first', `<h1>Restore this project before adding features.</h1><a href="/projects/${project.id}">Back to project</a>`));
          return;
        }
        if (request.method === 'GET') {
          response.end(featureForm(project, '', existing, existing?.id));
          return;
        }
        const form = await readForm(request);
        const input = { title: (form.get('title') ?? '').trim(), description: form.get('description') ?? '', issue_url: (form.get('issue_url') ?? '').trim() };
        if (!input.title) {
          response.writeHead(422).end(featureForm(project, 'Give your feature a title.', input, existing?.id));
          return;
        }
        if (input.issue_url && !isHttpUrl(input.issue_url)) {
          response.writeHead(422).end(featureForm(project, 'Enter an HTTP or HTTPS issue URL.', input, existing?.id));
          return;
        }
        const id = existing?.id ?? features.create(project.id, input);
        if (existing) features.edit(project.id, existing.id, input);
        if (id === undefined) response.writeHead(409).end(layout('Restore project first', '<h1>Restore this project before adding features.</h1>'));
        else response.writeHead(303, { Location: `/projects/${project.id}/features/${id}` }).end();
      } else response.writeHead(404).end(layout('Page not found', '<h1>Page not found</h1>'));
    } else if (request.method === 'POST' && /^\/projects\/\d+\/status$/.test(path)) {
      const id = Number(path.split('/')[2]);
      if (!projects.get(id)) {
        response.writeHead(404).end(layout('Project not found', '<h1>Project not found</h1>'));
        return;
      }
      const form = await readForm(request);
      const status = form.get('status');
      if (status !== 'experimenting' && status !== 'developing' && status !== 'abandoned') {
        response.writeHead(422).end(layout('Invalid status', `<h1>Choose experimenting, developing, or abandoned.</h1><a href="/projects/${id}">View project</a>`));
      } else if (!projects.changeStatus(id, status)) {
        response.writeHead(409).end(layout('Status already changed', `<h1>Status already changed</h1><a href="/projects/${id}">View project</a>`));
      } else response.writeHead(303, { Location: `/projects/${id}` }).end();
    } else if (request.method === 'GET' && path === '/projects') {
      const requestedStatus = url.searchParams.get('status');
      const status = requestedStatus === 'experimenting' || requestedStatus === 'developing' || requestedStatus === 'abandoned' ? requestedStatus : 'all';
      const search = url.searchParams.get('search') ?? '';
      response.end(projectList(projects.list(status, search), status, search));
    } else if (request.method === 'GET' && path === '/projects/new') {
      response.end(projectForm());
    } else if (request.method === 'GET' && /^\/projects\/\d+$/.test(path)) {
      const project = projects.get(Number(path.split('/')[2]));
      if (project) {
        const requestedStatus = url.searchParams.get('status');
        const status = isFeatureStatus(requestedStatus) ? requestedStatus : 'all';
        const search = url.searchParams.get('search') ?? '';
        response.end(projectDetail(project, features.list(project.id, status, search), status, search));
      }
      else response.writeHead(404).end(layout('Project not found', '<h1>Project not found</h1><a href="/">Home</a>'));
    } else if (request.method === 'GET' && /^\/projects\/\d+\/edit$/.test(path)) {
      const project = projects.get(Number(path.split('/')[2]));
      if (project) response.end(projectForm('', project, project.status, project.id));
      else response.writeHead(404).end(layout('Project not found', '<h1>Project not found</h1><a href="/">Home</a>'));
    } else if (request.method === 'POST' && (path === '/projects' || /^\/projects\/\d+\/edit$/.test(path))) {
      const existing = path === '/projects' ? undefined : projects.get(Number(path.split('/')[2]));
      if (path !== '/projects' && !existing) {
        response.writeHead(404).end(layout('Project not found', '<h1>Project not found</h1><a href="/">Home</a>'));
        return;
      }
      const form = await readForm(request);
      const input = parseProjectInput(form);
      const status = existing?.status ?? form.get('status') ?? 'experimenting';
      if (status !== 'experimenting' && status !== 'developing' && !(existing && status === 'abandoned')) {
        response.writeHead(422).end(projectForm('Choose experimenting or developing.', input));
        return;
      }
      const error = projectInputError(input);
      if (error) {
        response.writeHead(422).end(projectForm(error, input, status, existing?.id));
        return;
      }
      const id = existing?.id ?? projects.create(input, status);
      if (existing) projects.edit(id, input);
      response.writeHead(303, { Location: `/projects/${id}` }).end();
    } else if (request.method === 'GET' && path === '/ideas') {
      const requestedStatus = url.searchParams.get('status');
      const status = requestedStatus === 'new' || requestedStatus === 'abandoned' || requestedStatus === 'promoted' ? requestedStatus : 'all';
      const search = url.searchParams.get('search') ?? '';
      response.end(ideaList(ideas.list(status, search), status, search));
    } else if (request.method === 'POST' && /^\/ideas\/\d+\/(abandon|restore)$/.test(path)) {
      const id = Number(path.split('/')[2]);
      if (!ideas.get(id)) response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1>'));
      else if (!ideas.changeStatus(id, path.endsWith('/restore') ? 'new' : 'abandoned')) {
        response.writeHead(409).end(layout('Status already changed', `<h1>Status already changed</h1><a href="/ideas/${id}">View idea</a>`));
      } else response.writeHead(303, { Location: `/ideas/${id}` }).end();
    } else if (request.method === 'GET' && path === '/ideas/new') {
      response.end(ideaForm());
    } else if (request.method === 'GET' && /^\/ideas\/\d+\/promote$/.test(path)) {
      const idea = ideas.get(Number(path.split('/')[2]));
      if (!idea) response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1>'));
      else if (idea.status !== 'new') {
        response.writeHead(422).end(layout('Only new ideas can be promoted', `<h1>Only new ideas can be promoted</h1><a href="/ideas/${idea.id}">View idea</a>`));
      } else {
        response.end(projectForm('', { title: idea.title, description: idea.description, repository_url: '' }, 'experimenting', undefined, idea.id));
      }
    } else if (request.method === 'POST' && /^\/ideas\/\d+\/promote$/.test(path)) {
      const id = Number(path.split('/')[2]);
      const idea = ideas.get(id);
      if (!idea) {
        response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1>'));
        return;
      }
      if (idea.status === 'promoted') {
        response.writeHead(409).end(layout('Status already changed', `<h1>Status already changed</h1><a href="/ideas/${id}">View idea</a>`));
        return;
      }
      if (idea.status !== 'new') {
        response.writeHead(422).end(layout('Only new ideas can be promoted', `<h1>Only new ideas can be promoted</h1><a href="/ideas/${id}">View idea</a>`));
        return;
      }
      const form = await readForm(request);
      const input = parseProjectInput(form);
      const status = form.get('status') ?? 'experimenting';
      if (status !== 'experimenting' && status !== 'developing') {
        response.writeHead(422).end(projectForm('Choose experimenting or developing.', input, 'experimenting', undefined, id));
        return;
      }
      const error = projectInputError(input);
      if (error) {
        response.writeHead(422).end(projectForm(error, input, status, undefined, id));
        return;
      }
      const projectId = ideas.promote(id, input.title, input.description, input.repository_url, status);
      if (projectId === undefined) {
        response.writeHead(409).end(layout('Status already changed', `<h1>Status already changed</h1><a href="/ideas/${id}">View idea</a>`));
      } else response.writeHead(303, { Location: `/projects/${projectId}` }).end();
    } else if (request.method === 'GET' && /^\/ideas\/\d+\/edit$/.test(path)) {
      const idea = ideas.get(Number(path.split('/')[2]));
      if (idea) response.end(ideaForm('', idea.title, idea.description, idea.id));
      else response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1>'));
    } else if (request.method === 'POST' && (path === '/ideas' || /^\/ideas\/\d+\/edit$/.test(path))) {
      const existing = path === '/ideas' ? undefined : ideas.get(Number(path.split('/')[2]));
      if (path !== '/ideas' && !existing) {
        response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1>'));
        return;
      }
      const form = await readForm(request);
      const title = (form.get('title') ?? '').trim();
      const description = form.get('description') ?? '';
      if (!title) {
        response.writeHead(422).end(ideaForm('Give your idea a title.', title, description, existing?.id));
        return;
      }
      const id = existing?.id ?? ideas.create(title, description);
      if (existing) ideas.edit(id, title, description);
      response.writeHead(303, { Location: `/ideas/${id}` }).end();
    } else if (request.method === 'GET' && /^\/ideas\/\d+$/.test(path)) {
      const idea = ideas.get(Number(path.split('/')[2]));
      if (idea) {
        const project = idea.project_id != null ? projects.get(idea.project_id) : undefined;
        response.end(ideaDetail(idea, project));
      } else response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1><a href="/">All ideas</a>'));
    } else {
      response.writeHead(404).end(layout('Page not found', '<h1>Page not found</h1><a href="/">All ideas</a>'));
    }
  } catch (error) {
    if (error instanceof FormTooLargeError) {
      response.writeHead(413).end(layout('Too much text', '<h1>Too much text</h1><p>Please keep your submission under 1 MB.</p><a href="/">Home</a>'));
      return;
    }
    console.error(error);
    if (!response.headersSent) response.writeHead(500).end(layout('Unable to save', '<h1>Something went wrong</h1><p>Please try again.</p><a href="/">All ideas</a>'));
    else response.end();
  }
});
server.listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(`Listening on http://0.0.0.0:${address.port}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => { database.close(); }));
}
