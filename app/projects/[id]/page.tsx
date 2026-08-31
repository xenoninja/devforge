import { ArrowLeft, ExternalLink, GitBranch, Rocket, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  getProject,
  lifecycleStateLabel,
  lifecycleStates,
  listProjectStory,
  ProjectInputError,
  type ProjectStoryItem,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let result;
  let story: ProjectStoryItem[] = [];

  try {
    result = await getProject(id);
    if (result) story = await listProjectStory(id);
  } catch (error) {
    if (error instanceof ProjectInputError) notFound();
    throw error;
  }

  if (!result) notFound();

  const { project, changes, originIdea } = result;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-5 sm:px-8">
      <header className="flex h-12 items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Dashboard
        </Link>
        <ThemeToggle />
      </header>

      <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Project</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description}</p>
            </div>
            <span className="rounded-sm border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              {lifecycleStateLabel(project.lifecycleState)}
            </span>
          </div>

          {originIdea ? (
            <div className="border-b border-border py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Origin Idea</p>
              <Link
                href={`/?view=archived#idea-${originIdea.id}`}
                className="mt-2 inline-flex text-sm font-medium underline-offset-4 hover:underline"
              >
                {originIdea.title}
              </Link>
            </div>
          ) : null}

          <dl className="grid gap-6 border-b border-border py-7 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Repository</dt>
              <dd className="mt-2 text-sm">
                {project.repositoryUrl ? (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                  >
                    <GitBranch aria-hidden="true" className="size-4" />
                    {project.repositoryUrl}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Deployed</dt>
              <dd className="mt-2 text-sm">
                {project.deployedUrl ? (
                  <a
                    href={project.deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                  >
                    <Rocket aria-hidden="true" className="size-4" />
                    {project.deployedUrl}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not deployed</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stack</dt>
              <dd className="mt-2 text-sm">{project.stack || <span className="text-muted-foreground">Not set</span>}</dd>
            </div>
          </dl>

          <section className="border-b border-border py-7">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Project story
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Journal & Decisions</h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Newest first
              </span>
            </div>

            {story.length ? (
              <div className="mt-5 divide-y divide-border border-y border-border">
                {story.map((item) =>
                  item.type === "journal-entry" ? (
                    <article
                      key={item.id}
                      data-story-type="journal-entry"
                      data-story-id={item.id}
                      className="py-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <strong className="font-mono text-[10px] uppercase tracking-[0.18em]">
                          Journal Entry
                        </strong>
                        <time className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      <Markdown>{item.markdown}</Markdown>
                      <details className="mt-5 border-t border-dashed border-border pt-4">
                        <summary className="cursor-pointer text-xs font-medium">Edit Journal Entry</summary>
                        <form action="/api/projects" method="post" className="mt-4 space-y-3">
                          <input type="hidden" name="action" value="edit-journal-entry" />
                          <input type="hidden" name="id" value={project.id} />
                          <input type="hidden" name="entryId" value={item.id} />
                          <textarea
                            name="markdown"
                            required
                            rows={8}
                            defaultValue={item.markdown}
                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <Button type="submit" variant="outline">Save Journal Entry</Button>
                        </form>
                      </details>
                      <form action="/api/projects" method="post" className="mt-3">
                        <input type="hidden" name="action" value="delete-journal-entry" />
                        <input type="hidden" name="id" value={project.id} />
                        <input type="hidden" name="entryId" value={item.id} />
                        <Button type="submit" variant="ghost" className="px-0 text-muted-foreground hover:text-foreground">
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Delete Journal Entry
                        </Button>
                      </form>
                    </article>
                  ) : (
                    <article
                      key={item.id}
                      data-story-type="decision"
                      data-story-id={item.id}
                      className="py-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <strong className="font-mono text-[10px] uppercase tracking-[0.18em]">Decision</strong>
                        <time className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      <h3 className="mt-4 text-base font-semibold">{item.decided}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-5 border-y border-border py-6 text-sm text-muted-foreground">
                No Journal Entries or Decisions yet.
              </p>
            )}
          </section>

          <section className="py-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Lifecycle State history</p>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {changes.map((change) => (
                <article key={change.id} className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr_auto] sm:items-baseline">
                  <strong className="text-sm font-medium">{lifecycleStateLabel(change.lifecycleState)}</strong>
                  <p className="text-sm leading-6 text-muted-foreground">{change.note || "No note"}</p>
                  <time className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {formatDate(change.createdAt)}
                  </time>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside>
          <div className="space-y-5 lg:sticky lg:top-10">
            <section className="rounded-md border border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Write</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">New Journal Entry</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Markdown is supported, including links and fenced code.
              </p>
              <form action="/api/projects" method="post" className="mt-5 space-y-4">
                <input type="hidden" name="action" value="create-journal-entry" />
                <input type="hidden" name="id" value={project.id} />
                <label className="block">
                  <span className="text-xs font-medium">Entry</span>
                  <textarea
                    name="markdown"
                    required
                    rows={7}
                    placeholder="What happened?"
                    className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <Button type="submit" className="w-full">Add Journal Entry</Button>
              </form>
            </section>

            <section className="rounded-md border border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Record</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">New Decision</h2>
              <form action="/api/projects" method="post" className="mt-5 space-y-4">
                <input type="hidden" name="action" value="create-decision" />
                <input type="hidden" name="id" value={project.id} />
                <label className="block">
                  <span className="text-xs font-medium">What was decided</span>
                  <textarea
                    name="decided"
                    required
                    rows={3}
                    className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Rationale</span>
                  <textarea
                    name="rationale"
                    required
                    rows={4}
                    placeholder="Why?"
                    className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <Button type="submit" className="w-full">Record Decision</Button>
              </form>
            </section>

            <section className="rounded-md border border-border p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Declare intent</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Change Lifecycle State</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Move freely between states. Add context when the declaration needs it.
              </p>
              <form action="/api/projects" method="post" className="mt-5 space-y-4">
                <input type="hidden" name="action" value="change-lifecycle-state" />
                <input type="hidden" name="id" value={project.id} />
                <label className="block">
                  <span className="text-xs font-medium">Lifecycle State</span>
                  <select
                    name="lifecycleState"
                    defaultValue={project.lifecycleState}
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {lifecycleStates.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium">Note <span className="text-muted-foreground">(optional)</span></span>
                  <textarea
                    name="note"
                    rows={3}
                    placeholder="Why this changed"
                    className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <Button type="submit" className="w-full">Save Lifecycle State</Button>
              </form>
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="mt-4 text-sm leading-7">
      <ReactMarkdown
        components={{
          p: ({ children: content }) => <p className="my-3 first:mt-0 last:mb-0">{content}</p>,
          a: ({ children: content, href }) => (
            <a href={href} className="font-medium underline underline-offset-4">
              {content}
            </a>
          ),
          ul: ({ children: content }) => <ul className="my-3 list-disc space-y-1 pl-5">{content}</ul>,
          ol: ({ children: content }) => <ol className="my-3 list-decimal space-y-1 pl-5">{content}</ol>,
          blockquote: ({ children: content }) => (
            <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground">{content}</blockquote>
          ),
          code: ({ children: content, className }) => (
            <code className={`${className ?? ""} rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs`}>
              {content}
            </code>
          ),
          pre: ({ children: content }) => (
            <pre className="my-4 overflow-x-auto rounded-md border border-border bg-muted p-4">{content}</pre>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
