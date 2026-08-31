import { Archive, ExternalLink, FolderGit2, Inbox, Lightbulb, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { listIdeas, type IdeaView } from "@/lib/ideas";
import { lifecycleStateLabel, lifecycleStates, listProjects, type Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view: IdeaView = (await searchParams).view === "archived" ? "archived" : "inbox";
  const [ideas, projects] = await Promise.all([listIdeas(view), listProjects()]);
  const building = projects.filter((project) => project.lifecycleState === "building");
  const exploring = projects.filter((project) => project.lifecycleState === "exploring");
  const releasedOrMaintenance = projects.filter(
    (project) => project.lifecycleState === "released" || project.lifecycleState === "maintenance",
  );
  const shelved = projects.filter((project) => project.lifecycleState === "shelved");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-5 sm:px-8">
      <header className="flex h-12 items-center justify-between border-b border-border">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold tracking-tight">DevForge</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cockpit</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid gap-10 py-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
        <aside>
          <div className="lg:sticky lg:top-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">New Project</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Start tracking the work.</h1>
            <form action="/api/projects" method="post" className="mt-5 space-y-3">
              <input type="hidden" name="action" value="create" />
              <label className="block">
                <span className="sr-only">Project name</span>
                <input
                  autoFocus
                  required
                  name="name"
                  placeholder="Project name"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="sr-only">Project description</span>
                <textarea
                  required
                  name="description"
                  placeholder="What is this Project?"
                  rows={3}
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="sr-only">Repository URL</span>
                <input
                  required
                  type="url"
                  name="repositoryUrl"
                  placeholder="https://github.com/…"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="sr-only">Deployed URL (optional)</span>
                <input
                  type="url"
                  name="deployedUrl"
                  placeholder="Deployed URL (optional)"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="sr-only">Stack</span>
                <input
                  required
                  name="stack"
                  placeholder="Stack · Next.js, Postgres"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Lifecycle State</span>
                <select
                  required
                  name="lifecycleState"
                  defaultValue="exploring"
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
                <span className="sr-only">Lifecycle State note (optional)</span>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Lifecycle State note (optional)"
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <Button type="submit" className="w-full">
                <FolderGit2 aria-hidden="true" className="size-4" />
                Create Project
              </Button>
            </form>

            <div className="mt-10 border-t border-border pt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick capture</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Catch the thought.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Rough is enough. Capture it now; shape it when it earns attention.
              </p>

              <form action="/api/ideas" method="post" className="mt-6 space-y-3">
                <input type="hidden" name="action" value="capture" />
                <label className="block">
                  <span className="sr-only">Idea title</span>
                  <input
                    required
                    name="title"
                    placeholder="Idea title"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Idea notes</span>
                  <textarea
                    name="notes"
                    placeholder="A few lines of notes (optional)"
                    rows={4}
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <Button type="submit" className="w-full">
                  <Plus aria-hidden="true" className="size-4" />
                  Capture Idea
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <section>
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Portfolio · {projects.length}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Projects</h2>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="grid min-h-52 place-items-center border-b border-border py-12 text-center">
                <div className="max-w-sm">
                  <FolderGit2 aria-hidden="true" className="mx-auto size-5 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold tracking-tight">Create your first Project</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Add its metadata, then declare where the work stands.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-9 py-7">
                <ProjectGroup title="Building" projects={building} />
                <ProjectGroup title="Exploring" projects={exploring} />
                <ProjectGroup title="Released / Maintenance" projects={releasedOrMaintenance} />
                {shelved.length > 0 ? (
                  <section className="border-t border-border pt-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Shelved · {shelved.length}
                    </p>
                    <div className="mt-2 divide-y divide-border">
                      {shelved.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="flex items-center justify-between gap-4 py-2.5 text-sm hover:text-foreground"
                        >
                          <span className="truncate font-medium">{project.name}</span>
                          <span className="flex shrink-0 items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            <span className="hidden sm:inline">{project.stack}</span>
                            <time dateTime={project.lastActivityAt.toISOString()}>
                              Last activity {formatDate(project.lastActivityAt)}
                            </time>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </section>

          <div className="mt-14 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Idea Inbox · {ideas.length}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {view === "inbox" ? "Uncommitted thoughts" : "Archived Ideas"}
              </h2>
            </div>
            <nav aria-label="Idea views" className="flex items-center rounded-md border border-border p-1">
              <Link
                href="/"
                aria-current={view === "inbox" ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-8 px-3 text-xs",
                  view === "inbox" && "bg-muted",
                )}
              >
                <Inbox aria-hidden="true" className="size-3.5" />
                Inbox
              </Link>
              <Link
                href="/?view=archived"
                aria-current={view === "archived" ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-8 px-3 text-xs",
                  view === "archived" && "bg-muted",
                )}
              >
                <Archive aria-hidden="true" className="size-3.5" />
                Archived
              </Link>
            </nav>
          </div>

          {ideas.length === 0 ? <EmptyIdeas view={view} /> : null}

          <div className="divide-y divide-border">
            {ideas.map((idea) => (
              <article id={`idea-${idea.id}`} key={idea.id} data-idea-id={idea.id} className="scroll-mt-6 py-6">
                {view === "inbox" ? (
                  <form action="/api/ideas" method="post">
                    <input type="hidden" name="id" value={idea.id} />
                    <div className="grid gap-3">
                      <input
                        required
                        name="title"
                        defaultValue={idea.title}
                        aria-label="Idea title"
                        className="w-full rounded-sm bg-transparent text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <textarea
                        name="notes"
                        defaultValue={idea.notes}
                        aria-label="Idea notes"
                        placeholder="Add notes"
                        rows={Math.max(2, idea.notes.split("\n").length)}
                        className="w-full resize-y rounded-sm bg-transparent text-sm leading-6 text-muted-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <time
                          dateTime={idea.createdAt.toISOString()}
                          className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Captured {formatDate(idea.createdAt)}
                        </time>
                        <div className="flex flex-wrap justify-end gap-2">
                          <label>
                            <span className="sr-only">Initial Lifecycle State</span>
                            <select
                              name="lifecycleState"
                              defaultValue="exploring"
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {lifecycleStates.map((state) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button type="submit" name="action" value="promote" className="h-8 px-3 text-xs">
                            <FolderGit2 aria-hidden="true" className="size-3.5" />
                            Promote
                          </Button>
                          <Button type="submit" name="action" value="edit" variant="outline" className="h-8 px-3 text-xs">
                            <Save aria-hidden="true" className="size-3.5" />
                            Save
                          </Button>
                          <Button type="submit" name="action" value="discard" variant="ghost" className="h-8 px-3 text-xs text-destructive">
                            <Trash2 aria-hidden="true" className="size-3.5" />
                            Discard
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold tracking-tight">{idea.title}</h3>
                      <span className="rounded-sm border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        {idea.state === "discarded" ? "Discarded" : "Promoted"}
                      </span>
                    </div>
                    {idea.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{idea.notes}</p> : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectGroup({ title, projects }: { title: string; projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {title} · {projects.length}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {projects.map((project) => (
          <article key={project.id} className="rounded-md border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/projects/${project.id}`} className="font-semibold tracking-tight underline-offset-4 hover:underline">
                {project.name}
              </Link>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                {project.momentum ? (
                  <span
                    data-momentum={project.momentum}
                    className="rounded-sm border border-foreground/20 bg-muted px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                  >
                    {project.momentum}
                  </span>
                ) : null}
                <span className="rounded-sm border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {lifecycleStateLabel(project.lifecycleState)}
                </span>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
            <p className="mt-4 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {project.stack || "Stack not set"}
            </p>
            <time
              dateTime={project.lastActivityAt.toISOString()}
              className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Last activity {formatDate(project.lastActivityAt)}
            </time>
            {project.repositoryUrl || project.deployedUrl ? (
              <div className="mt-3 flex flex-wrap gap-4">
                {project.repositoryUrl ? (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Repository <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : null}
                {project.deployedUrl ? (
                  <a
                    href={project.deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Deployed <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyIdeas({ view }: { view: IdeaView }) {
  return (
    <div className="grid min-h-[24rem] place-items-center py-16 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-6 grid size-11 place-items-center rounded-md border border-border bg-muted text-muted-foreground">
          {view === "inbox" ? <Lightbulb aria-hidden="true" className="size-5" /> : <Archive aria-hidden="true" className="size-5" />}
        </span>
        <h3 className="text-balance text-xl font-semibold tracking-tight">
          {view === "inbox" ? "Capture your first idea" : "Nothing archived"}
        </h3>
        <p className="mx-auto mt-3 text-pretty text-sm leading-6 text-muted-foreground">
          {view === "inbox"
            ? "Give the thought a title, add any useful context, then press Capture Idea."
            : "Discarded and promoted Ideas appear here, so a thought is never lost."}
        </p>
      </div>
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
