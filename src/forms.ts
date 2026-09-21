import type { IncomingMessage } from 'node:http';
import type { ProjectInput } from './projects.js';

export class FormTooLargeError extends Error {}

export async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  request.setEncoding('utf8');
  let body = '';
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 1_048_576) {
      // Drain the remaining body without destroying the socket needed for the 413 response.
      request.resume();
      throw new FormTooLargeError();
    }
    body += chunk;
  }
  return new URLSearchParams(body);
}

export function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function parseProjectInput(form: URLSearchParams): ProjectInput {
  return {
    title: (form.get('title') ?? '').trim(),
    description: form.get('description') ?? '',
    repository_url: (form.get('repository_url') ?? '').trim(),
  };
}

export function projectInputError(input: ProjectInput): string | undefined {
  if (!input.title) return 'Give your project a title.';
  if (input.repository_url && !isHttpUrl(input.repository_url)) return 'Enter an HTTP or HTTPS repository URL.';
  return undefined;
}
