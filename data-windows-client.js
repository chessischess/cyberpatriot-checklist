const DATA_WINDOWS_CLIENT = [
{
  title: "1. User Accounts & Password Policy",
  items: [
    { t: "Open Local Users and Groups (lusrmgr.msc) or net user — cross-reference every account against README's authorized list; delete/disable unauthorized ones (disable first if unsure).",
      d: ["Press Win+R, type `lusrmgr.msc`, press Enter (or `net user` from an admin Command Prompt for a quick text list).", "Go through each account and mark it authorized or unauthorized — watch for near-identical names (e.g. 'Admin' vs 'Admln').", "Right-click an unauthorized account → Properties → check 'Account is disabled' (safer, reversible), or → Delete if certain it's malicious."] },
    { t: "Verify membership of Administrators AND every other group named in the README (Remote Desktop Users, Backup Operators, custom groups, etc.) — remove unauthorized members, add missing authorized ones.",
      d: ["Command Prompt as Administrator: `net localgroup administrators` — remove with `/delete`, add with `/add`.", "For any other group named in the README: `lusrmgr.msc` → Groups → double-click the group, Remove/Add as needed.", "Custom/non-Administrators group membership is scored just as often as the Administrators group — don't skip these."] },
    { t: "Ensure Guest account is disabled.",
      d: ["In lusrmgr.msc → Users, right-click 'Guest' → Properties → check 'Account is disabled' → OK.", "Verify from cmd: `net user Guest` and confirm 'Account active' shows 'No'."] },
    { t: "Check for hidden accounts (SpecialAccounts\\UserList registry key) and Autologon (Winlogon\\AutoAdminLogon) — remove/disable if present.",
      d: ["Press Win+R, type `regedit`, press Enter.", "Check HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList — remove unauthorized hidden entries.", "In the same Winlogon key, if `AutoAdminLogon` = 1, set it to 0 and clear `DefaultPassword` if present."] },
    { t: "Set a strong, compliant password for every authorized account, including your own.",
      d: ["In lusrmgr.msc → Users, right-click a user → Set Password.", "Use 12+ characters with upper/lower/number/symbol."] },
    { t: "Password Policy (secpol.msc → Account Policies → Password Policy): history 24, max age 60–90 days, min age 1+ day, min length 8+ (14 for finals), complexity Enabled, reversible encryption Disabled.",
      d: ["Press Win+R, type `secpol.msc`, press Enter, navigate to Account Policies → Password Policy.", "Set each setting listed in the title by double-clicking it and entering the value, then OK."] },
    { t: "Account Lockout Policy: duration 15–30 min, threshold 5–50 (never below 5 — CyberPatriot penalizes that), reset counter 15–30 min.",
      d: ["Same secpol.msc → Account Policies → Account Lockout Policy.", "Set Account lockout duration, Account lockout threshold, and Reset account lockout counter after to the values in the title.", "Accept the auto-suggested related settings dialog if it appears."] }
  ]
},
{
  title: "2. Windows Updates & Patching",
  items: [
    { t: "Settings → Update & Security → Windows Update → check and install all updates (multiple passes/reboots).",
      d: ["Press Win+I, go to Update & Security (Win10) or Windows Update (Win11).", "Click 'Check for updates', install, reboot when prompted, then repeat the check."] },
    { t: "Set update settings to automatic if disabled; verify Defender definitions are current.",
      d: ["Settings → Windows Update → Advanced options — ensure updates aren't paused.", "Windows Security → Virus & threat protection → Check for updates."] },
    { t: "Check gpedit.msc for a GPO blocking updates — fix Configure Automatic Updates policy.",
      d: ["Computer Configuration → Administrative Templates → Windows Components → Windows Update.", "'Configure Automatic Updates' should be Enabled or Not Configured, not Disabled."] },
    { t: "Update every other README-required/allowed application (browser, Java, Apache/XAMPP, etc.), not just Windows itself.",
      d: ["Use each app's own 'Check for updates', or check `appwiz.cpl` for outdated versions.", "Install/reinstall to the SAME default location the app already uses — 'not installed at default location' is a scored penalty."] }
  ]
},
{
  title: "3. Malware, Unwanted & Unauthorized Software",
  items: [
    { t: "Programs and Features (appwiz.cpl) — compare vs README's authorized list; uninstall hacking tools (Wireshark, Nmap, Metasploit, netcat, John, hydra) and unauthorized remote access tools (TeamViewer, AnyDesk, VNC).",
      d: ["Press Win+R, type `appwiz.cpl`, sort by name, uninstall anything not on the authorized list.", "Check services.msc for a leftover service after uninstalling remote-access tools."] },
    { t: "Run a full Windows Defender scan; enable real-time protection, cloud-delivered protection, and tamper protection.",
      d: ["Windows Security → Virus & threat protection → Scan options → Full scan.", "Manage settings → toggle on Real-time protection, Cloud-delivered protection, Tamper Protection."] },
    { t: "Set Windows Defender SmartScreen (Explorer and Edge) to Warn or Block, not disabled.",
      d: ["gpedit.msc → Computer Configuration → Administrative Templates → Windows Components → Windows Defender SmartScreen → Explorer → 'Configure Windows Defender SmartScreen' → Enabled → Warn.", "Repeat for the Microsoft Edge SmartScreen settings in the same tree."] },
    { t: "Check for unauthorized persistence: Task Scheduler (taskschd.msc), Startup apps (Task Manager/msconfig), and registry Run/RunOnce keys (HKLM + HKCU).",
      d: ["taskschd.msc — review every task, especially ones running scripts from Temp/AppData.", "Task Manager → Startup tab — disable unrecognized entries.", "regedit → check HKLM and HKCU \\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run and \\RunOnce — delete unauthorized entries."] },
    { t: "Check services.msc and running processes (Task Manager → Details) for unfamiliar/malicious items — research before killing.",
      d: ["Right-click a process → Open file location before deciding to end it.", "If confirmed malicious: End task, then remove its files and any Run key/service entry."] },
    { t: "Search AppData\\Roaming, Local\\Temp, ProgramData, Windows\\Temp, and C:\\Users\\Public\\Downloads for suspicious exe/bat/ps1/vbs files; check the hosts file for malicious redirects.",
      d: ["File Explorer → enable 'Show hidden items' → search *.exe/*.bat/*.ps1/*.vbs in those folders.", "Open Notepad as Administrator → open C:\\Windows\\System32\\drivers\\etc\\hosts → remove any non-default redirect lines."] }
  ]
},
{
  title: "4. Services & Windows Features",
  items: [
    { t: "services.msc — disable/stop unneeded, risky services not required by README (Telnet, FTP, SMTP, Remote Registry, SNMP, Simple TCP/IP, Fax).",
      d: ["Right-click each risky service → Properties → Startup type Disabled → Stop if running → OK."] },
    { t: "Turn Windows features on/off (optionalfeatures.exe): disable Telnet Client, TFTP Client, SMB 1.0/CIFS, unneeded IIS components.",
      d: ["Untick each unneeded feature and click OK, reboot if prompted.", "SMB1 can also be removed via `Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol` in an admin PowerShell."] },
    { t: "Remote Desktop: disable unless explicitly required (if required, enable NLA and restrict users); disable Remote Assistance.",
      d: ["sysdm.cpl → Remote tab → 'Don't allow remote connections' unless required.", "If required: 'Allow connections only from computers running Remote Desktop with NLA', then Select Users to restrict access.", "Untick 'Allow Remote Assistance connections to this computer'."] },
    { t: "Disable AutoPlay/AutoRun for all drives via gpedit.msc.",
      d: ["Computer Configuration → Administrative Templates → Windows Components → AutoPlay Policies → 'Turn off AutoPlay' → Enabled → All drives."] }
  ]
},
{
  title: "5. Local Security Policy & Group Policy",
  items: [
    { t: "Security Options (secpol.msc → Local Policies → Security Options): Guest account status Disabled, blank passwords console-logon-only Enabled, do not display last username Enabled, require CTRL+ALT+DEL (set 'Do not require' to Disabled), anonymous SAM enumeration blocked (Enabled), LAN Manager auth level = NTLMv2 only, digitally sign server communications Enabled.",
      d: ["Double-click each named setting under Local Policies → Security Options and set the value shown in the title, then OK."] },
    { t: "UAC settings → Enabled, Always Notify (not 'Never notify').",
      d: ["Search 'Change User Account Control settings' → move the slider to Always notify → OK."] },
    { t: "User Rights Assignment: restrict Log on as a service / locally / network access to authorized accounts; deny log on locally for Guest; remove unauthorized users from Debug programs, Take ownership, Act as part of the OS, Back up files.",
      d: ["secpol.msc → Local Policies → User Rights Assignment.", "For each right listed, remove unauthorized users/groups and add back only README-authorized ones."] },
    { t: "Audit Policy: enable Success + Failure auditing for logon events, account management, policy change, object access.",
      d: ["secpol.msc → Local Policies → Audit Policy — check both Success and Failure for each category.", "Newer images may instead expect Advanced Audit Policy Configuration → System Audit Policies → Account Logon → Audit Credential Validation — check both locations."] },
    { t: "Check gpedit.msc for suspicious custom policies weakening security (e.g. Defender or Updates disabled via policy) — reset to secure defaults.",
      d: ["Browse Computer Configuration → Administrative Templates, especially Windows Components → Windows Defender and Windows Update.", "Set anything suspiciously Disabled back to Not Configured or the secure value."] }
  ]
},
{
  title: "6. Firewall & Network",
  items: [
    { t: "Windows Defender Firewall enabled for all 3 profiles (Domain, Private, Public); default inbound = Block, outbound = Allow.",
      d: ["wf.msc → Windows Defender Firewall Properties → each profile tab → Firewall state On, Inbound Block, Outbound Allow."] },
    { t: "Review inbound/outbound rules for unauthorized or overly permissive entries (high ports like 4444/1337/31337, Any/Any rules); remove rules for uninstalled software.",
      d: ["wf.msc → Inbound Rules / Outbound Rules — sort by name/port, Disable or Delete suspicious rules."] },
    { t: "Check netstat -ano for unexpected listening ports and investigate the owning process.",
      d: ["Admin Command Prompt: `netstat -ano` — note unrecognized LISTENING ports and PIDs.", "Task Manager → Details (or `tasklist /svc`) to identify and investigate the process."] },
    { t: "Review network shares (net share, or fsmgmt.msc GUI) — remove unauthorized ones, tighten share + NTFS permissions.",
      d: ["`net share` to list, `net share <name> /delete` to remove — or fsmgmt.msc → Shares → Stop Sharing.", "For required shares, right-click folder → Properties → Sharing/Security tabs to tighten to least privilege."] }
  ]
},
{
  title: "7. File System, Permissions & Data",
  items: [
    { t: "Search for and remove prohibited files per README categories: media (mp3/mp4/avi/mkv/mov/wav), non-work images (jpg/png/gif), unrecognized scripts (exe/bat/ps1/vbs/py), and archives (zip/rar/7z) that might hide contraband.",
      d: ["File Explorer search scoped to C:\\Users for each extension.", "Inspect archives/scripts before deleting — don't touch files referenced by forensics questions."] },
    { t: "Check permissions on sensitive directories (System32, user profiles, shared folders) — no unauthorized 'Everyone: Full Control'; verify shared folder permissions match least-privilege/README spec.",
      d: ["Right-click the folder → Properties → Security tab — remove/reduce overly broad entries.", "Check both the Sharing (Advanced Permissions) and Security (NTFS) tabs for shared folders."] },
    { t: "Check Recycle Bin and hidden/system files for hidden contraband.",
      d: ["Review the Recycle Bin.", "File Explorer → View → check 'Hidden items' and browse user folders again."] }
  ]
},
{
  title: "8. Application-Specific Roles (if present)",
  items: [
    { t: "IIS: update it, remove default sample sites, disable directory browsing, least-privilege app pool identities; disable anonymous FTP access, prefer TLS.",
      d: ["IIS Manager → remove/stop unused Default Web Site.", "Site → Directory Browsing → Disable.", "Application Pools → Advanced Settings → Identity → confirm least-privilege account.", "FTP site → FTP Authentication → Anonymous Disabled."] },
    { t: "SQL Server: set a strong sa password, disable xp_cmdshell, least-privilege service accounts.",
      d: ["SSMS → Security → Logins → sa → Properties → set password.", "New Query: `EXEC sp_configure 'xp_cmdshell', 0; RECONFIGURE;`"] },
    { t: "Apache (e.g. XAMPP, if installed/required): disable ServerSignature and set ServerTokens to hide version info.",
      d: ["Edit `httpd.conf` (often `C:\\xampp\\apache\\conf\\httpd.conf`): `ServerSignature Off`, `ServerTokens Prod`.", "Restart Apache via the XAMPP Control Panel or `httpd -k restart`."] }
  ]
},
{
  title: "9. Miscellaneous Hardening",
  items: [
    { t: "Enable screen lock/screensaver with password, 10–15 min timeout.",
      d: ["Right-click Desktop → Personalize → Lock screen → Screen saver settings → set Wait 10-15 min, check 'On resume, display logon screen'."] },
    { t: "Verify system time/timezone is correct (affects logs/auditing).",
      d: ["Right-click the taskbar clock → Adjust date/time → confirm timezone and 'Set time automatically' is on."] },
    { t: "Check Event Viewer briefly for signs of compromise tied to forensics questions.",
      d: ["eventvwr.msc → Windows Logs → Security/System — look for unusual logon events (4624/4625) around the relevant time window."] },
    { t: "Confirm README critical services are still running after EVERY major change.",
      d: ["services.msc — check Status = Running for each README-named service.", "Re-check the Scoring Report after each big change."] }
  ]
},
{
  title: "10. Advanced Hardening (if time remains)",
  items: [
    { t: "Disable WDigest (UseLogonCredential=0) and enable LSA protection (RunAsPPL=1) so plaintext creds aren't cached and LSASS is a protected process.",
      d: ["regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\WDigest → `UseLogonCredential` = 0.", "regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa → `RunAsPPL` = 1 (reboot required)."] },
    { t: "Disable the PowerShell v2 engine and enable Script Block/Module Logging.",
      d: ["optionalfeatures.exe → untick 'Windows PowerShell 2.0 Engine' (or `Disable-WindowsOptionalFeature -Online -FeatureName MicrosoftWindowsPowerShellV2Root`).", "gpedit.msc → Windows Components → Windows PowerShell → enable Script Block Logging and Module Logging."] },
    { t: "Disable the Print Spooler service if this machine doesn't need to print — mitigates PrintNightmare (CVE-2021-34527).",
      d: ["services.msc → Print Spooler → Stop → Startup type Disabled.", "Skip if the README requires printing on this machine."] }
  ]
},
{
  title: "11. Finals-Round Notes",
  items: [
    { t: "Expect GPO traps that silently re-disable Defender / re-enable Guest / lower the password policy on refresh — check rsop.msc for conflicts, not just secpol.msc.",
      d: ["rsop.msc shows the effective resulting policy.", "If something reverts, `gpresult /h report.html` shows which policy is winning — fix or unlink it."] },
    { t: "Track score after each category — if a change doesn't move the score or drops it, investigate/revert immediately.",
      d: ["Check the Scoring Report after each section; undo and re-verify if a change didn't help or hurt the score."] },
    { t: "Time budget for a 4-hour round: 0:00–0:15 forensics/baseline, 0:15–1:00 users/policy, 1:00–1:45 updates+malware, 1:45–2:30 services+firewall, 2:30–3:15 files+misc, 3:15–3:45 second README pass, 3:45–4:00 final check.",
      d: ["If running behind, prioritize accounts/policy and services over cosmetic items."] }
  ]
}
];

const QUICK_REF_WINDOWS_CLIENT = [
  ["Local Users and Groups", "lusrmgr.msc"],
  ["Local Security Policy", "secpol.msc"],
  ["Group Policy Editor", "gpedit.msc"],
  ["Resultant Set of Policy", "rsop.msc"],
  ["Services", "services.msc"],
  ["Task Scheduler", "taskschd.msc"],
  ["Computer Management", "compmgmt.msc"],
  ["Windows Features", "optionalfeatures.exe"],
  ["System Config", "msconfig"],
  ["Shared Folders (GUI)", "fsmgmt.msc"],
  ["Network shares", "net share"],
  ["List all users", "net user"],
  ["Admin group members", "net localgroup administrators"],
  ["Open ports/connections", "netstat -ano"],
  ["Event Viewer", "eventvwr.msc"],
  ["Registry Editor", "regedit"]
];
