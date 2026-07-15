const DATA_WINDOWS_SERVER = [
{
  title: "1. Local & Domain User Accounts",
  items: [
    { t: "lusrmgr.msc (member servers) / dsa.msc (DC) — cross-reference every account against README's authorized list; disable/remove unauthorized ones (disable first if unsure it's a service account).",
      d: ["Go through every account in lusrmgr.msc and/or dsa.msc and mark authorized vs unauthorized — watch for lookalike names.", "Right-click → Properties → 'Account is disabled' (safer), or → Delete if certain it's malicious."] },
    { t: "Verify local Administrators, Domain Admins/Enterprise Admins, AND every other group named in the README — remove unauthorized members, add missing authorized ones.",
      d: ["`net localgroup administrators` for local admins.", "dsa.msc → Users container → double-click Domain Admins/Enterprise Admins/any other named group → Members tab.", "Custom/non-Administrators group membership is scored just as often — don't skip these."] },
    { t: "Ensure the Guest account (local and domain) is disabled; leave the built-in Administrator account as-is on a DC unless README says otherwise.",
      d: ["lusrmgr.msc/dsa.msc → right-click Guest → Disable.", "Some AD recovery tasks require the built-in Administrator — only change it if explicitly instructed."] },
    { t: "Check for duplicate/stale AD accounts or wrong-OU placement (DC only); hidden local accounts (SpecialAccounts\\UserList) and Autologon (Winlogon\\AutoAdminLogon) in the registry.",
      d: ["dsa.msc: enable View → Advanced Features, browse OUs vs the README's org chart, Move misplaced accounts.", "regedit → HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon — check SpecialAccounts\\UserList and AutoAdminLogon."] },
    { t: "Set strong, compliant passwords for all authorized local and domain accounts.",
      d: ["lusrmgr.msc: right-click user → Set Password. dsa.msc: right-click user → Reset Password.", "12+ chars, mixed case, number, symbol."] },
    { t: "Verify service accounts (SQL, IIS app pool, backup agents) have least-privilege, not blanket Domain Admin.",
      d: ["dsa.msc → check each service account's Member Of tab — should not be in Domain Admins unless explicitly required."] }
  ]
},
{
  title: "2. Password & Account Lockout Policy",
  items: [
    { t: "On a Domain Controller, edit the Default Domain Policy (gpmc.msc) — local secpol.msc is ignored for domain accounts. On member servers without a DC role, set local Account Policy (secpol.msc) the same way.",
      d: ["gpmc.msc → Forest → Domains → your domain → Group Policy Objects → Default Domain Policy → Edit → Computer Configuration → Policies → Windows Settings → Security Settings → Account Policies."] },
    { t: "Password Policy: history 24, max age 60–90 days, min age 1+ day, min length 8+ (14 for finals), complexity Enabled, reversible encryption Disabled.",
      d: ["Set each value under Account Policies → Password Policy in the editor from the item above."] },
    { t: "Account Lockout Policy: duration 15–30 min, threshold 5–50 (never below 5 — CyberPatriot penalizes that), reset counter 15–30 min.",
      d: ["Account Policies → Account Lockout Policy in the same editor.", "Accept any auto-suggested related settings prompts."] }
  ]
},
{
  title: "3. Windows Updates & Patching",
  items: [
    { t: "Settings → Windows Update (or sconfig on Server Core) → check for and install all updates, reboot, repeat.",
      d: ["Win+I → Windows Update → Check for updates. Server Core: `sconfig` → option 6.", "Updates often arrive in waves — recheck after each reboot."] },
    { t: "Verify Defender/AV definitions are current; check for a GPO blocking Windows Update and fix 'Configure Automatic Updates'.",
      d: ["Windows Security → Virus & threat protection → Check for updates.", "gpmc.msc/gpedit.msc → Computer Config → Admin Templates → Windows Components → Windows Update — should not be Disabled."] },
    { t: "If WSUS is configured, verify the upstream server/URL is legitimate, not attacker-controlled.",
      d: ["Same Windows Update GPO path → 'Specify intranet Microsoft update service location' — correct or disable if pointing elsewhere."] },
    { t: "Update every other README-required/allowed application (Apache/XAMPP, SQL Server, Exchange, third-party tools), not just Windows — reinstall to the SAME default location (penalized otherwise).",
      d: ["Use each app's own updater or its installation console (e.g. SQL Server Installation Center)."] }
  ]
},
{
  title: "4. Malware & Unauthorized Software",
  items: [
    { t: "Compare installed software (Programs and Features / Get-Package) against README's authorized list; remove hacking/pentest tools (Wireshark, Nmap, Mimikatz, John, hydra) and unauthorized remote access tools (TeamViewer, AnyDesk, VNC).",
      d: ["appwiz.cpl or `Get-Package | Select Name, Version`.", "Check services.msc for a leftover service after uninstalling remote-access tools."] },
    { t: "Run a full AV scan; enable real-time protection, cloud-delivered protection, tamper protection.",
      d: ["Windows Security → Virus & threat protection → Scan options → Full scan → Scan now."] },
    { t: "Check for unauthorized persistence: Task Scheduler (especially tasks running as SYSTEM/Domain Admin), Startup items, and registry Run/RunOnce keys (HKLM + HKCU).",
      d: ["taskschd.msc — review Actions and 'Run as' user for every task.", "regedit → HKLM/HKCU \\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run and \\RunOnce."] },
    { t: "Search Temp/ProgramData/user profile folders for suspicious exe/bat/ps1/vbs files; check the hosts file for malicious redirects.",
      d: ["File Explorer → hidden items → C:\\Windows\\Temp, C:\\ProgramData, C:\\Users\\<user>.", "C:\\Windows\\System32\\drivers\\etc\\hosts — remove non-default entries."] },
    { t: "Review installed services for unfamiliar binaries running from AppData/Temp rather than System32/Program Files.",
      d: ["services.msc → for unfamiliar services, check Properties → 'Path to executable'."] }
  ]
},
{
  title: "5. Server Roles & Features",
  items: [
    { t: "Server Manager → confirm only README-required roles are installed (AD DS, DNS, DHCP, IIS, File and Storage Services, etc.) — remove unauthorized roles/features (including IIS if not required).",
      d: ["Manage → Remove Roles and Features — untick anything not authorized, Next, Remove, reboot if prompted."] },
    { t: "services.msc — disable unneeded, risky services not required by README (Telnet Server, FTP unless required, SMTP, Remote Registry, SNMP unless required).",
      d: ["Right-click each → Properties → Startup type Disabled → Stop if running."] },
    { t: "Disable SMBv1, TFTP Client, Telnet Client, and PowerShell v2 if not required.",
      d: ["Server Manager → Remove Roles and Features → Features page, or `Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol`."] }
  ]
},
{
  title: "6. Local Security Policy, GPO & Domain Policy",
  items: [
    { t: "Security Options (local and domain): Guest account status Disabled, blank passwords console-logon-only Enabled, do not display last username Enabled, require CTRL+ALT+DEL, anonymous SAM enumeration blocked, LAN Manager auth = NTLMv2 only, digitally sign server communications Enabled.",
      d: ["secpol.msc (member server) or the relevant GPO in gpmc.msc (DC) → Local Policies → Security Options — set each value listed in the title."] },
    { t: "UAC settings → Enabled, Always Notify.",
      d: ["Search 'Change User Account Control settings' → slider to Always Notify."] },
    { t: "Review GPOs linked at domain/OU level (gpmc.msc) for tampering; check Resultant Set of Policy (rsop.msc / gpresult /h report.html) for conflicts between local and domain-applied policy.",
      d: ["A malicious GPO can silently re-break the whole domain — unlink or fix any tampered GPO.", "`gpresult /h report.html` shows exactly which GPO wins each setting."] },
    { t: "Enable audit policy: logon events, account management, policy change, object access, directory service access (Success + Failure).",
      d: ["Local Policies → Audit Policy.", "Newer images may instead expect Advanced Audit Policy Configuration → System Audit Policies → Account Logon → Audit Credential Validation — check both locations."] },
    { t: "Restrict User Rights Assignment (Log on as a service / locally / from network) to only authorized accounts/groups.",
      d: ["Local Policies → User Rights Assignment — remove unauthorized accounts, add back only what's authorized."] }
  ]
},
{
  title: "7. Network Configuration",
  items: [
    { t: "Confirm the server uses a static IP with at least two configured DNS servers.",
      d: ["Network adapter → IPv4 Properties — confirm static IP, Preferred + Alternate DNS server fields set."] },
    { t: "Verify valid forward (A) and reverse (PTR) DNS records exist; test with nslookup / Resolve-DnsName.",
      d: ["dnsmgmt.msc → Forward/Reverse Lookup Zones.", "`nslookup <servername>` and `nslookup <ip>` to verify both directions."] },
    { t: "Ensure NTP/time sync is correct — a DC should sync to a reliable external source; member servers sync to the DC.",
      d: ["`w32tm /query /status` to check current source.", "PDC emulator: `w32tm /config /manualpeerlist:\"time.windows.com\" /syncfromflags:manual /reliable:yes /update` then restart the w32time service."] }
  ]
},
{
  title: "8. Firewall",
  items: [
    { t: "Windows Defender Firewall enabled for all 3 profiles; inbound = Block except for roles this server must serve (DNS 53, DHCP 67/68, web 80/443, AD ports), outbound = Allow.",
      d: ["wf.msc → Windows Defender Firewall Properties → each profile tab.", "Confirm the built-in rule groups for installed roles (DNS Server, DHCP Server, IIS, AD DS) stay enabled under Inbound Rules."] },
    { t: "Review inbound/outbound rules for unauthorized/overly permissive entries (Any/Any, high backdoor ports like 4444/1337/31337); remove rules tied to uninstalled software/roles.",
      d: ["wf.msc → Inbound/Outbound Rules, sort by name/port, Disable/Delete anything suspicious."] },
    { t: "Check netstat -ano for unexpected listening ports and identify the owning process/service.",
      d: ["`netstat -ano` → note unrecognized LISTENING PIDs → Task Manager → Details (or `tasklist /svc`) to investigate."] }
  ]
},
{
  title: "9. Active Directory Domain Services (if this box is a DC)",
  items: [
    { t: "dsa.msc — audit every user, group, and OU against the README's org chart; fix misplaced accounts, wrong enable/disable state, and stale/duplicate accounts.",
      d: ["Enable View → Advanced Features for full visibility.", "Right-click a misplaced account → Move...; right-click to Enable/Disable as needed."] },
    { t: "Check Domain Admins / Enterprise Admins / Schema Admins group membership carefully — these are prime tampering targets.",
      d: ["dsa.msc → Users container → double-click each group → Members tab → remove unauthorized, add back only README-authorized accounts."] },
    { t: "Verify FSMO role holders are on the expected DC(s) and AD replication is healthy.",
      d: ["`netdom query fsmo` — compare against expectations.", "`repadmin /replsummary` and `repadmin /showrepl` — investigate any errors."] },
    { t: "Verify SYSVOL and NETLOGON shares are intact and replicating; check AD Sites and Services for unexpected site/subnet changes.",
      d: ["`net share` should list SYSVOL and NETLOGON; browse both in File Explorer to confirm they're populated.", "dssite.msc — review Sites and Subnets against the expected network layout."] }
  ]
},
{
  title: "10. DNS Server Role (if present)",
  items: [
    { t: "dnsmgmt.msc — verify forward/reverse zones are configured correctly; remove unauthorized or suspicious A/CNAME records pointing to an unexpected IP.",
      d: ["Expand Forward/Reverse Lookup Zones — confirm expected zones exist.", "Review every A/CNAME record; recreate the legitimate one if overwritten."] },
    { t: "Verify zone transfers are restricted to authorized secondary servers (not 'to any server') and forwarders point to a legitimate upstream resolver; only enable DNSSEC/scavenging if README calls for it.",
      d: ["Zone Properties → Zone Transfers tab.", "Server Properties → Forwarders tab."] }
  ]
},
{
  title: "11. DHCP Server Role (if present)",
  items: [
    { t: "dhcpmgmt.msc — verify scope ranges/exclusions/reservations and scope options (DNS, gateway, domain name) match the README's network plan.",
      d: ["Expand server → IPv4 → each scope → check range and Scope/Server Options (003 Router, 006 DNS, 015 Domain Name)."] },
    { t: "Verify the DHCP server is authorized in AD; remove or disable rogue/unauthorized scopes.",
      d: ["A red down-arrow on the server icon means unauthorized — right-click → Authorize if it should be running."] }
  ]
},
{
  title: "12. IIS / File Services / Other Installed Roles",
  items: [
    { t: "IIS: update it, remove default sample sites, disable directory browsing, least-privilege app pool identities, remove unused modules, enforce HTTPS if a cert is expected.",
      d: ["IIS Manager → remove/stop Default Web Site if unused → Directory Browsing Disable → Application Pools → Advanced Settings → Identity."] },
    { t: "SQL Server (if installed): strong sa password, disable xp_cmdshell, least-privilege service account.",
      d: ["SSMS → Security → Logins → sa → set password.", "`EXEC sp_configure 'xp_cmdshell', 0; RECONFIGURE;`"] },
    { t: "File and Storage Services: audit shares (Computer Management → Shared Folders) — remove unauthorized shares, tighten share + NTFS permissions.",
      d: ["compmgmt.msc → Shared Folders → Shares."] },
    { t: "FTP (if required): disable anonymous access, prefer FTPS. Apache (e.g. XAMPP, if required): disable ServerSignature and set ServerTokens Prod.",
      d: ["IIS Manager → FTP Authentication → disable Anonymous.", "Edit `httpd.conf`: `ServerSignature Off`, `ServerTokens Prod`, then restart Apache."] }
  ]
},
{
  title: "13. Remote Access (RDP / WinRM)",
  items: [
    { t: "Disable Remote Desktop unless explicitly required (if required, enable NLA and restrict via the Remote Desktop Users group); disable Remote Assistance.",
      d: ["sysdm.cpl → Remote tab.", "lusrmgr.msc/dsa.msc → Remote Desktop Users → Members tab — remove unauthorized, add only authorized admins."] },
    { t: "If PowerShell Remoting (WinRM) is enabled but not required, disable it or restrict TrustedHosts.",
      d: ["`Disable-PSRemoting -Force` if not required, or `winrm set winrm/config/client @{TrustedHosts=\"<specific-hosts>\"}` if required."] }
  ]
},
{
  title: "14. File System, Permissions & Data",
  items: [
    { t: "Search for and remove prohibited files per README categories (media, unauthorized archives, unrecognized scripts).",
      d: ["File Explorer search *.mp3/*.mp4/*.avi/*.zip/*.rar/*.ps1/*.bat scoped to C:\\Users and shared data folders."] },
    { t: "Check permissions on sensitive directories (System32, SYSVOL, profiles) — no unauthorized 'Everyone: Full Control'; verify shared folder permissions match least-privilege/README spec.",
      d: ["Right-click folder → Properties → Security tab.", "compmgmt.msc → Shared Folders → check both Share Permissions and NTFS Security tab."] },
    { t: "Check Recycle Bin/hidden files for contraband; only enable BitLocker/EFS if explicitly instructed.",
      d: ["Encrypting blindly can break the scoring engine's access to the disk."] }
  ]
},
{
  title: "15. Miscellaneous Hardening",
  items: [
    { t: "Enable screen lock/screensaver with password, reasonable timeout.",
      d: ["Right-click Desktop → Personalize → Lock screen → Screen saver settings."] },
    { t: "Verify system time/timezone correctness (critical for AD Kerberos auth and log accuracy).",
      d: ["Right-click taskbar clock → Adjust date/time — confirm timezone and sync (see Section 7)."] },
    { t: "Check Event Viewer (Security, and Directory Service on a DC) for signs of compromise tied to forensics questions.",
      d: ["eventvwr.msc — filter/sort around the timeframe mentioned in forensics questions."] },
    { t: "Confirm every README-listed critical service/role is still running after EVERY major change — a broken DC/DNS/DHCP tanks the whole team's score.",
      d: ["services.msc — verify Running/Automatic; re-check the Scoring Report after each major change."] }
  ]
},
{
  title: "16. Advanced Hardening (if time remains)",
  items: [
    { t: "Disable WDigest (UseLogonCredential=0) and enable LSA protection (RunAsPPL=1) on every server, especially DCs — verify required security/monitoring software still works afterward.",
      d: ["regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\WDigest → UseLogonCredential = 0.", "regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa → RunAsPPL = 1 (reboot required)."] },
    { t: "Add sensitive admin accounts to the built-in Protected Users group to block NTLM/weak-crypto Kerberos for them — verify they can still authenticate afterward.",
      d: ["dsa.msc → Protected Users group → Members tab → Add Domain Admins/critical accounts (Kerberos-only, no NTLM/DES/RC4 once added)."] },
    { t: "Disable the Print Spooler service on Domain Controllers unless explicitly required — PrintNightmare (CVE-2021-34527) is a domain-wide privilege-escalation vector.",
      d: ["services.msc → Print Spooler → Stop → Startup type Disabled."] }
  ]
},
{
  title: "17. Finals-Round Notes",
  items: [
    { t: "Expect GPO traps from the Default Domain Policy or an OU-linked GPO that silently re-disable Defender/re-enable Guest/lower password policy on refresh — check rsop.msc/gpresult, not just local secpol.",
      d: ["`gpresult /h report.html` shows which GPO wins; fix/unlink the offending GPO in gpmc.msc, not just the local setting."] },
    { t: "Watch for intentionally broken DNS, replication issues between DCs, or FSMO roles seized/moved incorrectly, or a rogue DHCP/DNS server on the segment.",
      d: ["Re-verify with `repadmin`, `nslookup`, and `netdom query fsmo` after any AD/DNS changes."] },
    { t: "Track score after each category — investigate/revert immediately if a change doesn't help. Time budget for a 4-hour round: 0:00–0:15 forensics+baseline, 0:15–1:00 accounts+password policy, 1:00–1:45 updates+malware+roles, 1:45–2:30 GPO+firewall+network, 2:30–3:15 AD/DNS/DHCP+file system, 3:15–3:45 second README pass, 3:45–4:00 final check.",
      d: ["If behind schedule, prioritize AD/DNS/DHCP and account/password sections — they carry the most weight and affect the whole team."] }
  ]
}
];

const QUICK_REF_WINDOWS_SERVER = [
  ["Server Manager", "ServerManager.exe"],
  ["Active Directory Users and Computers", "dsa.msc"],
  ["Group Policy Management", "gpmc.msc"],
  ["Resultant Set of Policy", "rsop.msc / gpresult /h report.html"],
  ["DNS Manager", "dnsmgmt.msc"],
  ["DHCP Console", "dhcpmgmt.msc"],
  ["Local Security Policy", "secpol.msc"],
  ["Local Users and Groups", "lusrmgr.msc"],
  ["Services", "services.msc"],
  ["Task Scheduler", "taskschd.msc"],
  ["Computer Management", "compmgmt.msc"],
  ["Shared Folders (GUI)", "fsmgmt.msc"],
  ["AD replication summary", "repadmin /replsummary"],
  ["Show FSMO role holders", "netdom query fsmo"],
  ["Time sync status", "w32tm /query /status"],
  ["Open ports/connections", "netstat -ano"],
  ["Event Viewer", "eventvwr.msc"],
  ["Server Core config menu", "sconfig"]
];
