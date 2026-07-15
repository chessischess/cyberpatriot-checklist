# Windows Server CyberPatriot Checklist (Finals-Ready)

> Covers Windows Server 2016/2019/2022, including Active Directory Domain Services, DNS, and DHCP roles.
> Screenshot your starting score, and again every 15-20 min. A broken DC/DNS/DHCP tanks the whole team's score, not just yours.

---

## 1. Local & Domain User Accounts

- [ ] `lusrmgr.msc` (member servers) / `dsa.msc` (DC) — cross-reference every account against README's authorized list; disable/remove unauthorized ones (disable first if unsure it's a service account).
- [ ] Verify local Administrators, Domain Admins/Enterprise Admins, AND every other group named in the README — remove unauthorized members, add missing authorized ones.
- [ ] Ensure the **Guest account** (local and domain) is disabled; leave the built-in Administrator account as-is on a DC unless README says otherwise.
- [ ] Check for duplicate/stale AD accounts or wrong-OU placement (DC only); hidden local accounts (`SpecialAccounts\UserList`) and **Autologon** (`Winlogon\AutoAdminLogon`) in the registry.
- [ ] Set strong, compliant passwords for all authorized local and domain accounts.
- [ ] Verify service accounts (SQL, IIS app pool, backup agents) have least-privilege, not blanket Domain Admin.

---

## 2. Password & Account Lockout Policy

- [ ] On a Domain Controller, edit the **Default Domain Policy** (`gpmc.msc`) — local `secpol.msc` is ignored for domain accounts. On member servers without a DC role, set local Account Policy the same way.
- [ ] **Password Policy**: history 24, max age 60-90 days, min age 1+ day, min length 8+ (14 for finals), complexity Enabled, reversible encryption Disabled.
- [ ] **Account Lockout Policy**: duration 15-30 min, threshold **5-50** (never below 5 — CyberPatriot penalizes that), reset counter 15-30 min.

---

## 3. Windows Updates & Patching

- [ ] Settings → Windows Update (or `sconfig` on Server Core) → check for and install all updates, reboot, repeat.
- [ ] Verify Defender/AV definitions are current; check for a GPO blocking Windows Update and fix "Configure Automatic Updates".
- [ ] If **WSUS** is configured, verify the upstream server/URL is legitimate, not attacker-controlled.
- [ ] Update every other README-required/allowed **application** (Apache/XAMPP, SQL Server, Exchange, third-party tools), not just Windows — reinstall to the SAME default location (penalized otherwise).

---

## 4. Malware & Unauthorized Software

- [ ] Compare installed software (`Programs and Features` / `Get-Package`) against README's authorized list; remove hacking/pentest tools (Wireshark, Nmap, Mimikatz, John, hydra) and unauthorized remote access tools (TeamViewer, AnyDesk, VNC).
- [ ] Run a full AV scan; enable real-time protection, cloud-delivered protection, tamper protection.
- [ ] Check for unauthorized persistence: **Task Scheduler** (especially tasks running as SYSTEM/Domain Admin), Startup items, and registry **Run/RunOnce** keys (HKLM + HKCU).
- [ ] Search Temp/ProgramData/user profile folders for suspicious exe/bat/ps1/vbs files; check the **hosts file** for malicious redirects.
- [ ] Review installed services for unfamiliar binaries running from AppData/Temp rather than System32/Program Files.

---

## 5. Server Roles & Features

- [ ] `Server Manager` → confirm only README-required roles are installed (AD DS, DNS, DHCP, IIS, File and Storage Services, etc.) — remove unauthorized roles/features (including IIS if not required).
- [ ] `services.msc` — disable unneeded, risky services not required by README (Telnet Server, FTP unless required, SMTP, Remote Registry, SNMP unless required).
- [ ] Disable **SMBv1**, TFTP Client, Telnet Client, and PowerShell v2 if not required.

---

## 6. Local Security Policy, GPO & Domain Policy

- [ ] **Security Options** (local and domain): Guest account status Disabled, blank passwords console-logon-only Enabled, do not display last username Enabled, require CTRL+ALT+DEL, anonymous SAM enumeration blocked, LAN Manager auth = NTLMv2 only, digitally sign server communications Enabled.
- [ ] **UAC settings** → Enabled, Always Notify.
- [ ] Review **GPOs** linked at domain/OU level (`gpmc.msc`) for tampering; check **Resultant Set of Policy** (`rsop.msc` / `gpresult /h report.html`) for conflicts between local and domain-applied policy.
- [ ] Enable audit policy: logon events, account management, policy change, object access, directory service access (Success + Failure). Newer images may instead expect `Advanced Audit Policy Configuration → System Audit Policies → Account Logon → Audit Credential Validation`.
- [ ] Restrict **User Rights Assignment** (Log on as a service / locally / from network) to only authorized accounts/groups.

---

## 7. Network Configuration

- [ ] Confirm the server uses a **static IP** with at least two configured DNS servers.
- [ ] Verify valid forward (A) and reverse (PTR) DNS records exist; test with `nslookup` / `Resolve-DnsName`.
- [ ] Ensure NTP/time sync is correct — a DC should sync to a reliable external source; member servers sync to the DC.

---

## 8. Firewall

- [ ] Windows Defender Firewall enabled for all 3 profiles; inbound = Block except for roles this server must serve (DNS 53, DHCP 67/68, web 80/443, AD ports), outbound = Allow.
- [ ] Review inbound/outbound rules for unauthorized/overly permissive entries (Any/Any, high backdoor ports like 4444/1337/31337); remove rules tied to uninstalled software/roles.
- [ ] Check `netstat -ano` for unexpected listening ports and identify the owning process/service.

---

## 9. Active Directory Domain Services (if this box is a DC)

