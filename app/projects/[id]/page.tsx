import { ArrowLeft, ExternalLink, GitBranch, Rocket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  getProject,
  lifecycleStateLabel,
  lifecycleStates,
  ProjectInputError,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let result;

  try {
    result = await getProject(id);
  } catch (error) {
    if (error instanceof ProjectInputError) notFound();
    throw error;
  }

  if (!result) notFound();

  const { project, changes } = result;

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

          <dl className="grid gap-6 border-b border-border py-7 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Repository</dt>
              <dd className="mt-2">
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <GitBranch aria-hidden="true" className="size-4" />
                  {project.repositoryUrl}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
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
              <dd className="mt-2 text-sm">{project.stack}</dd>
            </div>
          </dl>

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
          <div className="rounded-md border border-border p-5 lg:sticky lg:top-10">
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
          </div>
        </aside>
      </div>
    </main>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
