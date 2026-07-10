# Windows CyberPatriot Checklist (Finals-Ready)

> Work order matters: **Read README first → snapshot/baseline → forensics questions → users/passwords → updates → services/features → policies → firewall → malware/unwanted software → file/permissions/shares → misc hardening.**
> Take a screenshot of your starting score, and screenshot again every 15-20 min. Re-read the README after every major change — it overrides this checklist.

---

## 0. Before You Touch Anything

- [ ] Read the **README** fully. Highlight/write down every name mentioned (authorized users, admins, required services, prohibited software, special instructions). These override generic checklist items.
- [ ] Note the **critical services** listed in the README (e.g., web server, FTP, SSH) — do NOT disable these, only secure them.
- [ ] Check current score / scoring report (`CyberPatriot Scoring Report` app in the taskbar) — screenshot it.
- [ ] Answer the **forensics questions** first while the system is still in its original state (some answers depend on original config, e.g. "how many admin accounts", "what's in this file", "who logged in when"). Save answers as `.txt`/`.docx` in the specified location, usually `Desktop` or `Security` folder — check the README for exact naming/location.
- [ ] Identify OS version: `winver`, and whether it's a workstation (Win10/11) or server (2016/2019/2022) — server has extra roles/features to check.
- [ ] Disable network access temporarily if instructed (usually NOT — most competitions require network up for scoring engine). Do not disconnect unless README says to.

---

## 1. User Accounts & Password Policy

