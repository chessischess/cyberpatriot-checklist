# CyberPatriot Checklists

Interactive, self-contained HTML checklists for hardening Windows Client, Windows Server, and Linux images in CyberPatriot competitions (finals-round level, 4-hour rounds). Every item expands into exact step-by-step instructions — precise menu paths, commands, and what to click. Progress is saved locally per-page in the browser (`localStorage`) — no backend needed.

**Live pages:**
- `index.html` — hub page linking to all three checklists, with live progress for each
- `windows-client.html` — Windows 10/11 workstation hardening
- `windows-server.html` — Windows Server 2016/2019/2022, including AD DS / DNS / DHCP
- `linux.html` — Ubuntu/Debian (RHEL/CentOS-adjacent) hardening

**Shared code:**
- `style.css` — shared styles
- `checklist.js` — shared rendering engine (checkboxes, collapsible sections, expandable step-by-step dropdowns, progress tracking)
- `data-windows-client.js`, `data-windows-server.js`, `data-linux.js` — the checklist content for each page

**Plain Markdown versions** (no interactivity, for offline reading/printing):
- `Windows_Client_Checklist.md`
- `Windows_Server_Checklist.md`
- `Linux_Checklist.md`

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new), import the GitHub repo.
3. Framework preset: **Other** (static). No build command, no output directory needed — Vercel serves the HTML files as-is.
4. Click **Deploy**.

Or with the Vercel CLI, from this folder:

```
npx vercel --prod
```

## Push to GitHub

```
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```
