# Windows Server CyberPatriot Checklist (Finals-Ready)

> Covers Windows Server 2016/2019/2022, including Active Directory Domain Services, DNS, and DHCP roles.
> Work order: **Read README → identify role(s)/baseline score → forensics questions → accounts/password policy → updates → roles/features → GPO/policy → firewall/network → AD/DNS/DHCP → files/permissions → misc hardening.**
> Re-read the README after every major change — a broken DC/DNS/DHCP tanks the whole team's score, not just yours.

---

## 0. Before You Touch Anything

- [ ] Read the README fully. Note authorized users/admins, required roles (AD DS, DNS, DHCP, IIS, File Services...), critical services, prohibited software.
- [ ] Identify the server's role(s): standalone server, member server, or Domain Controller (check with Server Manager dashboard / presence of `dsa.msc`).
- [ ] Note critical services from README — securing ≠ disabling. A DC that stops responding to DNS/AD kills the whole domain's score.
- [ ] Screenshot the current Scoring Report score before making changes.
- [ ] Answer forensics questions first, before the system state changes.
- [ ] Confirm OS build (`winver` / Server Manager dashboard) — 2016 vs 2019 vs 2022 changes some UI paths.
- [ ] Do NOT demote a Domain Controller, remove roles, or disconnect the network unless the README explicitly instructs it.

## 1. Local & Domain User Accounts

- [ ] Local Users and Groups (`lusrmgr.msc`) on member servers; Active Directory Users and Computers (`dsa.msc`) if this is a DC.
- [ ] Cross-reference every local AND domain account against the README's authorized user/admin list.
- [ ] Disable or remove unauthorized accounts — disable first if unsure whether it's a service account in use.
- [ ] Verify local Administrators group AND Domain Admins / Enterprise Admins group membership — remove unauthorized members.
- [ ] Ensure the Guest account (local and domain) is disabled.
- [ ] Do not disable the built-in Administrator account by default on a DC — some AD recovery tasks require it; only change per README.
- [ ] Check for duplicate/stale AD accounts, accounts in the wrong OU, or accounts with unexpected UPNs.
- [ ] Check for hidden local accounts via `SpecialAccounts\UserList` registry key and `net user`.
- [ ] Set strong, compliant passwords for all authorized local and domain accounts.
- [ ] Check Autologon registry key (`Winlogon\AutoAdminLogon`) — disable if present.
- [ ] Verify service accounts (SQL, IIS app pool, backup agents) have least-privilege, not blanket Domain Admin.

## 2. Password & Account Lockout Policy

- [ ] On a Domain Controller, edit the **Default Domain Policy** (Group Policy Management) — local `secpol.msc` password policy is ignored for domain accounts.
- [ ] Password history: enforce 24 remembered.
- [ ] Maximum password age: 60–90 days (not 0/never).
- [ ] Minimum password age: 1+ day.
- [ ] Minimum password length: 8+ (14 recommended for finals).
- [ ] Password must meet complexity requirements: Enabled.
- [ ] Store passwords using reversible encryption: Disabled.
- [ ] Account lockout duration / threshold / reset counter: 15–30 min, 3–5 attempts, 15–30 min.
- [ ] On member servers without a DC role, also set local Account Policy (`secpol.msc`) the same way.
- [ ] Enforce fine-grained password policies (PSOs) only if README specifically calls for them.

## 3. Windows Updates & Patching

- [ ] Settings → Update & Security (or `sconfig` on Server Core) → check for and install all updates, reboot, repeat.
- [ ] Verify Windows Defender / configured AV definitions are current.
- [ ] Check for a GPO blocking Windows Update (Computer Config → Admin Templates → Windows Components → Windows Update) and fix it.
- [ ] If WSUS is configured, verify the upstream server/URL is legitimate, not redirected to an attacker-controlled host.
- [ ] Patch any other installed Microsoft server products (SQL Server, Exchange, IIS extensions) if present.

## 4. Malware & Unauthorized Software

- [ ] Compare installed software (Programs and Features / `Get-Package`) against the README's authorized list.
- [ ] Remove hacking/pentest tools (Wireshark, Nmap, Metasploit, netcat, Mimikatz, John, hydra).
- [ ] Remove unauthorized remote access tools (TeamViewer, AnyDesk, unauthorized VNC).
- [ ] Run a full AV scan; enable real-time protection, cloud-delivered protection, tamper protection.
- [ ] Check Task Scheduler for unauthorized scheduled tasks, especially ones running as SYSTEM or Domain Admin.
- [ ] Check Startup items and registry `Run`/`RunOnce` keys (HKLM and HKCU) for persistence.
- [ ] Search Temp, ProgramData, and user profile folders for suspicious exe/bat/ps1/vbs files.
- [ ] Check the hosts file (`System32\drivers\etc\hosts`) for malicious redirects.
- [ ] Review installed Windows Services for unfamiliar binaries running from unusual paths (AppData, Temp) rather than System32/Program Files.

