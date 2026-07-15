const DATA_WINDOWS_SERVER = [
{
  title: "0. Before You Touch Anything",
  items: [
    { t: "Identify the server's role(s): standalone server, member server, or Domain Controller (check with Server Manager dashboard / presence of dsa.msc).",
      d: ["Open Server Manager (opens automatically on login, or search 'Server Manager').", "Look at the Dashboard → 'Roles and Server Groups' panel to see installed roles.", "Try Win+R, type `dsa.msc` — if it opens Active Directory Users and Computers, this box is a Domain Controller."] },
    { t: "Screenshot the current Scoring Report score before making changes.",
      d: ["Open the Scoring Report application.", "Press Win+Shift+S to screenshot it, save with a timestamp."] },
    { t: "Answer forensics questions first, before the system state changes.",
      d: ["Locate the forensics question file per the README.", "Investigate read-only first (Event Viewer, AD Users and Computers, file browsing) before making fixes.", "Save your answers in the exact format/location specified."] },
    { t: "If a packet capture (.pcap/.pcapng) is provided as part of forensics, open it in Wireshark to identify attacker source IPs.",
      d: ["Open the file in Wireshark (install it temporarily if needed — remove it again afterward if not README-authorized).", "Use Statistics → Conversations (or Statistics → Endpoints) to see which IPs talked to which, sorted by packet/byte count.", "Look for a source IP hitting many ports/hosts in a short time (scan pattern) or repeated failed-auth-style traffic — that's usually the attacker.", "Cross-reference suspicious IPs against the ones referenced in the forensics questions."] }
  ]
},
{
  title: "1. Local & Domain User Accounts",
  items: [
    { t: "Local Users and Groups (lusrmgr.msc) on member servers; Active Directory Users and Computers (dsa.msc) if this is a DC.",
      d: ["Press Win+R, type `lusrmgr.msc` for local accounts (member servers only — not available on a DC).", "On a DC, press Win+R, type `dsa.msc` instead to manage domain accounts."] },
    { t: "Cross-reference every local AND domain account against the README's authorized user/admin list.",
      d: ["Go through every account in lusrmgr.msc and/or dsa.msc.", "Mark each as authorized or unauthorized against your notes from Section 0.", "Watch for lookalike names."] },
    { t: "Disable or remove unauthorized accounts — disable first if unsure whether it's a service account in use.",
      d: ["Right-click the account → Properties (dsa.msc) or Properties (lusrmgr.msc) → check/tick 'Account is disabled', click OK.", "If certain it's not a needed service account and is malicious, right-click → Delete instead."] },
    { t: "Verify local Administrators group AND Domain Admins / Enterprise Admins group membership — remove unauthorized members.",
      d: ["Open Command Prompt as Administrator, run `net localgroup administrators` for local admins.", "In dsa.msc, open the 'Users' container, double-click 'Domain Admins' → Members tab; repeat for 'Enterprise Admins'.", "Select an unauthorized member and click Remove; click Add to add an authorized member."] },
    { t: "Ensure the Guest account (local and domain) is disabled.",
      d: ["lusrmgr.msc → Users → right-click Guest → Properties → check 'Account is disabled' → OK.", "dsa.msc → Users container → right-click Guest → Disable Account."] },
    { t: "Do not disable the built-in Administrator account by default on a DC — some AD recovery tasks require it; only change per README.",
      d: ["Leave the built-in Administrator account as-is on a DC unless the README explicitly instructs otherwise.", "If instructed, set a strong password rather than disabling it outright."] },
    { t: "Check for duplicate/stale AD accounts, accounts in the wrong OU, or accounts with unexpected UPNs.",
      d: ["In dsa.msc, enable Advanced Features (View menu) for full visibility.", "Browse each Organizational Unit and compare accounts/placement against the README's org chart.", "Right-click a misplaced account → Move... to relocate it to the correct OU."] },
    { t: "Check for hidden local accounts via SpecialAccounts\\UserList registry key and net user.",
      d: ["Press Win+R, type `regedit`, navigate to HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList.", "Investigate and remove unauthorized entries.", "Cross-check with `net user` from an admin Command Prompt."] },
    { t: "Set strong, compliant passwords for all authorized local and domain accounts.",
      d: ["lusrmgr.msc: right-click user → Set Password.", "dsa.msc: right-click user → Reset Password.", "Use a password meeting complexity requirements (12+ chars, mixed case, number, symbol)."] },
    { t: "Check Autologon registry key (Winlogon\\AutoAdminLogon) — disable if present.",
      d: ["regedit → HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon.", "If AutoAdminLogon = 1, set it to 0 and clear DefaultPassword if present."] },
    { t: "Verify service accounts (SQL, IIS app pool, backup agents) have least-privilege, not blanket Domain Admin.",
      d: ["In dsa.msc, find each known service account.", "Check its group memberships (Member Of tab) — it should not be in Domain Admins unless the README explicitly requires it.", "Remove excess group memberships and add only what's needed."] }
  ]
},
{
  title: "2. Password & Account Lockout Policy",
  items: [
    { t: "On a Domain Controller, edit the Default Domain Policy (Group Policy Management) — local secpol.msc password policy is ignored for domain accounts.",
      d: ["Press Win+R, type `gpmc.msc`, press Enter.", "Expand Forest → Domains → your domain → Group Policy Objects.", "Right-click 'Default Domain Policy' → Edit."] },
    { t: "Password history: enforce 24 remembered.",
      d: ["In the Group Policy Management Editor, go to Computer Configuration → Policies → Windows Settings → Security Settings → Account Policies → Password Policy → Enforce password history.", "Double-click, set to 24, click OK."] },
    { t: "Maximum password age: 60–90 days (not 0/never).",
      d: ["Same Password Policy node → Maximum password age.", "Double-click, set 60-90, click OK."] },
    { t: "Minimum password age: 1+ day.",
      d: ["Same node → Minimum password age.", "Double-click, set to 1 or higher, click OK."] },
    { t: "Minimum password length: 8+ (14 recommended for finals).",
      d: ["Same node → Minimum password length.", "Double-click, set to 8 (or 14), click OK."] },
    { t: "Password must meet complexity requirements: Enabled.",
      d: ["Same node → Password must meet complexity requirements.", "Double-click, select Enabled, click OK."] },
    { t: "Store passwords using reversible encryption: Disabled.",
      d: ["Same node → Store passwords using reversible encryption.", "Double-click, select Disabled, click OK."] },
    { t: "Account lockout duration / threshold / reset counter: 15–30 min, 3–5 attempts, 15–30 min.",
      d: ["Go to Account Lockout Policy in the same Group Policy Editor.", "Set Account lockout duration to 15-30, Account lockout threshold to 3-5, Reset account lockout counter after to 15-30.", "Accept any auto-suggested related settings prompts."] },
    { t: "On member servers without a DC role, also set local Account Policy (secpol.msc) the same way.",
      d: ["Press Win+R, type `secpol.msc` on the member server.", "Repeat the same Password Policy and Account Lockout Policy settings locally as done above for the domain."] },
    { t: "Enforce fine-grained password policies (PSOs) only if README specifically calls for them.",
      d: ["Only if required: open Active Directory Administrative Center, select System → Password Settings Container, create/edit a Password Settings Object per README's exact spec."] }
  ]
},
{
  title: "3. Windows Updates & Patching",
  items: [
    { t: "Settings → Update & Security (or sconfig on Server Core) → check for and install all updates, reboot, repeat.",
      d: ["Press Win+I → Update & Security → Windows Update → Check for updates.", "On Server Core, type `sconfig` at the command prompt, choose option 6 (Download and Install Updates).", "Install everything found, reboot, and re-check — updates often arrive in waves."] },
    { t: "Verify Windows Defender / configured AV definitions are current.",
      d: ["Open Windows Security (or Windows Defender on Server) → Virus & threat protection → Check for updates.", "Click 'Check for updates' under Virus & threat protection updates."] },
    { t: "Check for a GPO blocking Windows Update (Computer Config → Admin Templates → Windows Components → Windows Update) and fix it.",
      d: ["In gpmc.msc, edit the relevant GPO (Default Domain Policy or local gpedit.msc on a member server).", "Navigate to Computer Configuration → Administrative Templates → Windows Components → Windows Update.", "Ensure 'Configure Automatic Updates' isn't set to Disabled; fix as needed."] },
    { t: "If WSUS is configured, verify the upstream server/URL is legitimate, not redirected to an attacker-controlled host.",
      d: ["In the same Windows Update GPO path, check 'Specify intranet Microsoft update service location'.", "Verify the URL points to your legitimate WSUS server; correct or disable the policy if it points elsewhere."] },
    { t: "Patch any other installed Microsoft server products (SQL Server, Exchange, IIS extensions) if present.",
      d: ["Open the relevant product's update mechanism (e.g. SQL Server Installation Center, Microsoft Update Catalog) and install available patches per the README's allowances."] },
    { t: "Update every other README-required/allowed application (Apache/XAMPP, third-party tools, etc.), not just Windows itself.",
      d: ["Open each required application and use its own 'Check for updates' feature, or check `appwiz.cpl` for outdated versions.", "For apps with no auto-updater, download the latest installer from the vendor and reinstall over the existing version."] }
  ]
},
{
  title: "4. Malware & Unauthorized Software",
  items: [
    { t: "Compare installed software (Programs and Features / Get-Package) against the README's authorized list.",
      d: ["Press Win+R, type `appwiz.cpl`, review the full list.", "Or in PowerShell run `Get-Package | Select Name, Version` for a text listing.", "Note everything not on the authorized list."] },
    { t: "Remove hacking/pentest tools (Wireshark, Nmap, Metasploit, netcat, Mimikatz, John, hydra).",
      d: ["In appwiz.cpl, select each tool → Uninstall.", "Manually delete leftover folders/binaries for tools with no uninstaller entry."] },
    { t: "Remove unauthorized remote access tools (TeamViewer, AnyDesk, unauthorized VNC).",
      d: ["Uninstall via appwiz.cpl.", "Check services.msc for a leftover service and disable/remove it if present."] },
    { t: "Run a full AV scan; enable real-time protection, cloud-delivered protection, tamper protection.",
      d: ["Open Windows Security → Virus & threat protection → Scan options → Full scan → Scan now.", "Manage settings → enable Real-time protection, Cloud-delivered protection, Tamper Protection."] },
    { t: "Check Task Scheduler for unauthorized scheduled tasks, especially ones running as SYSTEM or Domain Admin.",
      d: ["Press Win+R, type `taskschd.msc`.", "Review every task's Actions and 'Run as' user under General tab.", "Disable/delete anything unauthorized, especially tasks running as SYSTEM/Domain Admin executing scripts from Temp/AppData."] },
    { t: "Check Startup items and registry Run/RunOnce keys (HKLM and HKCU) for persistence.",
      d: ["Task Manager (Ctrl+Shift+Esc) → Startup tab, disable unauthorized entries.", "regedit → check HKLM and HKCU \\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run and \\RunOnce, delete unauthorized entries."] },
    { t: "Search Temp, ProgramData, and user profile folders for suspicious exe/bat/ps1/vbs files.",
      d: ["File Explorer → enable hidden items → browse C:\\Windows\\Temp, C:\\ProgramData, and each C:\\Users\\<user> profile.", "Use search filters *.exe, *.bat, *.ps1, *.vbs to find and investigate suspicious files."] },
    { t: "Check the hosts file (System32\\drivers\\etc\\hosts) for malicious redirects.",
      d: ["Open Notepad as Administrator, open C:\\Windows\\System32\\drivers\\etc\\hosts.", "Remove any non-default entries redirecting legitimate domains.", "Save the file."] },
    { t: "Review installed Windows Services for unfamiliar binaries running from unusual paths (AppData, Temp) rather than System32/Program Files.",
      d: ["services.msc → for each unfamiliar service, right-click → Properties, check the 'Path to executable'.", "If it points to AppData/Temp instead of System32/Program Files, investigate and disable/remove it."] }
  ]
},
{
  title: "5. Server Roles & Features",
  items: [
    { t: "Open Server Manager → Manage → Add/Remove Roles and Features — confirm only README-required roles are installed (AD DS, DNS, DHCP, IIS, File and Storage Services, etc.).",
      d: ["Open Server Manager → Manage menu (top right) → Remove Roles and Features (or Add Roles and Features to check what's installed).", "Step through the wizard to Server Roles and note everything currently checked."] },
    { t: "Remove roles/features that are installed but not authorized — reduces attack surface and often scores points directly.",
      d: ["In the same Remove Roles and Features wizard, untick unauthorized roles/features.", "Click Next through the wizard and click Remove, reboot if prompted."] },
    { t: "services.msc — disable unneeded, risky services not required by README (Telnet Server, FTP unless required, Remote Registry, SNMP unless required).",
      d: ["Press Win+R, type `services.msc`.", "Right-click each risky service → Properties → Startup type: Disabled → Stop if running → OK."] },
    { t: "Disable SMBv1 (Windows Features) — legacy, exploitable (EternalBlue).",
      d: ["Server Manager → Manage → Remove Roles and Features → Features page → untick 'SMB 1.0/CIFS File Sharing Support', or in PowerShell run `Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol`."] },
    { t: "Disable Windows Features not in use: TFTP Client, Telnet Client, PowerShell v2 (legacy, weaker logging) if not required.",
      d: ["Server Manager → Manage → Remove Roles and Features → Features page.", "Untick TFTP Client, Telnet Client, and 'Windows PowerShell 2.0 Engine' if listed and not required."] },
    { t: "If the IIS role is present but not required by README, remove it entirely rather than just stopping the service.",
      d: ["Server Manager → Manage → Remove Roles and Features → Server Roles page → untick Web Server (IIS) → Next → Remove."] },
    { t: "Verify no unexpected server roles are installed on what should be a single-purpose box.",
      d: ["Review the full Server Roles checklist in the wizard one more time against the README's stated purpose for this box; remove anything extraneous."] }
  ]
},
{
  title: "6. Local Security Policy, GPO & Domain Policy",
  items: [
    { t: "Guest account status → Disabled (Security Options), both local and domain.",
      d: ["secpol.msc (member server) or edit the appropriate GPO in gpmc.msc (DC) → Local Policies → Security Options → Accounts: Guest account status.", "Set to Disabled, click OK."] },
    { t: "Limit local account use of blank passwords to console logon only → Enabled.",
      d: ["Same Security Options node → set to Enabled, click OK."] },
    { t: "Do not display last user name at logon → Enabled.",
      d: ["Security Options → Interactive logon: Do not display last signed-in → Enabled → OK."] },
    { t: "Interactive logon: require CTRL+ALT+DEL → Enabled.",
      d: ["Security Options → Interactive logon: Do not require CTRL+ALT+DEL → set to Disabled (which means CTRL+ALT+DEL IS required) → OK."] },
    { t: "Network access: do not allow anonymous enumeration of SAM accounts/shares → Enabled.",
      d: ["Security Options → Network access: Do not allow anonymous enumeration of SAM accounts and shares → Enabled → OK."] },
    { t: "LAN Manager authentication level → Send NTLMv2 response only, refuse LM & NTLM.",
      d: ["Security Options → Network security: LAN Manager authentication level → select 'Send NTLMv2 response only. Refuse LM & NTLM' → OK."] },
    { t: "Microsoft network server: digitally sign communications (always) → Enabled.",
      d: ["Security Options → Microsoft network server: Digitally sign communications (always) → Enabled → OK."] },
    { t: "UAC settings → Enabled, Always Notify or default-and-above.",
      d: ["Search 'Change User Account Control settings' in Start menu, move slider to Always Notify or higher, click OK."] },
    { t: "Review Group Policy Objects linked at domain/OU level (gpmc.msc) for tampering — a malicious GPO can silently re-break the whole domain.",
      d: ["Open gpmc.msc, expand each OU and the domain root.", "Review every linked GPO's settings for anything that weakens security (password policy, Defender, firewall).", "Unlink or fix any tampered GPO."] },
    { t: "Check Resultant Set of Policy (rsop.msc / gpresult /h report.html) to catch conflicts between local and domain-applied policy.",
      d: ["Press Win+R, type `rsop.msc`, review effective settings.", "Or open an admin Command Prompt and run `gpresult /h report.html`, then open the generated HTML file to see exactly which GPO is winning each setting."] },
    { t: "Enable audit policy: logon events, account management, policy change, object access, directory service access (success + failure).",
      d: ["In the relevant policy editor → Local Policies → Audit Policy.", "Enable Success and Failure for: Audit account logon events, Audit account management, Audit logon events, Audit policy change, Audit object access, Audit directory service access."] },
    { t: "Restrict User Rights Assignment (Log on as a service / locally / from network) to only authorized accounts/groups.",
      d: ["Local Policies → User Rights Assignment.", "Edit 'Log on as a service', 'Allow log on locally', 'Access this computer from the network' — remove unauthorized accounts, add back only what's authorized."] }
  ]
},
{
  title: "7. Network Configuration",
  items: [
    { t: "Confirm the server uses a static IP address, not DHCP-assigned, for production stability.",
      d: ["Control Panel → Network and Sharing Center → Change adapter settings.", "Right-click the active adapter → Properties → Internet Protocol Version 4 → Properties.", "Confirm 'Use the following IP address' is selected with correct static values, not 'Obtain an IP address automatically'."] },
    { t: "Configure at least two DNS servers where possible for redundancy.",
      d: ["Same IPv4 Properties dialog → set both 'Preferred DNS server' and 'Alternate DNS server' fields to valid DNS servers."] },
    { t: "Verify valid forward (A) DNS records exist with correct naming; verify PTR records exist for reverse lookups.",
      d: ["Open DNS Manager (dnsmgmt.msc) if this box hosts DNS.", "Expand Forward Lookup Zones, confirm an A record exists for this server with the correct IP.", "Expand Reverse Lookup Zones, confirm a matching PTR record exists — right-click to create one if missing."] },
    { t: "Test name resolution with nslookup / Resolve-DnsName for the server and other domain hosts.",
      d: ["Open Command Prompt, run `nslookup <servername>` and `nslookup <ip-address>` to verify forward and reverse resolution.", "Or in PowerShell, run `Resolve-DnsName <servername>`."] },
    { t: "Ensure NTP/time sync is correct — a DC should sync to a reliable external time source; member servers sync to the DC (w32tm /query /status).",
      d: ["Open an admin Command Prompt, run `w32tm /query /status` to check current sync source.", "On the PDC emulator DC, configure an external NTP source with `w32tm /config /manualpeerlist:\"time.windows.com\" /syncfromflags:manual /reliable:yes /update` then `net stop w32time && net start w32time`.", "On member servers, they should sync automatically from the domain hierarchy — verify, don't force an external source unless required."] },
  ]
},
{
  title: "8. Firewall",
  items: [
    { t: "Windows Defender Firewall enabled for all 3 profiles (Domain, Private, Public).",
      d: ["Press Win+R, type `wf.msc`.", "Click 'Windows Defender Firewall Properties', set Firewall state to On for Domain, Private, and Public profile tabs, click OK."] },
    { t: "Default inbound = Block except for roles this server must serve (DNS 53, DHCP 67/68, web 80/443, AD ports) — outbound = Allow unless README says otherwise.",
      d: ["In the same Properties dialog, set Inbound connections to Block, Outbound connections to Allow on each profile.", "Confirm the built-in rule groups for your installed roles (DNS Server, DHCP Server, World Wide Web Services, Active Directory Domain Services) are enabled under Inbound Rules so the role keeps functioning."] },
    { t: "Review inbound/outbound rules for unauthorized or overly permissive entries (Any/Any, high-numbered backdoor ports like 4444/1337/31337).",
      d: ["wf.msc → Inbound Rules and Outbound Rules, sort by name/port.", "Right-click and Disable/Delete anything suspicious."] },
    { t: "Remove firewall rules tied to uninstalled or unauthorized software/roles.",
      d: ["Scan Inbound/Outbound Rules for entries referencing software already removed in Section 4/5.", "Right-click → Delete each leftover rule."] },
    { t: "Check netstat -ano for unexpected listening ports and identify the owning process/service.",
      d: ["Admin Command Prompt → `netstat -ano`.", "For each unexpected LISTENING port, note the PID, then check Task Manager → Details (or `tasklist /svc`) to identify and investigate the owning process."] },
    { t: "If a hardware firewall/VPN boundary is implied by the README, restrict RDP/management ports accordingly on the Windows Firewall too.",
      d: ["wf.msc → Inbound Rules → find the Remote Desktop rule(s), double-click → Scope tab, restrict Remote IP address to the specific management subnet/VPN range described in the README."] }
  ]
},
{
  title: "9. Active Directory Domain Services (if this box is a DC)",
  items: [
    { t: "Open Active Directory Users and Computers (dsa.msc) — audit every user, group, and OU against the README's org chart.",
      d: ["Press Win+R, type `dsa.msc`.", "Enable View → Advanced Features for full visibility.", "Walk every OU and compare its contents to the README's expected structure."] },
    { t: "Look for accounts placed in the wrong OU, disabled accounts that should be enabled (or vice versa), and stale/duplicate accounts.",
      d: ["Right-click a misplaced account → Move... → select the correct OU → OK.", "Right-click a disabled account that should be active → Enable Account (or Disable Account for the reverse).", "Investigate and remove/disable stale or duplicate accounts not in the README."] },
    { t: "Check Domain Admins / Enterprise Admins / Schema Admins group membership carefully — these are prime targets for tampering.",
      d: ["dsa.msc → Users container → double-click each of Domain Admins, Enterprise Admins, Schema Admins → Members tab.", "Remove unauthorized members, add back only README-authorized accounts."] },
    { t: "Verify FSMO role holders are on the expected DC(s): netdom query fsmo.",
      d: ["Open an admin Command Prompt, run `netdom query fsmo`.", "Compare the listed role holders against what the README/your notes expect; investigate any unexpected transfer."] },
    { t: "Check AD replication health if multiple DCs exist: repadmin /replsummary and repadmin /showrepl.",
      d: ["Admin Command Prompt → `repadmin /replsummary` for a quick health overview.", "Run `repadmin /showrepl` for detailed per-partner status; investigate any errors shown."] },
    { t: "Review Group Policy Objects in Group Policy Management (gpmc.msc) — check for GPOs that weaken security domain-wide (password policy, Defender, firewall).",
      d: ["Open gpmc.msc, review every GPO linked to the domain root and each OU.", "Fix or unlink any GPO found to be weakening security."] },
    { t: "Verify SYSVOL and NETLOGON shares are intact and replicating (they hold logon scripts and GPO templates).",
      d: ["Admin Command Prompt → `net share` should list SYSVOL and NETLOGON.", "Browse to \\\\<servername>\\SYSVOL and \\\\<servername>\\NETLOGON in File Explorer to confirm they're accessible and populated."] },
    { t: "Check AD Sites and Services for unexpected site/subnet changes if applicable.",
      d: ["Press Win+R, type `dssite.msc`.", "Review Sites and Subnets for anything that doesn't match the expected network layout."] }
  ]
},
{
  title: "10. DNS Server Role (if present)",
  items: [
    { t: "Open DNS Manager (dnsmgmt.msc) — verify forward and reverse lookup zones exist and are correctly configured.",
      d: ["Press Win+R, type `dnsmgmt.msc`.", "Expand Forward Lookup Zones and Reverse Lookup Zones, confirm the expected zones exist and match the README's network."] },
    { t: "Check for unauthorized or suspicious DNS records (A/CNAME records pointing somewhere unexpected — classic redirect/persistence trick).",
      d: ["Within each zone, review every A and CNAME record.", "Right-click and Delete any record pointing to an unexpected/attacker IP; recreate the legitimate record if it was overwritten."] },
    { t: "Verify zone transfer settings are restricted to authorized secondary servers only, not 'to any server'.",
      d: ["Right-click a zone → Properties → Zone Transfers tab.", "If 'To any server' is selected, change to 'Only to servers listed on the Name Servers tab' or a specific authorized IP list, click OK."] },
    { t: "Confirm DNS forwarders point to a legitimate upstream resolver, not an attacker-controlled IP.",
      d: ["Right-click the server node in DNS Manager → Properties → Forwarders tab.", "Verify/edit the listed IPs to legitimate upstream DNS servers, click OK."] },
    { t: "Enable DNSSEC or scavenging only if the README calls for it — don't change zone behavior blindly.",
      d: ["Only if instructed: right-click the zone → Properties → General tab → Aging button to configure scavenging, or use the DNSSEC signing wizard."] }
  ]
},
{
  title: "11. DHCP Server Role (if present)",
  items: [
    { t: "Open the DHCP console — verify scope ranges, exclusions, and reservations match the README's network plan.",
      d: ["Press Win+R, type `dhcpmgmt.msc`.", "Expand the server → IPv4 → each scope, check the address range and exclusions against the README."] },
    { t: "Check DHCP scope options (DNS servers, default gateway, domain name) point to legitimate infrastructure.",
      d: ["Right-click the scope → Scope Options (or Server Options for global settings).", "Verify option 003 (Router), 006 (DNS Servers), and 015 (DNS Domain Name) all point to legitimate values; edit if tampered."] },
    { t: "Verify the DHCP server is authorized in Active Directory (right-click server → Authorize) if it should be running.",
      d: ["In dhcpmgmt.msc, check if the server icon has a red down-arrow (unauthorized).", "If it should be running, right-click the server → Authorize."] },
    { t: "Remove or disable rogue/unauthorized DHCP scopes.",
      d: ["Review every scope under IPv4 for one that doesn't match the README's plan.", "Right-click the rogue scope → Deactivate, or Delete if confirmed unauthorized."] }
  ]
},
{
  title: "12. IIS / File Services / Other Installed Roles",
  items: [
    { t: "IIS: update it, remove default sample sites/pages, disable directory browsing, use least-privilege app pool identities.",
      d: ["Open IIS Manager.", "Remove/stop the Default Web Site if unused.", "Select a site → Directory Browsing → Disable in Actions pane if enabled.", "Application Pools → right-click pool → Advanced Settings → Identity, confirm least-privilege account."] },
    { t: "IIS: remove unused modules/handlers, enforce HTTPS if a certificate is expected, check bindings for unauthorized sites.",
      d: ["Select the server node → Modules / Handler Mappings, remove unused entries.", "Select the site → Bindings, verify only expected host headers/ports are bound; add an HTTPS binding with the correct certificate if required."] },
    { t: "SQL Server (if installed): check for a default/blank sa password, disable xp_cmdshell, use least-privilege service accounts.",
      d: ["Open SQL Server Management Studio, connect, expand Security → Logins → sa → Properties, set a strong password.", "New Query: `EXEC sp_configure 'xp_cmdshell', 0; RECONFIGURE;`", "Check the SQL Server service's Log On As account in services.msc — should not be a Domain Admin."] },
    { t: "File and Storage Services: audit shares (Computer Management → Shared Folders) — remove unauthorized shares, tighten share + NTFS permissions to least privilege.",
      d: ["Press Win+R, type `compmgmt.msc` → System Tools → Shared Folders → Shares.", "Right-click an unauthorized share → Stop Sharing.", "For required shares, right-click → Properties → Share Permissions and check NTFS Security tab, tighten to least privilege."] },
    { t: "FTP (if required): disable anonymous access, prefer FTPS, restrict to necessary users only.",
      d: ["IIS Manager → select the FTP site → FTP Authentication → disable Anonymous, enable Basic/required auth.", "FTP SSL Settings → require SSL if a certificate is available.", "FTP Authorization Rules → restrict to specific authorized users."] },
    { t: "Apache (e.g. XAMPP, if installed and required): disable ServerSignature and set ServerTokens to hide version info.",
      d: ["Open the Apache config file (`httpd.conf`, often under `C:\\xampp\\apache\\conf\\httpd.conf`) in a text editor.", "Find `ServerSignature On` and change it to `ServerSignature Off`.", "Find (or add) `ServerTokens` and set it to `ServerTokens Prod`.", "Save the file, then restart Apache (via the XAMPP Control Panel or `httpd -k restart`)."] }
  ]
},
{
  title: "13. Remote Access (RDP / WinRM / PowerShell Remoting)",
  items: [
    { t: "Disable Remote Desktop unless explicitly required by README; if required, enable Network Level Authentication and restrict to authorized users/group.",
      d: ["Press Win+R, type `sysdm.cpl` → Remote tab.", "Select 'Don't allow connections' unless required; if required, select 'Allow connections only from computers running Remote Desktop with NLA' and click Select Users."] },
    { t: "Disable Remote Assistance.",
      d: ["sysdm.cpl → Remote tab → untick 'Allow Remote Assistance connections to this computer' → Apply → OK."] },
    { t: "Restrict RDP/management access to expected admin accounts only — check 'Remote Desktop Users' group membership.",
      d: ["lusrmgr.msc (member server) or dsa.msc (DC) → Groups → Remote Desktop Users → Members tab.", "Remove unauthorized members, add only authorized admins."] },
    { t: "If PowerShell Remoting (WinRM) is enabled but not required, disable it (Disable-PSRemoting) or restrict TrustedHosts.",
      d: ["Open PowerShell as Administrator.", "Run `Disable-PSRemoting -Force` if not required.", "If required, run `winrm set winrm/config/client @{TrustedHosts=\"<specific-hosts>\"}` instead of leaving it wide open."] },
    { t: "Avoid Telnet and unauthenticated FTP entirely — replace with SSH/SFTP-equivalent or Windows-native secure tools only if README allows.",
      d: ["Confirm Telnet Server/Client feature is removed (Section 5).", "Ensure any FTP role in use enforces authentication and, where possible, TLS (Section 12)."] }
  ]
},
{
  title: "14. File System, Permissions & Data",
  items: [
    { t: "Search for and remove prohibited files per README categories (media, unauthorized archives, unrecognized scripts).",
      d: ["File Explorer → search *.mp3, *.mp4, *.avi, *.zip, *.rar, *.ps1, *.bat scoped to C:\\Users and shared data folders.", "Investigate and delete confirmed-unauthorized files."] },
    { t: "Check permissions on sensitive directories (System32, SYSVOL, user profiles, application data) — no unauthorized 'Everyone: Full Control'.",
      d: ["Right-click the folder → Properties → Security tab.", "Look for 'Everyone' or 'Users' with Full Control — click Edit, remove/reduce as needed, click OK."] },
    { t: "Verify shared folder permissions follow least privilege and match the README spec.",
      d: ["compmgmt.msc → Shared Folders → Shares, right-click each share → Properties → check Share Permissions and the folder's NTFS Security tab.", "Adjust both to least privilege per the README."] },
    { t: "Check Recycle Bin and hidden/system files for hidden contraband.",
      d: ["Check the Recycle Bin.", "File Explorer → View → check 'Hidden items' to reveal concealed files, browse user/shared folders again."] },
    { t: "Only enable BitLocker/EFS if explicitly instructed — encrypting blindly can break the scoring engine's access to the disk.",
      d: ["Do not open BitLocker Drive Encryption in Control Panel unless the README explicitly requires it.", "If required, follow the exact README instructions and retain the recovery key."] }
  ]
},
{
  title: "15. Miscellaneous Hardening",
  items: [
    { t: "Enable screen lock/screensaver with password, reasonable timeout.",
      d: ["Right-click Desktop → Personalize → Lock screen → Screen saver settings.", "Set a screensaver, Wait 10-15 min, check 'On resume, display logon screen', OK."] },
    { t: "Disable USB storage auto-execution (don't disable USB entirely unless told).",
      d: ["Covered by the AutoPlay GPO — ensure 'Turn off AutoPlay' is Enabled for All Drives in the relevant policy editor."] },
    { t: "Verify system time/timezone correctness (critical for AD Kerberos auth and log accuracy).",
      d: ["Right-click the taskbar clock → Adjust date/time.", "Confirm correct timezone and that time sync is functioning (see Section 7 NTP check)."] },
    { t: "Check Event Viewer (especially Security and Directory Service logs) for signs of compromise tied to forensics questions.",
      d: ["Press Win+R, type `eventvwr.msc`.", "Expand Windows Logs → Security, and on a DC also Directory Service.", "Filter/sort around the timeframe mentioned in forensics questions for unusual events."] },
    { t: "Confirm every README-listed critical service/role is still running after EVERY major change — a broken DC/DNS/DHCP tanks the whole team's score.",
      d: ["services.msc → verify each named service is Running/Automatic.", "Re-check the Scoring Report after each major change."] },
    { t: "Do a final full README re-read to confirm every instruction and named vulnerability was addressed.",
      d: ["Reopen the README, go line by line, confirm each requirement has actually been implemented."] }
  ]
},
{
  title: "16. Advanced Credential & Attack-Surface Hardening",
  items: [
    { t: "Disable WDigest credential caching on every server, especially DCs, so plaintext credentials aren't held in LSASS memory.",
      d: ["Press Win+R, type `regedit`, press Enter.", "Navigate to HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\WDigest.", "Create/set the DWORD `UseLogonCredential` to 0.", "Or push it via a GPO in gpmc.msc under the same registry path if you need it domain-wide."] },
    { t: "Enable LSA protection (RunAsPPL) so LSASS runs as a protected process, blocking Mimikatz-style credential dumping — verify compatibility with any required security software first.",
      d: ["Press Win+R, type `regedit`, press Enter.", "Navigate to HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Lsa.", "Create/set the DWORD `RunAsPPL` to 1.", "Reboot for it to take effect; confirm no required agent/monitoring software breaks afterward."] },
    { t: "Add sensitive admin accounts to the built-in Protected Users group to block NTLM and weak-crypto Kerberos for them.",
      d: ["Press Win+R, type `dsa.msc`, press Enter.", "Open the Protected Users group under the Users container → Members tab → Add.", "Add Domain Admins/critical accounts, then verify those accounts can still authenticate (Protected Users forces Kerberos-only, no NTLM/DES/RC4) before walking away."] },
    { t: "Disable the Print Spooler service on Domain Controllers unless explicitly required — PrintNightmare (CVE-2021-34527) turns it into a domain-wide privilege-escalation vector.",
      d: ["Press Win+R, type `services.msc`, press Enter.", "Find Print Spooler, click Stop, then Properties → set Startup type to Disabled → OK.", "Only skip this if the README requires print services from this specific box."] },
    { t: "Restrict NTLM authentication domain-wide via 'Network security: Restrict NTLM' policies — audit first, then enforce, to avoid breaking legitimate logons.",
      d: ["In gpmc.msc, edit the relevant GPO → Computer Configuration → Policies → Windows Settings → Security Settings → Local Policies → Security Options.", "Set 'Network security: Restrict NTLM: Audit NTLM authentication in this domain' to Enable all first and review Event Viewer for legitimate NTLM use.", "Once confirmed safe, set 'Network security: Restrict NTLM: NTLM authentication in this domain' to Deny all (or Deny for specific accounts) per the README's tolerance for breakage."] },
    { t: "Disable LLMNR/NetBIOS broadcast name resolution domain-wide via GPO to prevent Responder-style credential-capture attacks.",
      d: ["In gpmc.msc, edit the relevant GPO → Computer Configuration → Administrative Templates → Network → DNS Client.", "Enable 'Turn off Multicast Name Resolution'.", "For NetBIOS, push adapter WINS settings to 'Disable NetBIOS over TCP/IP' via GPO Preferences or set it manually on each server's adapter."] },
    { t: "Turn on PowerShell Script Block Logging and Module Logging via Group Policy on all servers for auditability.",
      d: ["In gpmc.msc, edit the relevant GPO → Computer Configuration → Administrative Templates → Windows Components → Windows PowerShell.", "Enable 'Turn on PowerShell Script Block Logging' and 'Turn on Module Logging' (module name `*`)."] },
    { t: "Enable Attack Surface Reduction rules (Defender) where the server role supports it, particularly around LSASS credential theft.",
      d: ["Open PowerShell as Administrator.", "Run `Set-MpPreference -AttackSurfaceReductionRules_Ids 9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2 -AttackSurfaceReductionRules_Actions Enabled` to block LSASS credential theft.", "Test in AuditMode first on a server running production workloads before enforcing Enabled, to avoid breaking a required role."] },
    { t: "Verify/deploy LAPS (Local Administrator Password Solution) if the README calls for unique, randomized local admin passwords across member servers.",
      d: ["Check whether the LAPS GPO templates and PowerShell module are already present (`Get-Command Get-AdmPwdPassword`).", "If required and not present, install the LAPS client/management tools and configure the GPO to randomize and rotate local admin passwords per the README's spec."] },
    { t: "Restrict anonymous/null session access further via RestrictAnonymous and RestrictAnonymousSAM registry values domain-wide.",
      d: ["Push via GPO Registry Preferences, or set directly: regedit → HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Lsa.", "Set `RestrictAnonymous` to 1 and `RestrictAnonymousSAM` to 1 (create as DWORD if missing) on each server."] },
    { t: "Enable Windows Firewall logging (dropped and successful connections) for forensic visibility during the round.",
      d: ["Press Win+R, type `wf.msc`, press Enter.", "Click Windows Defender Firewall Properties → each profile tab → Logging section → Customize.", "Set 'Log dropped packets' and 'Log successful connections' to Yes, note the log file path for later review."] },
    { t: "Verify Kerberos delegation settings on service/computer accounts aren't set to unconstrained delegation for non-DC boxes — a classic AD privilege-escalation trap.",
      d: ["Press Win+R, type `dsa.msc`, press Enter, enable View → Advanced Features.", "For each computer/service account, open Properties → Delegation tab.", "Ensure only Constrained delegation (or None) is configured for non-DC systems; remove 'Trust this computer for delegation to any service' unless the README explicitly requires it."] }
  ]
},
{
  title: "17. Finals-Round Specific Notes",
  items: [
    { t: "Expect broken PowerShell, modified PATH/PSModulePath, or disabled execution policy traps — check and restore sane values.",
      d: ["Try opening PowerShell; if broken, use Command Prompt.", "Run `[Environment]::GetEnvironmentVariables()` and `Get-ExecutionPolicy` to check for tampering; fix via System Properties → Environment Variables or `Set-ExecutionPolicy`."] },
    { t: "Expect GPO traps pushed from the Default Domain Policy or an OU-linked GPO that silently re-disable Defender, re-enable Guest, or lower the password policy on refresh — check rsop.msc / gpresult, not just local secpol.",
      d: ["Run `gpresult /h report.html` and open the file to see exactly which GPO wins each setting.", "Trace back to the offending GPO in gpmc.msc and fix/unlink it, not just the local setting (which will just get overwritten again)."] },
    { t: "Expect intentionally broken DNS (wrong forwarders, missing records) or replication issues between DCs as part of the injected vulnerabilities — verify with repadmin and nslookup.",
      d: ["Run `repadmin /replsummary` and `nslookup` checks from Sections 7/9/10 again after making DNS changes to confirm they actually resolved the issue."] },
    { t: "Watch for FSMO roles seized/moved incorrectly, or a rogue DHCP/DNS server on the network segment.",
      d: ["Re-run `netdom query fsmo` after any AD changes.", "In DHCP console, check for an unexpected second authorized server; in DNS check for unexpected secondary/forwarder configurations."] },
    { t: "Skim the current year's Microsoft/CIS Benchmark for Windows Server for edge-case hardening items beyond the basics above.",
      d: ["Before competition day, search for 'CIS Benchmark Windows Server 2019/2022' and skim account/audit/AD sections not already covered here."] },
    { t: "Track score after each category — if a change doesn't move the score or it drops, investigate/revert immediately rather than pressing on.",
      d: ["Check the Scoring Report after each major section.", "If a change caused a drop, undo it and re-verify before continuing."] },
    { t: "Time budget for a 4-hour round: 0:00–0:15 README+forensics+baseline, 0:15–1:00 accounts+password policy, 1:00–1:45 updates+malware+roles, 1:45–2:30 GPO/policy+firewall+network, 2:30–3:15 AD/DNS/DHCP/roles+file system, 3:15–3:45 second README pass+verify all critical services, 3:45–4:00 final check/screenshots.",
      d: ["Check the clock at each listed checkpoint.", "If behind schedule, prioritize AD/DNS/DHCP and account/password sections — they tend to carry the most weight and affect the whole team."] }
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