### 1.1 Accounts
- [ ] Open `Computer Management → Local Users and Groups` (`lusrmgr.msc`) — or `netplwiz` / `net user`.
- [ ] Cross-reference every account against the README's authorized user list.
- [ ] **Delete or disable** any unauthorized/unknown local accounts (don't delete if unsure — disable first, ask/verify).
- [ ] Verify **Administrators group** membership (`net localgroup administrators`) — remove anyone not explicitly authorized as admin in the README.
- [ ] Ensure **Guest account is disabled**.
- [ ] Rename or disable default **Administrator account** if README specifies (usually leave enabled but secure it — check instructions).
- [ ] Check for **hidden accounts** created via registry (`SpecialAccounts\UserList`) or accounts that don't show in `lusrmgr.msc` (`net user` from cmd shows all).
- [ ] Set a **strong, compliant password for every authorized account** (yourself included) — meets complexity below. Do NOT reuse the same password everywhere if README forbids it.
- [ ] Any account impersonating an authorized user with wrong privilege level → fix group membership, don't just rename.
- [ ] Check **Autologon** registry key (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AutoAdminLogon`) — disable if present.

### 1.2 Password & Account Policy (`secpol.msc → Account Policies`)
- [ ] **Password Policy**
  - [ ] Enforce password history: **24** passwords remembered
  - [ ] Maximum password age: **≤ 60-90 days** (not 0/never)
  - [ ] Minimum password age: **1+ day**
  - [ ] Minimum password length: **≥ 8** (14 is safer for finals)
  - [ ] Password must meet complexity requirements: **Enabled**
  - [ ] Store passwords using reversible encryption: **Disabled**
- [ ] **Account Lockout Policy**
  - [ ] Account lockout duration: **15-30 min**
  - [ ] Account lockout threshold: **3-5 invalid attempts**
  - [ ] Reset lockout counter after: **15-30 min**
- [ ] Force a password change on next logon for accounts with weak/known passwords if appropriate.

---

## 2. Windows Updates & Patching

- [ ] `Settings → Update & Security → Windows Update` → **Check for updates**, install all (may need multiple passes/reboots).
- [ ] Set update settings to automatic if disabled by a "vulnerability."
- [ ] Verify **Windows Defender / antivirus definitions** are up to date.
- [ ] Check `gpedit.msc` for any GPO blocking updates (`Computer Config → Admin Templates → Windows Components → Windows Update`) — set "Configure Automatic Updates" appropriately, remove any policy disabling updates.
- [ ] If it's a server: check **Windows Server Update Services (WSUS)** config isn't pointing somewhere malicious.

---

## 3. Malware, Unwanted & Unauthorized Software

- [ ] Open `Control Panel → Programs and Features` — list all installed software, compare vs README's "authorized software" list.
- [ ] Uninstall anything **not authorized**, especially:
  - Hacking tools (Wireshark, Nmap, Cain & Abel, Metasploit, netcat, John the Ripper, hydra, etc.)
  - P2P/torrent software (uTorrent, BitTorrent, LimeWire)
  - Remote access tools not authorized (TeamViewer, AnyDesk, VNC, RAT-like tools)
  - Old/vulnerable software versions
  - Unauthorized games
- [ ] Run **Windows Defender full scan** (or the AV specified in README). Quarantine/remove threats.
- [ ] Enable **Windows Defender real-time protection**, cloud-delivered protection, tamper protection if not blocked by policy.
- [ ] Check `Task Scheduler` (`taskschd.msc`) for suspicious/unauthorized scheduled tasks (backdoors, reverse shells, persistence).
- [ ] Check **Startup apps** (`Task Manager → Startup` and `msconfig`) for unauthorized entries.
- [ ] Check `services.msc` and running processes (`Task Manager → Details`) for unfamiliar/malicious processes; research anything unrecognized before killing.
- [ ] Check for unauthorized **browser extensions** and reset browser settings/homepage if hijacked.
- [ ] Search common malware drop locations: `C:\Users\<user>\AppData\Roaming`, `\Local\Temp`, `C:\ProgramData`, `C:\Windows\Temp` for suspicious `.exe`/`.bat`/`.ps1`/`.vbs` files.
- [ ] Check `hosts` file (`C:\Windows\System32\drivers\etc\hosts`) for malicious redirects — should only have default entries.
- [ ] Check registry `Run`/`RunOnce` keys (`HKLM` and `HKCU\...\CurrentVersion\Run`) for persistence entries.

---

## 4. Services & Windows Features

- [ ] `services.msc` — disable/stop unnecessary and risky services **not required by README critical services**:
  - Telnet Server/Client
  - FTP (unless required)
  - Remote Registry
  - SNMP (unless required)
  - Simple TCP/IP Services
  - Fax service
- [ ] `Control Panel → Programs → Turn Windows features on or off`:
  - [ ] Disable/uninstall: Telnet Client, TFTP Client, SMB 1.0/CIFS File Sharing Support (unless legacy requirement stated)
  - [ ] Disable unnecessary IIS components if not the required web server
- [ ] **Remote Desktop (RDP)**: disable unless explicitly required by README. If required, ensure Network Level Authentication is on and only authorized users have access.
- [ ] **Remote Assistance**: disable (`System Properties → Remote`).
- [ ] Disable **AutoPlay/AutoRun** for all drives (`gpedit.msc → Computer Config → Admin Templates → Windows Components → AutoPlay Policies` → Turn off Autoplay = Enabled, All drives).
- [ ] Disable **SMBv1** entirely (legacy, exploitable — EternalBlue).
- [ ] Review **Windows optional features** for anything unusual installed (e.g., unnecessary server roles on a workstation).

---

## 5. Local Security Policy (`secpol.msc`) & Group Policy

- [ ] **Local Policies → Security Options**
  - [ ] Accounts: Guest account status → Disabled
  - [ ] Accounts: Rename administrator account (if instructed)
  - [ ] Accounts: Limit local account use of blank passwords to console logon only → Enabled
  - [ ] Interactive logon: Do not display last user name → Enabled
  - [ ] Interactive logon: Do not require CTRL+ALT+DEL → Disabled (i.e., DO require it)
  - [ ] Network access: Do not allow anonymous enumeration of SAM accounts/shares → Enabled
  - [ ] Network security: LAN Manager authentication level → Send NTLMv2 response only, refuse LM & NTLM
  - [ ] Microsoft network server: Digitally sign communications (always) → Enabled
  - [ ] Devices: Prevent users from installing printer drivers → Enabled (context dependent)
  - [ ] User Account Control (UAC) settings → Enabled, "Always notify" or default-and-above
- [ ] **Local Policies → User Rights Assignment**
  - [ ] "Log on as a service" / "Log on locally" / "Access this computer from the network" — only authorized accounts/groups.
  - [ ] "Deny log on locally" for Guest.
  - [ ] Remove unauthorized users from "Debug programs," "Take ownership," "Act as part of the OS," "Back up files and directories" (privilege escalation vectors).
- [ ] Ensure **UAC is enabled** (`Control Panel → User Accounts → Change User Account Control settings` — set to at least default level, not "Never notify").
- [ ] **Audit Policy**: enable auditing for logon events, account management, policy change, object access (success + failure) so logs actually capture activity.
- [ ] Check for GPOs pushed locally that weaken security (`gpedit.msc`) — reset any suspicious custom policy to default/secure.

---

## 6. Firewall & Network

- [ ] `Windows Defender Firewall` → ensure **enabled for all 3 profiles** (Domain, Private, Public).
- [ ] Set default inbound = Block, outbound = Allow (unless README states otherwise).
- [ ] Review **inbound/outbound rules** for anything unauthorized or overly permissive (e.g., rules opening high-risk ports like 4444, 1337, 31337, or allowing "Any" program/port).
- [ ] Remove rules for uninstalled/unauthorized software.
- [ ] Check open ports: `netstat -ano` — investigate unexpected listening ports and the PID/process behind them.
- [ ] Verify **network shares** — remove unauthorized shares (`net share`), check share + NTFS permissions on required shares match README (principle of least privilege).
- [ ] Disable **IPv6** only if README explicitly says to (usually leave as-is).
- [ ] Check DNS settings / hosts file again (see §3) for tampering.
- [ ] If ICMP/ping responses are an issue in README, adjust firewall ICMP rules accordingly.

---

## 7. File System, Permissions & Data

- [ ] Search for and remove **prohibited files** per README categories, typically:
  - Media: `.mp3, .mp4, .avi, .mkv, .mov, .wav`
  - Images (non-work related): `.jpg, .png, .gif` in user folders (be careful — don't delete legit forensic/work files)
  - Hacking tools/scripts: `.exe, .bat, .ps1, .vbs, .py` unrecognized
  - Archives that might hide contraband: `.zip, .rar, .7z`
  - Use File Explorer search (`*.mp3`, etc.) across `C:\Users` and common folders.
- [ ] Check **file/folder permissions** on sensitive directories (`C:\Windows\System32`, user profile folders) — no unauthorized "Everyone: Full Control" or overly broad permissions.
- [ ] Verify **shared folders** permissions match least-privilege / README spec.
- [ ] Check **Recycle Bin** and hidden/system files (`dir /a` or "Show hidden files") for hidden contraband.
- [ ] BitLocker / EFS: enable only if instructed — don't encrypt drives blindly (can break scoring engine access).

---

## 8. Application-Specific / Server Roles (if present)

- [ ] If IIS is installed and required: update it, remove default sample sites/pages, disable directory browsing, apply least-privilege app pool identities.
- [ ] If SQL Server present: check for default/blank `sa` password, disable unnecessary features (xp_cmdshell), least-privilege accounts.
- [ ] If it's a Domain Controller (Server finals images sometimes include AD): check AD users/groups/OUs against README, check Group Policy Objects for tampering, verify DNS zones.
- [ ] If FTP required: ensure anonymous access disabled, TLS if possible, restrict to necessary users.

---

## 9. Miscellaneous Hardening

- [ ] Screen lock / screensaver: enable with password, reasonable timeout (e.g., 10-15 min).
- [ ] Disable **USB storage auto-execution** but don't disable USB entirely unless told.
- [ ] Check **Internet Options / browser security settings** — reset to safe defaults, clear malicious proxy settings (`Internet Options → Connections → LAN Settings` — no unauthorized proxy).
- [ ] Verify **system time/timezone** is correct (affects logs/auditing).
- [ ] Check **Event Viewer** briefly for obvious signs of compromise mentioned in README-related forensics questions.
- [ ] Confirm **critical services from README are still running** after all changes (re-check after EVERY major change — many teams lose points by breaking a required service).
- [ ] Re-read README one final time — confirm every explicit instruction was followed and every named vulnerability/topic addressed.

---

## 10. Finals-Round Specific Notes

Finals images are intentionally harder and often include intentionally "broken" components — don't just run a script and walk away.

- [ ] Expect **broken PowerShell** or **modified environment variables** (`PATH`, `PSModulePath`) — check `[Environment]::GetEnvironmentVariables()` and restore sane values if `powershell`/`cmd` won't run properly.
- [ ] Expect **renamed/relocated critical binaries** or altered file associations — verify `.exe`/`.msc`/`.ps1` file associations aren't hijacked.
- [ ] Expect **GPO-based traps** (e.g., a GPO silently disabling Defender, re-enabling Guest, or re-lowering password policy on refresh) — check both Local Security Policy AND `rsop.msc` (Resultant Set of Policy) to catch conflicts from a domain/local GPO overriding your changes.
- [ ] Expect **obscure/rare CIS benchmark items** beyond the basics above — skim the current year's CIS Benchmark for Windows 10/11 or Server as extra reference material before competition day.
- [ ] Build (in practice, ahead of time) a **personal automation checklist/script** (PowerShell) for the repetitive, safe items (disable Guest, set password policy, enable firewall, disable AutoPlay) — but always run scripts on **practice images first**, and hand-verify README-specific items manually; don't blindly run someone else's script on competition day.
- [ ] Track points after each category — if a change doesn't move the score or drops it, investigate/revert immediately rather than moving on.
- [ ] Time management for a 6-hour round: budget roughly —
  - 0:00–0:20 README + forensics questions + baseline
  - 0:20–1:30 Users/passwords/policy
  - 1:30–2:30 Updates + malware/software audit
  - 2:30–3:30 Services/features + firewall
  - 3:30–4:30 File system/permissions + misc hardening
  - 4:30–5:30 Second full README re-read + fix stragglers + verify critical services
  - 5:30–6:00 Final score check, screenshots, buffer for surprises

---

## Quick Reference: Tools to Open Fast

| Tool | Command |
|---|---|
| Local Users and Groups | `lusrmgr.msc` |
| Local Security Policy | `secpol.msc` |
| Group Policy Editor | `gpedit.msc` |
| Resultant Set of Policy | `rsop.msc` |
| Services | `services.msc` |
| Task Scheduler | `taskschd.msc` |
| Computer Management | `compmgmt.msc` |
| Windows Features | `optionalfeatures.exe` |
| System Config | `msconfig` |
| Network shares | `net share` |
| List all users | `net user` |
| Admin group members | `net localgroup administrators` |
| Open ports/connections | `netstat -ano` |
| Event Viewer | `eventvwr.msc` |
| Registry Editor | `regedit` |

---

*Practice on official CyberPatriot practice images before competition day — muscle memory matters more than this list under a 6-hour clock.*
