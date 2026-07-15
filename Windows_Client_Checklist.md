# Windows Client CyberPatriot Checklist (Finals-Ready)

> Screenshot your starting score, and again every 15-20 min. Re-read the README after every major change — it overrides this checklist.

---

## 1. User Accounts & Password Policy

- [ ] Open `lusrmgr.msc` (or `net user`) — cross-reference every account against README's authorized list; delete/disable unauthorized ones (disable first if unsure).
- [ ] Verify membership of **Administrators** AND every other group named in the README (Remote Desktop Users, custom groups, etc.) — remove unauthorized members, add missing authorized ones. Custom groups are scored just as often.
- [ ] Ensure **Guest account is disabled**.
- [ ] Check for hidden accounts (`SpecialAccounts\UserList` registry key) and **Autologon** (`Winlogon\AutoAdminLogon`) — remove/disable if present.
- [ ] Set a strong, compliant password for every authorized account.
- [ ] **Password Policy** (`secpol.msc → Account Policies → Password Policy`): history 24, max age 60-90 days, min age 1+ day, min length 8+ (14 for finals), complexity Enabled, reversible encryption Disabled.
- [ ] **Account Lockout Policy**: duration 15-30 min, threshold **5-50** (never below 5 — CyberPatriot penalizes that), reset counter 15-30 min.

---

## 2. Windows Updates & Patching

- [ ] `Settings → Update & Security → Windows Update` → check and install all updates (multiple passes/reboots).
- [ ] Set update settings to automatic if disabled; verify Defender definitions are current.
- [ ] Check `gpedit.msc` for a GPO blocking updates — fix "Configure Automatic Updates".
- [ ] Update every other README-required/allowed **application** (browser, Java, Apache/XAMPP, etc.) via its own updater — not just Windows. Reinstall to the SAME default location — "not installed at default location" is a scored penalty.

---

## 3. Malware, Unwanted & Unauthorized Software

- [ ] `Programs and Features` (`appwiz.cpl`) — compare vs README's authorized list; uninstall hacking tools (Wireshark, Nmap, Metasploit, netcat, John, hydra) and unauthorized remote access tools (TeamViewer, AnyDesk, VNC).
- [ ] Run a full **Windows Defender scan**; enable real-time protection, cloud-delivered protection, tamper protection.
- [ ] Set **Windows Defender SmartScreen** (Explorer and Edge) to Warn or Block, not disabled.
- [ ] Check for unauthorized persistence: **Task Scheduler** (`taskschd.msc`), **Startup apps** (Task Manager/msconfig), and registry **Run/RunOnce** keys (HKLM + HKCU).
- [ ] Check `services.msc` and running processes (Task Manager → Details) for unfamiliar/malicious items — research before killing.
- [ ] Search `AppData\Roaming`, `Local\Temp`, `ProgramData`, `Windows\Temp`, and `C:\Users\Public\Downloads` for suspicious exe/bat/ps1/vbs files; check the **hosts file** for malicious redirects.

---

## 4. Services & Windows Features

- [ ] `services.msc` — disable/stop unneeded, risky services not required by README (Telnet, FTP, SMTP, Remote Registry, SNMP, Simple TCP/IP, Fax).
- [ ] Turn Windows features on/off (`optionalfeatures.exe`): disable Telnet Client, TFTP Client, SMB 1.0/CIFS, unneeded IIS components.
- [ ] **Remote Desktop**: disable unless explicitly required (if required, enable NLA and restrict users); disable **Remote Assistance**.
- [ ] Disable **AutoPlay/AutoRun** for all drives via `gpedit.msc`.

---

## 5. Local Security Policy & Group Policy