## 5. Server Roles & Features

- [ ] Open Server Manager → Manage → Add/Remove Roles and Features — confirm only README-required roles are installed (AD DS, DNS, DHCP, IIS, File and Storage Services, etc.).
- [ ] Remove roles/features that are installed but not authorized — reduces attack surface and often scores points directly.
- [ ] `services.msc` — disable unneeded, risky services not required by README (Telnet Server, FTP unless required, Remote Registry, SNMP unless required).
- [ ] Disable SMBv1 (Windows Features) — legacy, exploitable (EternalBlue).
- [ ] Disable Windows Features not in use: TFTP Client, Telnet Client, PowerShell v2 (legacy, weaker logging) if not required.
- [ ] If the IIS role is present but not required by README, remove it entirely rather than just stopping the service.
- [ ] Verify no unexpected server roles are installed on what should be a single-purpose box.

## 6. Local Security Policy, GPO & Domain Policy

- [ ] Guest account status → Disabled (Security Options), both local and domain.
- [ ] Limit local account use of blank passwords to console logon only → Enabled.
- [ ] Do not display last user name at logon → Enabled.
- [ ] Interactive logon: require CTRL+ALT+DEL → Enabled.
- [ ] Network access: do not allow anonymous enumeration of SAM accounts/shares → Enabled.
- [ ] LAN Manager authentication level → Send NTLMv2 response only, refuse LM & NTLM.
- [ ] Microsoft network server: digitally sign communications (always) → Enabled.
- [ ] UAC settings → Enabled, Always Notify or default-and-above.
- [ ] Review Group Policy Objects linked at domain/OU level (`gpmc.msc`) for tampering — a malicious GPO can silently re-break the whole domain.
- [ ] Check Resultant Set of Policy (`rsop.msc` / `gpresult /h report.html`) to catch conflicts between local and domain-applied policy.
- [ ] Enable audit policy: logon events, account management, policy change, object access, directory service access (success + failure).
- [ ] Restrict User Rights Assignment (Log on as a service / locally / from network) to only authorized accounts/groups.

## 7. Network Configuration

- [ ] Confirm the server uses a static IP address, not DHCP-assigned, for production stability.
- [ ] Configure at least two DNS servers where possible for redundancy.
- [ ] Verify valid forward (A) DNS records exist with correct naming; verify PTR records exist for reverse lookups.
- [ ] Test name resolution with `nslookup` / `Resolve-DnsName` for the server and other domain hosts.
- [ ] Ensure NTP/time sync is correct — a DC should sync to a reliable external time source; member servers sync to the DC (`w32tm /query /status`).
- [ ] Disable unused network protocols/services (e.g., unneeded IPv6 only if README explicitly requests it).

## 8. Firewall

- [ ] Windows Defender Firewall enabled for all 3 profiles (Domain, Private, Public).
- [ ] Default inbound = Block except for roles this server must serve (DNS 53, DHCP 67/68, web 80/443, AD ports) — outbound = Allow unless README says otherwise.
- [ ] Review inbound/outbound rules for unauthorized or overly permissive entries (Any/Any, high-numbered backdoor ports like 4444/1337/31337).
- [ ] Remove firewall rules tied to uninstalled or unauthorized software/roles.
- [ ] Check `netstat -ano` for unexpected listening ports and identify the owning process/service.
- [ ] If a hardware firewall/VPN boundary is implied by the README, restrict RDP/management ports accordingly on the Windows Firewall too.

## 9. Active Directory Domain Services (if this box is a DC)

- [ ] Open Active Directory Users and Computers (`dsa.msc`) — audit every user, group, and OU against the README's org chart.
- [ ] Look for accounts placed in the wrong OU, disabled accounts that should be enabled (or vice versa), and stale/duplicate accounts.
- [ ] Check Domain Admins / Enterprise Admins / Schema Admins group membership carefully — these are prime targets for tampering.
- [ ] Verify FSMO role holders are on the expected DC(s): `netdom query fsmo`.
- [ ] Check AD replication health if multiple DCs exist: `repadmin /replsummary` and `repadmin /showrepl`.
- [ ] Review Group Policy Objects in Group Policy Management (`gpmc.msc`) — check for GPOs that weaken security domain-wide (password policy, Defender, firewall).
- [ ] Verify SYSVOL and NETLOGON shares are intact and replicating (they hold logon scripts and GPO templates).
- [ ] Check AD Sites and Services for unexpected site/subnet changes if applicable.

## 10. DNS Server Role (if present)

- [ ] Open DNS Manager (`dnsmgmt.msc`) — verify forward and reverse lookup zones exist and are correctly configured.
- [ ] Check for unauthorized or suspicious DNS records (A/CNAME records pointing somewhere unexpected — classic redirect/persistence trick).
- [ ] Verify zone transfer settings are restricted to authorized secondary servers only, not "to any server".
- [ ] Confirm DNS forwarders point to a legitimate upstream resolver, not an attacker-controlled IP.
- [ ] Enable DNSSEC or scavenging only if the README calls for it — don't change zone behavior blindly.

