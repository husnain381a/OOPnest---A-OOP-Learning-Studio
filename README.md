# PFnest · PF Step by Step

A browser-based Programming Fundamentals course for first-semester BS CS and Software Engineering students at USKT. The interface uses simple English. Prompts and feedback mix Roman Urdu and English.

## Run locally

Use Node.js 22.18+ and npm. Students only need a browser.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. **Try the first problem** opens a practice session. Practice work is cleared on reload. Signed-in student accounts save their work in Supabase.

```sh
npm run typecheck
npm test
npm run build
```

The database test runs the migrations in embedded PostgreSQL. It checks the student and teacher roles, score writes, repeated submissions, lesson unlocking, and section privacy. To run the full browser walkthrough, start the app without Supabase environment variables and run `npm run test:browser`. Set `PFNEST_BROWSER` if Chrome or Edge is installed in a different location. `PFNEST_TEST_URL` can point the walkthrough at a preview of the production build.

## Connect Supabase

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env.local` using [.env.example](.env.example). Restart Vite after changing them. The browser only needs the project URL and publishable key.
2. Authenticate the Supabase CLI to the intended project. Preview the migrations before applying them. `20261122113202_pfnest_curriculum_events.sql` adds the PF profiles, grade records, settings and reports, and depends on the two tracked OOPnest schema migrations. Keep any other in-progress migrations out of the deployment checkout unless they are part of the intended release. [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push)

   ```sh
   supabase db push --remote=YOUR_PROJECT_REF --dry-run
   supabase db push --remote=YOUR_PROJECT_REF
   supabase functions deploy pfn-learning --remote=YOUR_PROJECT_REF --use-api
   ```

3. In Auth, enable email/password signup, disable **Confirm email**, and set an eight-character minimum password. Set the site URL to your deployed site. Student sign-in uses a deterministic internal email based on the section and roll number. Students enter only their roll number, section and password. [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
4. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in a private shell or in your ignored `.env.local`, then run `npm run teacher:create`. The script creates `aimenansari008@gmail.com` with the teacher role and prints a randomly generated password once. Save it in a password manager. If that email already exists in the project, verify that account with Aimen before transferring its role or changing credentials. [Supabase admin account API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
5. Do a live check with one student account. Submit an activity, sign out, sign back in, and confirm the score is present. Sign in through **Teacher** and check the same student's progress and section. The teacher can turn the leaderboard off from the dashboard.

The Edge Function validates the caller through Supabase Auth and writes the graded result. Its server credential stays in the Edge Function environment. `SUPABASE_SECRET_KEY` and management access tokens are private. [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)

## Deploy to Vercel

Import the repository into Vercel. The included `vercel.json` uses the Vite preset, builds with `npm run build`, and serves `dist/`. Add the two `VITE_` variables in Vercel's build environment and choose Node.js 22 or 24. The frontend uses hash-based lesson navigation, so direct lesson URLs work on Vercel. [Vite deployment guide for Vercel](https://vite.dev/guide/static-deploy.html#vercel)

## Course and points

- **Socho** has 10 everyday problems and a short comparison quiz. Students sort IPO cards, reorder steps, write their own steps, build a flowchart, and compare methods. A different valid set of steps can earn 10 bonus points.
- **Hisab** has eight calculations. Students apply the same approach through the flowchart, then write numbered pseudocode and give the result. The term *algorithm* first appears after the student puts the steps in order in the first Hisab lesson.
- **Pehla Code** has five `cout` lessons. Students must predict the output before running an edited program. The simulator supports `\n`, `\t`, `\a`, `\\`, `\"`, chaining and `endl`. Alert signals appear as a note on screen.
- **Ahista Ahista Agay** is the Module 4 shell. The planned lesson order is ready and every lesson remains locked.

Score tracking starts in Socho so its activity points and optional second-solution bonus count. IPO and ordered steps earn 10 each, a flowchart earns 20, pseudocode and the comparison quiz earn 10 each, a correct run earns 20, and a correct first prediction earns 15. Wrong checks cost zero. A requested hint costs two points, with up to three per lesson. Displayed totals have a floor of zero. Streaks use Pakistan time.

Free-text practice uses a small, lesson-specific rubric covering key actions, line counts, final results, and the difference between two approaches. This can miss an unusual valid phrasing. Practice scores are intended for classroom feedback.

## Source layout

- `index.html`, `src/` and `vite.config.mjs` are the PFnest web app. Change `appName` in `src/client.ts` and the static page title in `index.html` to update the working title.
- `supabase/functions/_shared/` contains the course, grading logic, and `cout` parser used in the browser and on the server.
- `supabase/functions/pfn-learning/` is the authenticated grading endpoint. The PF migration stores one result per submission and prevents duplicate points and skipped activities.
- Older Next.js sources and OOP migration history in this workspace are separate from the Vite build.