- [ ] **Security Options** (`secpol.msc → Local Policies → Security Options`): Guest account status Disabled, blank passwords console-logon-only Enabled, do not display last username Enabled, require CTRL+ALT+DEL, anonymous SAM enumeration blocked, LAN Manager auth = NTLMv2 only, digitally sign server communications Enabled.
- [ ] **UAC settings** → Enabled, Always Notify (not "Never notify").
- [ ] **User Rights Assignment**: restrict Log on as a service / locally / network access to authorized accounts; deny log on locally for Guest; remove unauthorized users from Debug programs, Take ownership, Act as part of the OS, Back up files.
- [ ] **Audit Policy**: enable Success + Failure auditing for logon events, account management, policy change, object access. Newer images may instead expect `Advanced Audit Policy Configuration → System Audit Policies → Account Logon → Audit Credential Validation` — check both locations.
- [ ] Check `gpedit.msc` for suspicious custom policies weakening security (e.g. Defender/Updates disabled via policy) — reset to secure defaults.

---

## 6. Firewall & Network

- [ ] Windows Defender Firewall enabled for **all 3 profiles** (Domain, Private, Public); default inbound = Block, outbound = Allow.
- [ ] Review inbound/outbound rules for unauthorized/overly permissive entries (high ports like 4444/1337/31337, Any/Any rules); remove rules for uninstalled software.
- [ ] Check `netstat -ano` for unexpected listening ports and investigate the owning process.
- [ ] Review **network shares** (`net share`, or `fsmgmt.msc` GUI) — remove unauthorized ones, tighten share + NTFS permissions.

---

## 7. File System, Permissions & Data

- [ ] Search for and remove **prohibited files** per README categories: media (mp3/mp4/avi/mkv/mov/wav), non-work images (jpg/png/gif), unrecognized scripts (exe/bat/ps1/vbs/py), archives (zip/rar/7z) that might hide contraband.
- [ ] Check permissions on sensitive directories (System32, user profiles, shares) — no unauthorized "Everyone: Full Control"; verify shared folder permissions match least-privilege/README spec.
- [ ] Check **Recycle Bin** and hidden/system files for hidden contraband.

---

## 8. Application-Specific Roles (if present)

- [ ] **IIS**: update it, remove default sample sites, disable directory browsing, least-privilege app pool identities; disable anonymous FTP access, prefer TLS.
- [ ] **SQL Server**: set a strong `sa` password, disable `xp_cmdshell`, least-privilege service accounts.
- [ ] **Apache** (e.g. XAMPP, if installed/required): disable server signature — set `ServerSignature Off` and `ServerTokens Prod` in `httpd.conf`, then restart Apache.

---

## 9. Miscellaneous Hardening

- [ ] Enable screen lock/screensaver with password, 10-15 min timeout.
- [ ] Verify system time/timezone is correct (affects logs/auditing).
- [ ] Check **Event Viewer** briefly for signs of compromise tied to forensics questions.
- [ ] Confirm README **critical services** are still running after EVERY major change.

---

## 10. Advanced Hardening (if time remains)

- [ ] Disable **WDigest** (`UseLogonCredential=0`) and enable **LSA protection** (`RunAsPPL=1`) so plaintext creds aren't cached and LSASS is a protected process.
- [ ] Disable the **PowerShell v2** engine and enable Script Block/Module Logging.
- [ ] Disable the **Print Spooler** service if this machine doesn't need to print — mitigates PrintNightmare (CVE-2021-34527).

---

## 11. Finals-Round Notes

- [ ] Expect **GPO traps** that silently re-disable Defender / re-enable Guest / lower the password policy on refresh — check `rsop.msc` for conflicts, not just `secpol.msc`.
- [ ] Track score after each category — if a change doesn't move the score or drops it, investigate/revert immediately.
- [ ] Time budget for a **4-hour round**: 0:00-0:15 forensics/baseline, 0:15-1:00 users/policy, 1:00-1:45 updates+malware, 1:45-2:30 services+firewall, 2:30-3:15 files+misc, 3:15-3:45 second README pass, 3:45-4:00 final check.

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
| Shared Folders (GUI) | `fsmgmt.msc` |
| Network shares | `net share` |
| List all users | `net user` |
| Admin group members | `net localgroup administrators` |
| Open ports/connections | `netstat -ano` |
| Event Viewer | `eventvwr.msc` |
| Registry Editor | `regedit` |

---

*Practice on official CyberPatriot practice images before competition day — muscle memory matters more than this list under a 4-hour clock.*

See also: [Windows Server Checklist](Windows_Server_Checklist.md) · [Linux Checklist](Linux_Checklist.md)
