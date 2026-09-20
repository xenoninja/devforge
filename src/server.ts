import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { Projects } from './projects.js';
import { Ideas } from './ideas.js';
import { home, ideaDetail, ideaForm, ideaList, layout, projectForm, projectDetail } from './views.js';

const ideas = new Ideas(process.env.DATA_DIR ?? './data');
const projects = new Projects(process.env.DATA_DIR ?? './data');
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
    } else if (request.method === 'GET' && path === '/projects/new') {
      response.end(projectForm());
    } else if (request.method === 'GET' && /^\/projects\/\d+$/.test(path)) {
      const project = projects.get(Number(path.split('/')[2]));
      if (project) response.end(projectDetail(project));
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
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 1_048_576) {
          response.writeHead(413).end(layout('Too much text', '<h1>Too much text</h1><a href="/">Home</a>'));
          return;
        }
      }
      const form = new URLSearchParams(body);
      const input = { title: (form.get('title') ?? '').trim(), description: form.get('description') ?? '', repository_url: (form.get('repository_url') ?? '').trim() };
      const status = existing?.status ?? form.get('status') ?? 'experimenting';
      if (status !== 'experimenting' && status !== 'developing') {
        response.writeHead(422).end(projectForm('Choose experimenting or developing.', input));
        return;
      }
      if (!input.title) {
        response.writeHead(422).end(projectForm('Give your project a title.', input, status, existing?.id));
        return;
      }
      if (input.repository_url) {
        let valid = false;
        try { valid = ['http:', 'https:'].includes(new URL(input.repository_url).protocol); } catch {}
        if (!valid) {
          response.writeHead(422).end(projectForm('Enter an HTTP or HTTPS repository URL.', input, status, existing?.id));
          return;
        }
      }
      const id = existing?.id ?? projects.create(input, status);
      if (existing) projects.edit(id, input);
      response.writeHead(303, { Location: `/projects/${id}` }).end();
    } else if (request.method === 'GET' && path === '/ideas') {
      const requestedStatus = url.searchParams.get('status');
      const status = requestedStatus === 'new' || requestedStatus === 'abandoned' ? requestedStatus : 'all';
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
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 1_048_576) {
          response.writeHead(413).end(layout('Too much text', '<h1>Too much text</h1><p>Please keep your idea under 1 MB.</p><a href="/ideas/new">Add idea</a>'));
          return;
        }
      }
      const form = new URLSearchParams(body);
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
      if (idea) response.end(ideaDetail(idea));
      else response.writeHead(404).end(layout('Idea not found', '<h1>Idea not found</h1><a href="/">All ideas</a>'));
    } else {
      response.writeHead(404).end(layout('Page not found', '<h1>Page not found</h1><a href="/">All ideas</a>'));
    }
  } catch (error) {
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
  process.on(signal, () => server.close(() => { ideas.close(); projects.close(); }));
}
