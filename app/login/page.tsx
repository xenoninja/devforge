import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Private workspace</p>
            <h1 className="text-lg font-semibold tracking-tight">Unlock DevForge</h1>
          </div>
        </div>

        <form action="/api/session" className="space-y-3" method="post">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            aria-describedby={error ? "password-error" : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="current-password"
            autoFocus
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
            id="password"
            name="password"
            required
            type="password"
          />
          {error ? (
            <p className="text-sm text-destructive" id="password-error" role="alert">
              That password is not correct.
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Continue
          </Button>
        </form>
      </section>
    </main>
  );
}