## 11. DHCP Server Role (if present)

- [ ] Open the DHCP console — verify scope ranges, exclusions, and reservations match the README's network plan.
- [ ] Check DHCP scope options (DNS servers, default gateway, domain name) point to legitimate infrastructure.
- [ ] Verify the DHCP server is authorized in Active Directory (right-click server → Authorize) if it should be running.
- [ ] Remove or disable rogue/unauthorized DHCP scopes.

## 12. IIS / File Services / Other Installed Roles

- [ ] IIS: update it, remove default sample sites/pages, disable directory browsing, use least-privilege app pool identities.
- [ ] IIS: remove unused modules/handlers, enforce HTTPS if a certificate is expected, check bindings for unauthorized sites.
- [ ] SQL Server (if installed): check for a default/blank `sa` password, disable `xp_cmdshell`, use least-privilege service accounts.
- [ ] File and Storage Services: audit shares (Computer Management → Shared Folders) — remove unauthorized shares, tighten share + NTFS permissions to least privilege.
- [ ] FTP (if required): disable anonymous access, prefer FTPS, restrict to necessary users only.

## 13. Remote Access (RDP / WinRM / PowerShell Remoting)

- [ ] Disable Remote Desktop unless explicitly required by README; if required, enable Network Level Authentication and restrict to authorized users/group.
- [ ] Disable Remote Assistance.
- [ ] Restrict RDP/management access to expected admin accounts only — check "Remote Desktop Users" group membership.
- [ ] If PowerShell Remoting (WinRM) is enabled but not required, disable it (`Disable-PSRemoting`) or restrict `TrustedHosts`.
- [ ] Avoid Telnet and unauthenticated FTP entirely — replace with SSH/SFTP-equivalent or Windows-native secure tools only if README allows.

## 14. File System, Permissions & Data

- [ ] Search for and remove prohibited files per README categories (media, unauthorized archives, unrecognized scripts).
- [ ] Check permissions on sensitive directories (System32, SYSVOL, user profiles, application data) — no unauthorized "Everyone: Full Control".
- [ ] Verify shared folder permissions follow least privilege and match the README spec.
- [ ] Check Recycle Bin and hidden/system files for hidden contraband.
- [ ] Only enable BitLocker/EFS if explicitly instructed — encrypting blindly can break the scoring engine's access to the disk.

## 15. Miscellaneous Hardening

- [ ] Enable screen lock/screensaver with password, reasonable timeout.
- [ ] Disable USB storage auto-execution (don't disable USB entirely unless told).
- [ ] Verify system time/timezone correctness (critical for AD Kerberos auth and log accuracy).
- [ ] Check Event Viewer (especially Security and Directory Service logs) for signs of compromise tied to forensics questions.
- [ ] Confirm every README-listed critical service/role is still running after EVERY major change — a broken DC/DNS/DHCP tanks the whole team's score.
- [ ] Do a final full README re-read to confirm every instruction and named vulnerability was addressed.

## 16. Finals-Round Specific Notes

- [ ] Expect broken PowerShell, modified PATH/PSModulePath, or disabled execution policy traps — check and restore sane values.
- [ ] Expect GPO traps pushed from the Default Domain Policy or an OU-linked GPO that silently re-disable Defender, re-enable Guest, or lower the password policy on refresh — check `rsop.msc` / `gpresult`, not just local secpol.
- [ ] Expect intentionally broken DNS (wrong forwarders, missing records) or replication issues between DCs as part of the injected vulnerabilities — verify with `repadmin` and `nslookup`.
- [ ] Watch for FSMO roles seized/moved incorrectly, or a rogue DHCP/DNS server on the network segment.
- [ ] Skim the current year's Microsoft/CIS Benchmark for Windows Server for edge-case hardening items beyond the basics above.
- [ ] Track score after each category — if a change doesn't move the score or it drops, investigate/revert immediately rather than pressing on.
- [ ] Time budget for a **4-hour round**:
  - 0:00–0:15 README + forensics questions + baseline
  - 0:15–1:00 Accounts + password policy
  - 1:00–1:45 Updates + malware + roles
  - 1:45–2:30 GPO/policy + firewall + network
  - 2:30–3:15 AD/DNS/DHCP/roles + file system
  - 3:15–3:45 Second README pass + verify all critical services
  - 3:45–4:00 Final check, screenshots

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
| AD replication summary | `repadmin /replsummary` |
| Show FSMO role holders | `netdom query fsmo` |
| Time sync status | `w32tm /query /status` |
| Open ports/connections | `netstat -ano` |
| Event Viewer | `eventvwr.msc` |
| Server Core config menu | `sconfig` |

---

*Practice on official CyberPatriot practice images before competition day — muscle memory matters more than this list under a 4-hour clock.*

See also: [Windows Client Checklist](Windows_Client_Checklist.md) · [Linux Checklist](Linux_Checklist.md)
