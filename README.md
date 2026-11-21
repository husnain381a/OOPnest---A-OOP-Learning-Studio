# OOPnest

A Next.js 15 + React 19 + Tailwind 4 C++ OOP learning studio. Supabase supplies authentication, Postgres persistence and a server-side compiler proxy. The application is statically exported, so it works on Sites or another static host; account and execution operations go to Supabase.

## Run locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Build with `npm run build`; deploy `out/`. Never place compiler keys or a Supabase service-role key in a `NEXT_PUBLIC_*` variable.

## Learning workspace

Log in or create an account to open the dashboard. The workspace includes eight lessons, English/Roman Urdu/Hindi explanations, quizzes, coding challenges, and a C++ playground. Notes and progress sync to the signed-in account. Bookmarks and playground drafts are saved on the device.

## Connect Supabase

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment, then rebuild. Existing deployments can continue using `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Row-level security protects account records.
2. With Supabase CLI v3, preview and apply the included migrations before enabling accounts. Replace `YOUR_PROJECT_REF` with your project reference. [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push)

   ```sh
   supabase db push --remote=YOUR_PROJECT_REF --dry-run
   supabase db push --remote=YOUR_PROJECT_REF
   supabase migration list --remote=YOUR_PROJECT_REF
   ```
3. Enable email and password signup in Supabase Auth and turn off Confirm email so signup opens a session immediately. To apply the included settings, preview with `supabase config diff --remote=YOUR_PROJECT_REF`, then run `supabase config push --remote=YOUR_PROJECT_REF`. [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
4. Register the administrator and find the intended account’s UUID in Supabase Auth. Promote it with `update public.profiles set role='admin' where id='YOUR_USER_UUID';`. Admins can view the student directory and lesson completion. Student notes stay private.
5. Create a student account, confirm it opens the dashboard, sign out, and log back in with the same password.

## Connect OnlineCompiler

1. Obtain an OnlineCompiler API key and save it as the Supabase Edge Function secret `COMPILER_API_KEY`. The adapter sends programs and stdin to the C++17 runtime and returns output and compiler diagnostics. [OnlineCompiler API reference](https://onlinecompiler.io/docs/run-code)
2. Set the Supabase Edge Function secret `APP_ORIGINS` to a comma-separated list of app origins such as `https://oopnest.example,http://localhost:3000`. Origins have no trailing slash.
3. Deploy with `supabase functions deploy compile --remote=YOUR_PROJECT_REF --use-api`. The function verifies identity, checks browser origins, limits submissions and allows up to 10 runs per minute per account.
4. Sign in and run an original example, an edited example that reads stdin, and an example with a syntax error. The terminal shows output, compile errors and timeout messages.

## Architecture and boundaries

- `app/page.tsx`: authenticated learning workspace.
- `app/auth-screen.tsx`: email and password login and signup.
- `lib/content.ts`: eight lessons, quizzes and external resources.
- `lib/supabase.ts`: Supabase browser client.
- `supabase/migrations/`: profiles, progress, notes, RLS and compiler limiter.
- `supabase/functions/compile/`: authenticated compiler adapter.
- Accounts, admin queries and live compilation require setup; no fabricated student directory or simulated compiler output is presented as live data.
- Quiz completion is self-reported educational progress, not an assessment security boundary.
- A custom domain and open student access still need hosting/domain configuration. The initial hosted review is private.

## Design guidance consulted

User-provided Skills.pdf lists repositories. Relevant source guidance reviewed: UI UX Pro Max (design-system and Next.js guidance), Superpowers (verification before completion), Taste (marketing guidance reviewed; its full-screen marketing layout does not fit a learning workspace), Impeccable (Operate/Read guidance) and Matt Pocock’s codebase-design guidance. Relevance is determined by this education workspace, rather than applying unrelated job-search, slide or research tools.
