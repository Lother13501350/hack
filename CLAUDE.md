@AGENTS.md

# Project notes for Claude

- 6-hour team hackathon: favor working, demoable features over polish. Keep changes small so teammates can merge often.
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`, generated — add with `pnpm dlx shadcn@latest add <name>`, don't hand-edit). Toasts via `sonner`.
- Package manager: pnpm only.
- Before saying work is done, run `pnpm check` and `pnpm build`.
- Secrets go in `.env.local` / Vercel env vars; add new variable names (no values) to `.env.example`.
- Server work goes in route handlers (`src/app/api/*/route.ts`) or Server Actions; keep the default Node.js runtime (no `runtime = "edge"`).
