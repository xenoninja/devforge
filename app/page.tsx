import { Archive, Inbox, Lightbulb, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { listIdeas, type IdeaView } from "@/lib/ideas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view: IdeaView = (await searchParams).view === "archived" ? "archived" : "inbox";
  const ideas = await listIdeas(view);

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
                  autoFocus
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
        </aside>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
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
              <article key={idea.id} data-idea-id={idea.id} className="py-6">
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
                        <div className="flex gap-2">
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
