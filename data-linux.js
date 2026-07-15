const DATA_LINUX = [
{
  title: "0. Before You Touch Anything",
  items: [
    { t: "Identify distro and version: cat /etc/os-release (Ubuntu/Debian use apt; RHEL/CentOS/Fedora use yum/dnf).",
      d: ["Open a terminal.", "Run `cat /etc/os-release` and note the NAME and VERSION fields.", "This tells you which package manager and config file paths apply for the rest of this checklist."] },
    { t: "Screenshot the current Scoring Report/score before making changes.",
      d: ["Open the CyberPatriot scoring report/reader on the desktop.", "Take a screenshot (most desktop environments: PrtScn, or use a screenshot tool from the panel) and save it somewhere you'll remember."] },
    { t: "Answer forensics questions first, before the system state changes: cat, less, grep, find as needed.",
      d: ["Locate the forensics question file per the README.", "Investigate using read-only commands like `cat`, `less`, `grep`, `find` before changing anything.", "Save your answers in the exact file/format the README specifies."] },
    { t: "If a packet capture (.pcap/.pcapng) is provided as part of forensics, use tcpdump/Wireshark to identify attacker source IPs.",
      d: ["Open the file with `wireshark <file>.pcap` if a GUI is available, or inspect it headlessly with `tcpdump -nr <file>.pcap | less`.", "Look for a source IP hitting many ports/hosts in a short time (scan pattern) or repeated failed-auth-style traffic — that's usually the attacker.", "In Wireshark, Statistics → Conversations sorts by packet/byte count to spot it quickly.", "Cross-reference suspicious IPs against the ones referenced in the forensics questions."] }
  ]
},
{
  title: "1. User Accounts & Groups",
  items: [
    { t: "List all accounts: cat /etc/passwd — cross-reference every entry against the README's authorized user list.",
      d: ["Run `cat /etc/passwd` in a terminal.", "Go through each line (username:x:UID:GID:comment:home:shell) and compare against your authorized-user notes from Section 0."] },
    { t: "Look for accounts with UID 0 other than root (privilege escalation backdoor) — awk -F: '($3 == 0)' /etc/passwd.",
      d: ["Run `awk -F: '($3 == 0) {print}' /etc/passwd`.", "Only 'root' should appear. Investigate and fix/remove any other UID-0 account immediately — this is a critical backdoor."] },
    { t: "Look for unexpected accounts with UID ≥ 1000 (normal user range) not in the README.",
      d: ["Run `awk -F: '($3 >= 1000) {print $1, $3}' /etc/passwd`.", "Compare the list to your authorized-user notes; flag anything unexpected."] },
    { t: "Delete or lock unauthorized accounts: passwd -l <user> or userdel (only if certain it's unauthorized).",
      d: ["To lock (safer, reversible): `sudo passwd -l <username>`.", "To fully remove (only if certain): `sudo userdel <username>` or `sudo userdel -r <username>` to also remove their home directory."] },
    { t: "Verify group memberships, especially sudo/wheel/admin groups: getent group sudo (or wheel on RHEL).",
      d: ["Run `getent group sudo` (Debian/Ubuntu) or `getent group wheel` (RHEL/CentOS).", "Compare members against the README's authorized-admin list.", "Remove unauthorized members: `sudo gpasswd -d <user> sudo`.", "Add authorized members: `sudo usermod -aG sudo <user>`."] },
    { t: "Check for accounts with no password set: awk -F: '($2 == \"\")' /etc/shadow.",
      d: ["Run `sudo awk -F: '($2 == \"\") {print $1}' /etc/shadow`.", "Any account listed has no password and can log in freely — set a password immediately with `sudo passwd <username>` or lock it."] },
    { t: "Ensure the root account has a strong password and is not used for routine logins.",
      d: ["Run `sudo passwd root` and set a strong password.", "Confirm authorized users use `sudo` for admin tasks rather than logging in directly as root."] },
    { t: "Set strong passwords for every authorized user: passwd <user>.",
      d: ["For each authorized account, run `sudo passwd <username>` and set a password meeting complexity (12+ chars, mixed case, digit, symbol)."] },
    { t: "Check for duplicate UIDs/usernames which can indicate a hidden shadow account.",
      d: ["Run `awk -F: '{print $3}' /etc/passwd | sort | uniq -d` to find duplicate UIDs.", "Investigate any duplicates found — this can indicate a hidden account impersonating a legitimate one."] },
    { t: "Verify each user's shell in /etc/passwd — service accounts should use /usr/sbin/nologin, not /bin/bash.",
      d: ["Run `cat /etc/passwd` and check the last field (shell) for each service/system account.", "For accounts that shouldn't get an interactive shell, run `sudo usermod -s /usr/sbin/nologin <username>`."] }
  ]
},
{
  title: "2. Password & Account Aging Policy",
  items: [
    { t: "Edit /etc/login.defs: PASS_MAX_DAYS 90, PASS_MIN_DAYS 10, PASS_WARN_AGE 7.",
      d: ["Run `sudo nano /etc/login.defs` (or your preferred editor).", "Find and set: `PASS_MAX_DAYS   90`, `PASS_MIN_DAYS   10`, `PASS_WARN_AGE   7`.", "Save and exit (Ctrl+O, Enter, Ctrl+X in nano)."] },
    { t: "Apply aging retroactively to existing users with chage (e.g., chage -M 90 -m 10 -W 7 <user>).",
      d: ["For each authorized user, run `sudo chage -M 90 -m 10 -W 7 <username>`.", "Verify with `sudo chage -l <username>`."] },
    { t: "Enforce password complexity via PAM: edit /etc/pam.d/common-password (Debian/Ubuntu) using pam_pwquality or pam_cracklib — minlen=12, require upper/lower/digit/special classes.",
      d: ["Install the module if missing: `sudo apt-get install libpam-pwquality`.", "Edit `sudo nano /etc/pam.d/common-password`.", "Find the line starting with `password requisite pam_pwquality.so` and set options like `minlen=12 ucredit=-1 lcredit=-1 dcredit=-1 ocredit=-1 retry=3`.", "Save and exit."] },
    { t: "Set failed-login lockout via pam_tally2/pam_faillock (deny after 3-5 attempts, unlock time 15-30 min).",
      d: ["Edit `sudo nano /etc/pam.d/common-auth` (Debian/Ubuntu) or the equivalent faillock config on RHEL.", "Add/edit a line like `auth required pam_tally2.so deny=5 unlock_time=1800` (or `pam_faillock.so deny=5 unlock_time=1800` on newer systems).", "Save and exit; test carefully so you don't lock yourself out."] },
    { t: "Disable or lock direct root login where README allows (passwd -l root) and require sudo instead.",
      d: ["Only if the README allows it: run `sudo passwd -l root` to lock direct root password login.", "Confirm authorized admins can still gain root via `sudo`."] },
    { t: "Verify /etc/shadow permissions are 640 or stricter, owned by root:shadow.",
      d: ["Run `ls -l /etc/shadow`.", "It should show `-rw-r-----` (640) owned by `root:shadow`.", "If not, fix with `sudo chmod 640 /etc/shadow` and `sudo chown root:shadow /etc/shadow`."] }
  ]
},
{
  title: "3. Sudo & Privilege Escalation Vectors",
  items: [
    { t: "Audit /etc/sudoers with visudo (never edit directly) and everything under /etc/sudoers.d/.",
      d: ["Run `sudo visudo` to safely edit /etc/sudoers (it syntax-checks on save).", "Also run `sudo ls /etc/sudoers.d/` and review each file there with `sudo cat /etc/sudoers.d/<file>`."] },
    { t: "Remove any NOPASSWD entries unless explicitly authorized by README.",
      d: ["While in `sudo visudo`, search for lines containing `NOPASSWD`.", "Delete or comment out any not explicitly authorized by the README, then save."] },
    { t: "Remove any '!authenticate' directives that bypass password prompts for sudo.",
      d: ["In `sudo visudo` and files under /etc/sudoers.d/, search for `!authenticate`.", "Remove any such directive unless explicitly required."] },
    { t: "Verify only README-authorized users/groups are in sudoers, not 'ALL' wildcards.",
      d: ["Review every line in /etc/sudoers and /etc/sudoers.d/*.", "Remove entries granting sudo to unauthorized users or overly broad group wildcards."] },
    { t: "Search for world-writable files with SUID/SGID bits — common privilege-escalation vector: find / -perm -4000 -o -perm -2000 -type f 2>/dev/null.",
      d: ["Run `find / -perm -4000 -o -perm -2000 -type f 2>/dev/null`.", "Compare results against a known-good baseline list for this distro; investigate anything unexpected."] },
    { t: "Check for unexpected SUID binaries not part of the base OS install; remove the SUID bit (chmod u-s) if unauthorized.",
      d: ["From the previous find results, identify binaries that don't belong (e.g. an SUID copy of bash, nmap, python).", "Remove the bit with `sudo chmod u-s /path/to/binary`, or delete the file entirely if it's clearly a planted backdoor."] },
    { t: "Check /etc/passwd and /etc/group for world-writable permissions (should be 644 and 644 respectively, not writable by others).",
      d: ["Run `ls -l /etc/passwd /etc/group`.", "Both should show `-rw-r--r--` (644). Fix with `sudo chmod 644 /etc/passwd /etc/group` if not."] }
  ]
},
{
  title: "4. Updates & Patch Management",
  items: [
    { t: "Debian/Ubuntu: sudo apt-get update && sudo apt-get upgrade && sudo apt-get dist-upgrade.",
      d: ["Open a terminal.", "Run `sudo apt-get update` to refresh package lists.", "Run `sudo apt-get upgrade -y` then `sudo apt-get dist-upgrade -y`.", "Reboot if a kernel update was applied."] },
    { t: "RHEL/CentOS/Fedora: sudo yum update or sudo dnf upgrade.",
      d: ["Run `sudo yum update -y` (older) or `sudo dnf upgrade -y` (newer).", "Reboot if a kernel update was applied."] },
    { t: "Enable automatic security updates if the README doesn't forbid it (unattended-upgrades on Debian/Ubuntu).",
      d: ["Install with `sudo apt-get install unattended-upgrades`.", "Enable it with `sudo dpkg-reconfigure --priority=low unattended-upgrades` and select Yes."] },
    { t: "Verify package manager sources/repos (/etc/apt/sources.list, /etc/apt/sources.list.d/) aren't pointing to unauthorized/malicious repositories.",
      d: ["Run `cat /etc/apt/sources.list` and `ls /etc/apt/sources.list.d/` then `cat` each file found.", "Look for any repo URL that isn't a standard/expected mirror; comment it out or remove the file if malicious."] },
    { t: "Remove any suspicious third-party PPAs or repos not needed for the system's role.",
      d: ["List added PPAs/repos as above.", "Remove an unwanted one with `sudo add-apt-repository --remove ppa:<name>` or by deleting its file in /etc/apt/sources.list.d/, then re-run `sudo apt-get update`."] }
  ]
},
{
  title: "5. Malware, Rootkits & Unauthorized Software",
  items: [
    { t: "Compare installed packages (dpkg -l or rpm -qa) against the README's authorized software list.",
      d: ["Run `dpkg -l` (Debian/Ubuntu) or `rpm -qa` (RHEL/CentOS) to list all installed packages.", "Scroll/search through and compare against the README's authorized list."] },
    { t: "Uninstall hacking/pentest tools if unauthorized: nmap, wireshark, netcat/ncat, john, hydra, aircrack-ng, metasploit.",
      d: ["Debian/Ubuntu: `sudo apt-get remove --purge nmap wireshark netcat-openbsd john hydra aircrack-ng`.", "RHEL/CentOS: `sudo yum remove nmap wireshark netcat john hydra aircrack-ng`.", "Adjust the package list to whatever's actually installed and unauthorized."] },
    { t: "Install and run rootkit detectors: chkrootkit and rkhunter — investigate any findings.",
      d: ["Install: `sudo apt-get install chkrootkit rkhunter` (or yum equivalent).", "Run `sudo chkrootkit` and review output for 'INFECTED' results.", "Run `sudo rkhunter --update && sudo rkhunter --check` and review warnings carefully."] },
    { t: "Search for prohibited media/files per README: find / -iname '*.mp3' -o -iname '*.mp4' -o -iname '*.avi' 2>/dev/null (adjust extensions).",
      d: ["Run `find / -iname '*.mp3' -o -iname '*.mp4' -o -iname '*.avi' 2>/dev/null`.", "Review results and delete confirmed-unauthorized files with `rm`."] },
    { t: "Search for suspicious archives that might hide contraband: *.zip, *.tar.gz, *.rar, *.deb in user home directories.",
      d: ["Run `find /home -iname '*.zip' -o -iname '*.tar.gz' -o -iname '*.rar' -o -iname '*.deb' 2>/dev/null`.", "Inspect suspicious archives with `unzip -l <file>` or `tar -tzvf <file>` before deleting."] },
    { t: "Check /etc/rc.local and old-style init scripts for unauthorized startup commands (classic backdoor location).",
      d: ["Run `cat /etc/rc.local` and review every command.", "Check `/etc/init.d/` for unfamiliar scripts.", "Remove/comment out unauthorized commands, keeping the required `exit 0` line intact if present."] },
    { t: "Check for unowned files (potential remnants of a removed/rogue account): find / -nouser -o -nogroup 2>/dev/null.",
      d: ["Run `find / -xdev -nouser -o -nogroup 2>/dev/null`.", "Investigate each result; reassign ownership with `chown` or delete if clearly malicious debris."] },
    { t: "Check for world-writable files/directories outside expected locations: find / -xdev -type d -perm -0002 2>/dev/null.",
      d: ["Run `find / -xdev -type d -perm -0002 2>/dev/null`.", "For anything outside expected locations like /tmp, fix with `sudo chmod o-w <path>`."] }
  ]
},
{
  title: "6. Services & Processes",
  items: [
    { t: "List active services: systemctl list-units --type=service --state=running (or service --status-all on older SysV systems).",
      d: ["Run `systemctl list-units --type=service --state=running` on systemd-based distros.", "On older SysV systems, run `service --status-all` instead."] },
    { t: "Disable/remove services not required by README: Telnet, rsh/rlogin, TFTP, unauthenticated FTP (vsftpd/proftpd if unneeded), NFS if unneeded, Samba if unneeded.",
      d: ["Stop and disable: `sudo systemctl stop <service> && sudo systemctl disable <service>`.", "Uninstall entirely if not needed: `sudo apt-get remove --purge telnetd rsh-server tftpd-hpa vsftpd nfs-kernel-server samba` (adjust to what's installed)."] },
    { t: "If the README requires a specific service (web/SSH/DB), harden it rather than removing it.",
      d: ["Leave required services running and instead apply the relevant hardening steps elsewhere in this checklist (SSH section, firewall rules, etc.)."] },
    { t: "Check for unfamiliar processes and their binaries: ps aux and lsof -p <pid> / ls -l /proc/<pid>/exe for anything unrecognized.",
      d: ["Run `ps aux` to list all running processes.", "For anything unfamiliar, run `ls -l /proc/<pid>/exe` to see the actual binary path, or `lsof -p <pid>` for open files/connections."] },
    { t: "Check listening ports and the owning process: ss -tulnp or netstat -tulnp.",
      d: ["Run `sudo ss -tulnp` (or `sudo netstat -tulnp` if netstat is installed).", "Investigate any unexpected LISTENING port and the process name/PID shown."] },
    { t: "Investigate and kill unauthorized reverse-shell-style processes (unexpected outbound connections, netcat listeners).",
      d: ["From `ss -tulnp` / `ps aux`, identify suspicious processes (e.g. nc, bash with a redirected socket).", "Kill with `sudo kill -9 <pid>`, then remove the underlying binary/script and any persistence mechanism (cron/systemd) that restarts it."] },
    { t: "Disable X11/GUI display manager services on a server role if not required by README.",
      d: ["Check the current default target: `systemctl get-default`.", "If a GUI isn't required, set text mode: `sudo systemctl set-default multi-user.target` (only if README allows removing the GUI)."] }
  ]
},
{
  title: "7. SSH Hardening",
  items: [
    { t: "Edit /etc/ssh/sshd_config: PermitRootLogin no (unless README explicitly requires root SSH).",
      d: ["Run `sudo nano /etc/ssh/sshd_config`.", "Find `PermitRootLogin` and set it to `no` (or `prohibit-password` if README requires key-based root access).", "Save and exit."] },
    { t: "PasswordAuthentication — set per README (disable in favor of keys only if instructed; otherwise keep enabled but strong).",
      d: ["In the same file, find `PasswordAuthentication` and set to `yes` or `no` per the README's specific requirement.", "Save and exit."] },
    { t: "PermitEmptyPasswords no.",
      d: ["In /etc/ssh/sshd_config, set `PermitEmptyPasswords no`.", "Save and exit."] },
    { t: "Protocol 2 only (modern OpenSSH defaults to this, but verify no legacy Protocol 1 config remains).",
      d: ["Search the config: `grep -i protocol /etc/ssh/sshd_config`.", "If a `Protocol 1` line exists, remove it or change to `Protocol 2`."] },
    { t: "X11Forwarding no unless required.",
      d: ["In /etc/ssh/sshd_config, set `X11Forwarding no` unless the README requires GUI forwarding over SSH."] },
    { t: "Set a reasonable LoginGraceTime and MaxAuthTries (e.g., MaxAuthTries 3).",
      d: ["In /etc/ssh/sshd_config, set `LoginGraceTime 60` and `MaxAuthTries 3`.", "Save and exit."] },
    { t: "Restrict SSH access to authorized users/groups with AllowUsers / AllowGroups if README specifies a limited set.",
      d: ["In /etc/ssh/sshd_config, add a line like `AllowUsers alice bob` or `AllowGroups sshusers` listing only README-authorized accounts."] },
    { t: "Only change the default port (22) if the README explicitly asks — don't do it blindly, it can break the scoring engine's checks.",
      d: ["Leave `Port 22` as-is unless the README explicitly specifies a different port.", "If required, edit the `Port` directive and update your firewall rule to match."] },
    { t: "Restart the service after changes: sudo systemctl restart sshd, then verify config first with sshd -t.",
      d: ["Before restarting, validate syntax: `sudo sshd -t` — fix any reported errors.", "Then apply: `sudo systemctl restart sshd` (or `ssh` service name on some distros).", "Keep your current session open until you've confirmed you can still log in, in case of a config mistake."] }
  ]
},
{
  title: "8. Firewall Configuration",
  items: [
    { t: "Ubuntu/Debian: install/enable UFW — sudo apt-get install ufw && sudo ufw enable.",
      d: ["Run `sudo apt-get install ufw` if not already installed.", "Run `sudo ufw enable` and confirm when prompted."] },
    { t: "Set default policy: sudo ufw default deny incoming, sudo ufw default allow outgoing (adjust outgoing if README requires stricter).",
      d: ["Run `sudo ufw default deny incoming`.", "Run `sudo ufw default allow outgoing` (or `deny outgoing` plus explicit allows if the README requires a stricter posture)."] },
    { t: "Explicitly allow only required services (e.g., sudo ufw allow ssh, sudo ufw allow 80/tcp for a required web server).",
      d: ["For SSH: `sudo ufw allow ssh` (or `sudo ufw allow 22/tcp`).", "For each other required service, run `sudo ufw allow <port>/tcp` (or /udp) as needed.", "Run `sudo ufw reload` after making changes."] },
    { t: "RHEL/CentOS: use firewalld (firewall-cmd) or iptables/nftables depending on distro version — same allow-list principle.",
      d: ["Check status: `sudo systemctl status firewalld`.", "Allow a service: `sudo firewall-cmd --permanent --add-service=ssh` (or `--add-port=<port>/tcp`).", "Apply: `sudo firewall-cmd --reload`."] },
    { t: "Review existing rules for anything overly permissive (0.0.0.0/0 on management ports, unexpected open high ports).",
      d: ["Run `sudo ufw status verbose` (or `sudo firewall-cmd --list-all`).", "Remove/tighten any rule that's broader than necessary: `sudo ufw delete <rule-number>`."] },
    { t: "Verify the firewall service is enabled to start on boot (systemctl enable ufw / firewalld).",
      d: ["Run `sudo systemctl enable ufw` (or `sudo systemctl enable firewalld`).", "Confirm with `sudo systemctl is-enabled ufw`."] }
  ]
},
{
  title: "9. File System Permissions & Integrity",
  items: [
    { t: "Verify permissions on /etc/passwd (644), /etc/shadow (640/600), /etc/group (644), /etc/gshadow (640/600).",
      d: ["Run `ls -l /etc/passwd /etc/shadow /etc/group /etc/gshadow`.", "Fix any mismatches: `sudo chmod 644 /etc/passwd /etc/group` and `sudo chmod 640 /etc/shadow /etc/gshadow`."] },
    { t: "Search for and fix world-writable files/directories outside of expected temp locations.",
      d: ["Run `find / -xdev -type f -perm -0002 2>/dev/null`.", "For files outside /tmp or /var/tmp, run `sudo chmod o-w <path>` to remove world-write access."] },
    { t: "Verify /tmp and /var/tmp have the sticky bit set (chmod +t) so users can't delete each other's files.",
      d: ["Run `ls -ld /tmp /var/tmp` — permissions should end in `t` (e.g. `drwxrwxrwt`).", "If missing, run `sudo chmod +t /tmp /var/tmp`."] },
    { t: "Verify package integrity to detect tampered system binaries: dpkg --verify (Debian/Ubuntu) or rpm -Va (RHEL/CentOS).",
      d: ["Run `sudo dpkg --verify` (Debian/Ubuntu) or `sudo rpm -Va` (RHEL/CentOS).", "Investigate any file flagged as modified, especially in /bin, /sbin, /usr/bin, /usr/sbin."] },
    { t: "Check for unexpected changes to critical files (/etc/hosts, /etc/resolv.conf, /etc/nsswitch.conf) that could redirect traffic or lookups.",
      d: ["Run `cat /etc/hosts`, `cat /etc/resolv.conf`, `cat /etc/nsswitch.conf`.", "Look for unexpected redirect entries or lookup-order tampering; fix to legitimate values."] },
    { t: "Check /etc/hosts for malicious static DNS-style redirects.",
      d: ["Run `cat /etc/hosts`.", "Remove any line mapping a legitimate hostname to an unexpected/attacker IP, keeping the default localhost entries."] },
    { t: "Verify home directory permissions (typically 750/700) aren't world-readable/writable.",
      d: ["Run `ls -ld /home/*`.", "Fix overly permissive ones with `sudo chmod 750 /home/<user>` (adjust per README's exact requirement)."] }
  ]
},
{
  title: "10. Kernel & Network Hardening",
  items: [
    { t: "Edit /etc/sysctl.conf (or a file in /etc/sysctl.d/) and apply with sysctl -p:",
      d: ["Run `sudo nano /etc/sysctl.conf` (or create a new file under /etc/sysctl.d/, e.g. `/etc/sysctl.d/99-hardening.conf`).", "Add the settings listed in the following items.", "Apply with `sudo sysctl -p` (or `sudo sysctl --system`)."] },
    { t: "net.ipv4.ip_forward = 0 (disable IP forwarding unless this box is a router/gateway per README).",
      d: ["Add the line `net.ipv4.ip_forward = 0` to your sysctl config file, then run `sudo sysctl -p`."] },
    { t: "net.ipv4.conf.all.accept_source_route = 0 (disable source-routed packets).",
      d: ["Add `net.ipv4.conf.all.accept_source_route = 0` to the sysctl config, then run `sudo sysctl -p`."] },
    { t: "net.ipv4.conf.all.accept_redirects = 0 and net.ipv4.conf.all.send_redirects = 0 (disable ICMP redirects).",
      d: ["Add both `net.ipv4.conf.all.accept_redirects = 0` and `net.ipv4.conf.all.send_redirects = 0` to the sysctl config, then run `sudo sysctl -p`."] },
    { t: "net.ipv4.icmp_echo_ignore_broadcasts = 1 (mitigate smurf-style attacks).",
      d: ["Add `net.ipv4.icmp_echo_ignore_broadcasts = 1` to the sysctl config, then run `sudo sysctl -p`."] },
    { t: "net.ipv4.conf.all.rp_filter = 1 (enable reverse path filtering / anti IP-spoofing).",
      d: ["Add `net.ipv4.conf.all.rp_filter = 1` to the sysctl config, then run `sudo sysctl -p`."] },
    { t: "kernel.randomize_va_space = 2 (ensure ASLR is enabled).",
      d: ["Add `kernel.randomize_va_space = 2` to the sysctl config, then run `sudo sysctl -p`.", "Verify with `cat /proc/sys/kernel/randomize_va_space` — should output 2."] },
    { t: "Install and configure fail2ban to block repeated failed SSH/login attempts.",
      d: ["Install: `sudo apt-get install fail2ban`.", "Copy the default jail: `sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local`.", "Edit `/etc/fail2ban/jail.local`, ensure the `[sshd]` section has `enabled = true`.", "Restart: `sudo systemctl restart fail2ban`."] }
  ]
},
{
  title: "11. Logging & Auditing",
  items: [
    { t: "Install and enable auditd: sudo apt-get install auditd && sudo systemctl enable --now auditd.",
      d: ["Run `sudo apt-get install auditd audispd-plugins` (Debian/Ubuntu) or `sudo yum install audit` (RHEL).", "Enable and start it: `sudo systemctl enable --now auditd`."] },
    { t: "Add basic audit rules for changes to /etc/passwd, /etc/shadow, /etc/sudoers, and sensitive config directories.",
      d: ["Edit `sudo nano /etc/audit/rules.d/audit.rules` (or /etc/audit/audit.rules on older systems).", "Add lines like: `-w /etc/passwd -p wa -k passwd_changes`, `-w /etc/shadow -p wa -k shadow_changes`, `-w /etc/sudoers -p wa -k sudoers_changes`.", "Reload rules: `sudo augenrules --load` or restart auditd."] },
    { t: "Verify rsyslog/syslog is running and logs are being written to /var/log/ (auth.log, syslog, etc.).",
      d: ["Run `systemctl status rsyslog`.", "Check `ls -l /var/log/` and `tail /var/log/auth.log` (or `/var/log/secure` on RHEL) to confirm entries are current."] },
    { t: "Verify logrotate is configured so logs aren't disabled or truncated maliciously.",
      d: ["Run `cat /etc/logrotate.conf` and check `/etc/logrotate.d/` for tampered configs (e.g. rotating every minute or truncating to 0 size unexpectedly).", "Fix any suspicious configuration back to sane defaults."] },
    { t: "Review /var/log/auth.log (or /var/log/secure on RHEL) for suspicious login attempts tied to forensics questions.",
      d: ["Run `sudo less /var/log/auth.log` (Debian/Ubuntu) or `sudo less /var/log/secure` (RHEL).", "Search with `grep` for 'Failed password', 'Accepted password', or specific usernames/dates referenced in your forensics questions."] },
    { t: "Check that logging hasn't been redirected to /dev/null or disabled in rsyslog.conf.",
      d: ["Run `cat /etc/rsyslog.conf` and files in `/etc/rsyslog.d/`.", "Look for rules redirecting output to `/dev/null` or commented-out logging rules; restore them if tampered."] }
  ]
},
{
  title: "12. Cron, Systemd Timers & Persistence",
  items: [
    { t: "Review system-wide cron: /etc/crontab and /etc/cron.d/, /etc/cron.{hourly,daily,weekly,monthly}/.",
      d: ["Run `cat /etc/crontab`.", "Run `ls /etc/cron.d/` then `cat` each file.", "Check `/etc/cron.hourly/`, `/etc/cron.daily/`, `/etc/cron.weekly/`, `/etc/cron.monthly/` for unfamiliar scripts."] },
    { t: "Review each user's personal crontab: crontab -l -u <user> for every account.",
      d: ["For each account (including root), run `sudo crontab -l -u <username>`.", "Investigate and remove unauthorized entries with `sudo crontab -e -u <username>`."] },
    { t: "Review systemd timers for unauthorized persistence: systemctl list-timers --all.",
      d: ["Run `systemctl list-timers --all`.", "For anything unfamiliar, run `systemctl cat <timer-name>` to inspect what it triggers, and `sudo systemctl disable --now <timer-name>` to remove it if malicious."] },
    { t: "Check /etc/rc.local and any lingering SysV init scripts for unauthorized startup commands.",
      d: ["Run `cat /etc/rc.local`.", "Check `ls /etc/init.d/` for unfamiliar scripts and inspect with `cat`."] },
    { t: "Check shell profile/init files (~/.bashrc, ~/.profile, /etc/profile.d/) for malicious aliases or auto-run commands, including LD_PRELOAD hijacking.",
      d: ["Run `cat ~/.bashrc ~/.profile` for each user, and `ls /etc/profile.d/` then `cat` each file.", "Look for unexpected `alias`, `export LD_PRELOAD=...`, or command execution lines; remove them."] },
    { t: "Check for immutable-flagged files hiding a persistence mechanism: lsattr on suspicious files; remove unauthorized chattr +i if found.",
      d: ["Run `lsattr <file>` on any config file that seems to resist edits.", "If it shows an `i` attribute and isn't supposed to be immutable, run `sudo chattr -i <file>` to remove it, then fix the file."] },
    { t: "Verify PATH variables (system-wide and per-user) haven't been hijacked to prioritize a malicious directory before /usr/bin.",
      d: ["Run `echo $PATH` as different users.", "If a suspicious directory (e.g. /tmp, a user's home dir) appears before /usr/bin or /bin, check `/etc/environment`, `~/.bashrc`, and `~/.profile` for the hijacked export and remove it."] }
  ]
},
{
  title: "13. Miscellaneous Hardening",
  items: [
    { t: "Enable a screen lock/session timeout for GUI environments if applicable.",
      d: ["In the desktop environment's Settings → Privacy/Screen Lock (varies by GUI, e.g. GNOME Settings → Privacy → Screen Lock).", "Enable automatic lock with a short timeout (5-10 min)."] },
    { t: "Disable or restrict USB storage auto-mount only if the README calls for it.",
      d: ["Only if required: blacklist the usb-storage module by adding `install usb-storage /bin/true` to a file in `/etc/modprobe.d/`."] },
    { t: "Verify system time is correct and NTP sync is enabled (timedatectl / chronyd or ntpd).",
      d: ["Run `timedatectl status` and confirm 'NTP synchronized: yes'.", "If not, run `sudo timedatectl set-ntp true`, or ensure `chronyd`/`ntpd` service is enabled and running."] },
    { t: "Confirm README-listed critical services are still running after EVERY major change (systemctl status <service>).",
      d: ["After each major change, run `systemctl status <service>` for every README-required service to confirm it's still active."] },
    { t: "Final full README re-read to confirm every instruction and named vulnerability was addressed.",
      d: ["Reopen the README and go through it line by line, confirming each requirement was actually implemented before time runs out."] }
  ]
},
{
  title: "14. Finals-Round Specific Notes",
  items: [
    { t: "Expect a broken or hijacked PATH, aliased core utilities, or a tampered shell profile — verify which and echo $PATH.",
      d: ["Run `echo $PATH` and `type ls`, `type cat` etc. to check for aliasing tricks.", "Check `~/.bashrc`, `~/.bash_aliases`, and `/etc/profile.d/` for unexpected alias/export lines and remove them."] },
    { t: "Expect LD_PRELOAD-based process hijacking — check /etc/ld.so.preload and per-user environment for unexpected entries.",
      d: ["Run `cat /etc/ld.so.preload` (often empty by default — any entry here is suspicious).", "Run `env | grep LD_PRELOAD` for your session and check shell profiles for exported LD_PRELOAD lines; remove unauthorized entries."] },
    { t: "Expect hidden persistence via systemd timers/services with innocuous names — cross-check every unit against a known-good list.",
      d: ["Run `systemctl list-units --type=service --all` and `systemctl list-timers --all`.", "For each unfamiliar unit, run `systemctl cat <name>` to see exactly what it runs, and disable/remove if unauthorized."] },
    { t: "Expect immutable files (chattr +i) protecting a malicious config from being edited/removed — check with lsattr before assuming a fix failed.",
      d: ["If a config edit doesn't seem to save or a file won't delete, run `lsattr <file>` to check for the `i` flag.", "Clear it with `sudo chattr -i <file>` before retrying your fix."] },
    { t: "Watch for tampered package manager sources or intercepted DNS causing updates to silently fail or pull malicious packages.",
      d: ["If `apt-get update` behaves oddly, re-check /etc/apt/sources.list and /etc/resolv.conf from Sections 4 and 9 for tampering."] },
    { t: "Skim the current year's CIS Benchmark for the specific distro/version for edge-case hardening items beyond the basics above.",
      d: ["Before competition day, search for the CIS Benchmark PDF matching your distro (e.g. 'CIS Ubuntu 22.04 Benchmark') and skim sections not already covered here."] },
    { t: "Track score after each category — if a change doesn't move the score or it drops, investigate/revert immediately rather than pressing on.",
      d: ["Check the Scoring Report after each major section.", "If a change caused a drop, undo it and re-verify before continuing."] },
    { t: "Time budget for a 4-hour round: 0:00–0:15 README+forensics+baseline, 0:15–1:00 users/password/sudo, 1:00–1:45 updates+malware/rootkit scan, 1:45–2:30 services+SSH+firewall, 2:30–3:15 permissions+kernel hardening+cron/persistence, 3:15–3:45 second README pass+verify critical services, 3:45–4:00 final check/screenshots.",
      d: ["Check the clock at each listed checkpoint.", "If behind schedule, prioritize users/sudo/SSH/firewall — they tend to carry the most point weight."] }
  ]
}
];

const QUICK_REF_LINUX = [
  ["View all accounts", "cat /etc/passwd"],
  ["View shadow file", "sudo cat /etc/shadow"],
  ["Edit sudoers safely", "visudo"],
  ["Find SUID/SGID files", "find / -perm -4000 -o -perm -2000 -type f 2>/dev/null"],
  ["Find unowned files", "find / -nouser -o -nogroup 2>/dev/null"],
  ["List running services", "systemctl list-units --type=service --state=running"],
  ["List listening ports", "ss -tulnp"],
  ["List cron jobs", "crontab -l -u <user>"],
  ["List systemd timers", "systemctl list-timers --all"],
  ["Check file attributes", "lsattr <file>"],
  ["Verify installed packages", "dpkg --verify   /   rpm -Va"],
  ["Enable UFW firewall", "sudo ufw enable"],
  ["Update system (Debian/Ubuntu)", "sudo apt-get update && sudo apt-get upgrade"],
  ["Update system (RHEL/CentOS)", "sudo dnf upgrade"],
  ["Restart SSH", "sudo systemctl restart sshd"],
  ["Test sshd config", "sudo sshd -t"],
  ["Apply sysctl changes", "sudo sysctl -p"]
];