- [ ] `dsa.msc` — audit every user, group, and OU against the README's org chart; fix misplaced accounts, wrong enable/disable state, and stale/duplicate accounts.
- [ ] Check **Domain Admins / Enterprise Admins / Schema Admins** group membership carefully — these are prime tampering targets.
- [ ] Verify **FSMO role holders** are on the expected DC(s) and AD replication is healthy (`netdom query fsmo`, `repadmin /replsummary`).
- [ ] Verify **SYSVOL** and **NETLOGON** shares are intact and replicating; check AD Sites and Services for unexpected site/subnet changes.

---

## 10. DNS Server Role (if present)

- [ ] `dnsmgmt.msc` — verify forward/reverse zones are configured correctly; remove unauthorized or suspicious A/CNAME records pointing to an unexpected IP.
- [ ] Verify zone transfers are restricted to authorized secondary servers (not "to any server") and forwarders point to a legitimate upstream resolver; only enable DNSSEC/scavenging if README calls for it.

---

## 11. DHCP Server Role (if present)

- [ ] `dhcpmgmt.msc` — verify scope ranges/exclusions/reservations and scope options (DNS, gateway, domain name) match the README's network plan.
- [ ] Verify the DHCP server is authorized in AD; remove or disable rogue/unauthorized scopes.

---

## 12. IIS / File Services / Other Installed Roles

- [ ] **IIS**: update it, remove default sample sites, disable directory browsing, least-privilege app pool identities, remove unused modules, enforce HTTPS if a cert is expected.
- [ ] **SQL Server** (if installed): strong `sa` password, disable `xp_cmdshell`, least-privilege service account.
- [ ] **File and Storage Services**: audit shares (Computer Management → Shared Folders) — remove unauthorized shares, tighten share + NTFS permissions.
- [ ] **FTP** (if required): disable anonymous access, prefer FTPS. **Apache** (e.g. XAMPP, if required): disable ServerSignature and set `ServerTokens Prod`.

---

## 13. Remote Access (RDP / WinRM)

- [ ] Disable **Remote Desktop** unless explicitly required (if required, enable NLA and restrict via the Remote Desktop Users group); disable Remote Assistance.
- [ ] If **PowerShell Remoting (WinRM)** is enabled but not required, disable it or restrict `TrustedHosts`.

---

## 14. File System, Permissions & Data

- [ ] Search for and remove prohibited files per README categories (media, unauthorized archives, unrecognized scripts).
- [ ] Check permissions on sensitive directories (System32, SYSVOL, profiles) — no unauthorized "Everyone: Full Control"; verify shared folder permissions match least-privilege/README spec.
- [ ] Check Recycle Bin/hidden files for contraband; only enable BitLocker/EFS if explicitly instructed.

---

## 15. Miscellaneous Hardening

- [ ] Enable screen lock/screensaver with password, reasonable timeout.
- [ ] Verify system time/timezone correctness (critical for AD Kerberos auth and log accuracy).
- [ ] Check **Event Viewer** (Security, and Directory Service on a DC) for signs of compromise tied to forensics questions.
- [ ] Confirm every README-listed **critical service/role** is still running after EVERY major change.

---

## 16. Advanced Hardening (if time remains)

- [ ] Disable **WDigest** (`UseLogonCredential=0`) and enable **LSA protection** (`RunAsPPL=1`) on every server, especially DCs — verify required security/monitoring software still works afterward.
- [ ] Add sensitive admin accounts to the built-in **Protected Users** group to block NTLM/weak-crypto Kerberos — verify they can still authenticate afterward.
- [ ] Disable the **Print Spooler** service on Domain Controllers unless explicitly required — PrintNightmare (CVE-2021-34527) is a domain-wide privilege-escalation vector.

---

## 17. Finals-Round Notes

- [ ] Expect **GPO traps** from the Default Domain Policy or an OU-linked GPO that silently re-disable Defender/re-enable Guest/lower password policy on refresh — check `rsop.msc`/`gpresult`, not just local secpol.
- [ ] Watch for intentionally broken DNS, replication issues between DCs, FSMO roles seized/moved incorrectly, or a rogue DHCP/DNS server on the segment.
- [ ] Track score after each category. Time budget for a **4-hour round**: 0:00-0:15 forensics+baseline, 0:15-1:00 accounts+password policy, 1:00-1:45 updates+malware+roles, 1:45-2:30 GPO+firewall+network, 2:30-3:15 AD/DNS/DHCP+file system, 3:15-3:45 second README pass, 3:45-4:00 final check.

---

## Quick Reference

| Tool | Command |
|---|---|
| Server Manager | `ServerManager.exe` |
| Active Directory Users and Computers | `dsa.msc` |
| Group Policy Management | `gpmc.msc` |
| Resultant Set of Policy | `rsop.msc` / `gpresult /h report.html` |
| DNS Manager | `dnsmgmt.msc` |
| DHCP Console | `dhcpmgmt.msc` |
| Local Security Policy | `secpol.msc` |
| Local Users and Groups | `lusrmgr.msc` |
| Services | `services.msc` |
| Task Scheduler | `taskschd.msc` |
| Computer Management | `compmgmt.msc` |
| Shared Folders (GUI) | `fsmgmt.msc` |
| AD replication summary | `repadmin /replsummary` |
| Show FSMO role holders | `netdom query fsmo` |
| Time sync status | `w32tm /query /status` |
| Open ports/connections | `netstat -ano` |
| Event Viewer | `eventvwr.msc` |
| Server Core config menu | `sconfig` |

---

*Practice on official CyberPatriot practice images before competition day — muscle memory matters more than this list under a 4-hour clock.*

See also: [Windows Client Checklist](Windows_Client_Checklist.md) · [Linux Checklist](Linux_Checklist.md)
