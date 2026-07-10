# Windows CyberPatriot Checklist

An interactive, self-contained HTML checklist for hardening a Windows image in CyberPatriot competitions (finals-round level). Progress is saved locally in the browser (`localStorage`) — no backend needed.

- `index.html` — the interactive checklist (open directly or deploy as a static site)
- `Windows_CyberPatriot_Checklist.md` — the same content in plain Markdown

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new), import the GitHub repo.
3. Framework preset: **Other** (static). No build command, no output directory needed — Vercel serves `index.html` as-is.
4. Click **Deploy**.

Or with the Vercel CLI, from this folder:

```
npx vercel
```

## Push to GitHub

```
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```
