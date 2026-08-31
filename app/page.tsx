import { Lightbulb } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { verifyDatabaseConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await verifyDatabaseConnection();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-5 sm:px-8">
      <header className="flex h-12 items-center justify-between border-b border-border">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold tracking-tight">DevForge</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cockpit</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="grid min-h-[calc(100vh-7.25rem)] place-items-center py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-6 grid size-11 place-items-center rounded-md border border-border bg-muted text-muted-foreground">
            <Lightbulb aria-hidden="true" className="size-5" />
          </span>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Idea Inbox · 0</p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">Capture your first idea</h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
            Start with a rough thought. You can shape it into a Project when it earns your attention.
          </p>
        </div>
      </section>
    </main>
  );
}
