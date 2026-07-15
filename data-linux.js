const DATA_LINUX = [
{
  title: "1. User Accounts & Groups",
  items: [
    { t: "cat /etc/passwd — cross-reference every account against README's authorized list. Look for UID 0 accounts other than root, and unexpected UID ≥1000 accounts not authorized.",
      d: ["`cat /etc/passwd` — compare each line to your authorized-user notes.", "`awk -F: '($3 == 0) {print}' /etc/passwd` — only 'root' should appear; any other UID-0 account is a critical backdoor.", "`awk -F: '($3 >= 1000) {print $1, $3}' /etc/passwd` — flag anything unexpected."] },
    { t: "Delete or lock unauthorized accounts: passwd -l <user> (safer) or userdel (only if certain it's unauthorized).",
      d: ["Lock: `sudo passwd -l <username>`.", "Remove: `sudo userdel -r <username>` (also removes home directory)."] },
    { t: "Verify group memberships — sudo/wheel/admin groups AND every other group named in the README (custom groups are scored just as often).",
      d: ["`getent group sudo` (or `wheel` on RHEL), and `getent group <groupname>` for anything else the README names.", "Add: `sudo gpasswd -a <user> <groupname>`. Remove: `sudo gpasswd -d <user> <groupname>`."] },
    { t: "Check for accounts with no password set, and for duplicate UIDs (a sign of a hidden shadow account).",
      d: ["`sudo awk -F: '($2 == \"\") {print $1}' /etc/shadow` — set a password immediately or lock any listed account.", "`awk -F: '{print $3}' /etc/passwd | sort | uniq -d` — investigate any duplicate UID."] },
    { t: "Set strong passwords for every authorized user, including root; confirm root isn't used for routine logins.",
      d: ["`sudo passwd <username>` for each authorized account and for root — 12+ chars, mixed case, digit, symbol.", "Authorized users should use `sudo` for admin tasks rather than logging in directly as root."] },
    { t: "Verify each service/system account's shell in /etc/passwd is /usr/sbin/nologin, not /bin/bash.",
      d: ["`cat /etc/passwd` — check the shell field for non-interactive accounts.", "`sudo usermod -s /usr/sbin/nologin <username>` to fix one that shouldn't have an interactive shell."] }
  ]
},
{
  title: "2. Password & Account Aging Policy",
  items: [
    { t: "Edit /etc/login.defs: PASS_MAX_DAYS 90, PASS_MIN_DAYS 10, PASS_WARN_AGE 7 — then apply retroactively to existing users with chage.",
      d: ["`sudo nano /etc/login.defs` — set the three values.", "For each authorized user: `sudo chage -M 90 -m 10 -W 7 <username>`; verify with `sudo chage -l <username>`."] },
    { t: "Enforce password complexity via PAM: edit /etc/pam.d/common-password (pam_pwquality) — minlen=12, require upper/lower/digit/special classes.",
      d: ["Install if missing: `sudo apt-get install libpam-pwquality`.", "Edit the `password requisite pam_pwquality.so` line: `minlen=12 ucredit=-1 lcredit=-1 dcredit=-1 ocredit=-1 retry=3`."] },
    { t: "Set failed-login lockout (pam_tally2/pam_faillock, deny 3-5 attempts, unlock 15-30 min) and remove 'nullok' from /etc/pam.d/common-auth (and common-password) — nullok lets blank-password accounts log in with no prompt.",
      d: ["`/etc/pam.d/common-auth`: add/edit `auth required pam_faillock.so deny=5 unlock_time=1800`.", "Delete the `nullok` text wherever it appears in common-auth/common-password, keeping the rest of the line intact."] },
    { t: "Lock direct root login if README allows it (require sudo instead); verify /etc/shadow is 640 or stricter, owned by root:shadow.",
      d: ["`sudo passwd -l root` only if the README permits it.", "`ls -l /etc/shadow` should show `-rw-r-----` owned by root:shadow — fix with `chmod 640` / `chown root:shadow` if not."] }
  ]
},
{
  title: "3. Sudo & Privilege Escalation Vectors",
  items: [
    { t: "Audit /etc/sudoers (via visudo) and /etc/sudoers.d/ — remove NOPASSWD and '!authenticate' entries unless explicitly authorized; verify only README-authorized users/groups are granted sudo, not 'ALL' wildcards.",
      d: ["`sudo visudo` (syntax-checks on save) and `sudo cat /etc/sudoers.d/<file>` for each file there.", "Delete/comment out unauthorized NOPASSWD, !authenticate, or overly broad grants."] },
    { t: "Search for unexpected SUID/SGID binaries — remove the bit (or the file) if unauthorized.",
      d: ["`find / -perm -4000 -o -perm -2000 -type f 2>/dev/null` — compare against a known-good baseline.", "`sudo chmod u-s /path/to/binary` to strip an unauthorized SUID bit."] },
    { t: "Check /etc/passwd and /etc/group aren't world-writable (should be 644).",
      d: ["`ls -l /etc/passwd /etc/group` — fix with `sudo chmod 644 /etc/passwd /etc/group` if not."] }
  ]
},
{
  title: "4. Updates & Patch Management",
  items: [
    { t: "Debian/Ubuntu: apt-get update/upgrade/dist-upgrade. RHEL/CentOS/Fedora: yum/dnf update.",
      d: ["`sudo apt-get update && sudo apt-get upgrade -y && sudo apt-get dist-upgrade -y` (reboot if a kernel update applied).", "RHEL: `sudo dnf upgrade -y`."] },
    { t: "Enable automatic security updates (unattended-upgrades) AND separately enable daily automatic update CHECKS via Software & Updates — these are two distinct settings.",
      d: ["`sudo apt-get install unattended-upgrades && sudo dpkg-reconfigure --priority=low unattended-upgrades`.", "Software & Updates → Updates tab → 'Automatically check for updates' → Daily (or set `APT::Periodic::Update-Package-Lists \"1\";` in `/etc/apt/apt.conf.d/20auto-upgrades`)."] },
    { t: "Verify package manager sources (/etc/apt/sources.list, sources.list.d/) aren't pointing to unauthorized repos; remove suspicious third-party PPAs.",
      d: ["`cat /etc/apt/sources.list` and `cat` each file in `sources.list.d/` — comment out/remove anything not a standard mirror.", "`sudo add-apt-repository --remove ppa:<name>` for an unwanted PPA."] }
  ]
},
{
  title: "5. Malware, Rootkits & Unauthorized Software",
  items: [
    { t: "Compare installed packages (dpkg -l / rpm -qa) against README's authorized list — double-check before removing anything, since uninstalling a required package is a scored penalty.",
      d: ["`dpkg -l` or `rpm -qa` — scroll/search against the authorized list."] },
    { t: "Uninstall unauthorized hacking/pentest tools (nmap, wireshark, netcat, john, hydra, aircrack-ng, metasploit).",
      d: ["`sudo apt-get remove --purge nmap wireshark netcat-openbsd john hydra aircrack-ng` (adjust to what's installed and unauthorized)."] },
    { t: "Install and run rootkit detectors: chkrootkit and rkhunter — investigate any findings.",
      d: ["`sudo apt-get install chkrootkit rkhunter`.", "`sudo chkrootkit` and `sudo rkhunter --update && sudo rkhunter --check` — review warnings carefully."] },
    { t: "Search for prohibited media files and suspicious archives that might hide contraband.",
      d: ["`find / -iname '*.mp3' -o -iname '*.mp4' -o -iname '*.avi' 2>/dev/null` (adjust extensions).", "`find /home -iname '*.zip' -o -iname '*.tar.gz' -o -iname '*.rar' 2>/dev/null` — inspect before deleting."] },
    { t: "Check /etc/rc.local and init.d for unauthorized startup commands (classic backdoor location); check for unowned files and world-writable directories outside expected locations.",
      d: ["`cat /etc/rc.local`; `ls /etc/init.d/` for unfamiliar scripts.", "`find / -xdev -nouser -o -nogroup 2>/dev/null` and `find / -xdev -type d -perm -0002 2>/dev/null`."] }
  ]
},
{
  title: "6. Services & Processes",
  items: [
    { t: "List active services; disable/remove ones not required by README (Telnet, rsh/rlogin, TFTP, unauthenticated FTP, NFS, Samba, nginx/Apache) — harden a required service rather than removing it.",
      d: ["`systemctl list-units --type=service --state=running`.", "`sudo systemctl stop <service> && sudo systemctl disable <service>`, or `sudo apt-get remove --purge <package>` to remove it entirely."] },
    { t: "Check for unfamiliar processes and their binaries (ps aux, /proc/<pid>/exe, lsof).",
      d: ["`ps aux` — for anything unfamiliar, `ls -l /proc/<pid>/exe` or `lsof -p <pid>`."] },
    { t: "Check listening ports (ss -tulnp) and kill unauthorized reverse-shell-style processes.",
      d: ["`sudo ss -tulnp` — investigate unexpected LISTENING ports.", "`sudo kill -9 <pid>`, then remove the underlying binary and any persistence mechanism that restarts it."] },
    { t: "Disable the X11/GUI display manager on a server role if not required by README.",
      d: ["`systemctl get-default`; if a GUI isn't required, `sudo systemctl set-default multi-user.target`."] }
  ]
},
{
  title: "7. SSH Hardening",
  items: [
    { t: "Edit /etc/ssh/sshd_config: PermitRootLogin no (unless required), PermitEmptyPasswords no, PasswordAuthentication per README, X11Forwarding no unless required.",
      d: ["`sudo nano /etc/ssh/sshd_config` — set each directive."] },
    { t: "Set a reasonable MaxAuthTries (e.g. 3) and LoginGraceTime; restrict access with AllowUsers/AllowGroups if README specifies a limited set.",
      d: ["`MaxAuthTries 3`, `LoginGraceTime 60`.", "`AllowUsers alice bob` or `AllowGroups sshusers` listing only README-authorized accounts."] },
    { t: "Only change the default port (22) if the README explicitly asks — don't do it blindly.",
      d: ["Update the firewall rule to match if you do change it."] },
    { t: "Verify config syntax (sshd -t) before restarting the service.",
      d: ["`sudo sshd -t` to check for errors, then `sudo systemctl restart sshd`.", "Keep your current session open until you've confirmed you can still log in."] }
  ]
},
{
  title: "8. Firewall Configuration",
  items: [
    { t: "Install/enable UFW (Debian/Ubuntu) or firewalld (RHEL/CentOS) and enable it to start on boot.",
      d: ["`sudo apt-get install ufw && sudo ufw enable && sudo systemctl enable ufw`.", "RHEL: `sudo systemctl enable --now firewalld`."] },
    { t: "Set default policy to deny incoming, allow outgoing (adjust outgoing if README requires stricter).",
      d: ["`sudo ufw default deny incoming`, `sudo ufw default allow outgoing`."] },
    { t: "Explicitly allow only required services; review existing rules for anything overly permissive.",
      d: ["`sudo ufw allow ssh` (or `sudo ufw allow <port>/tcp` for other required services).", "`sudo ufw status verbose` — tighten/remove anything broader than necessary."] }
  ]
},
{
  title: "9. File System Permissions & Integrity",
  items: [
    { t: "Verify permissions on /etc/passwd (644), /etc/shadow (640/600), /etc/group (644), /etc/gshadow (640/600).",
      d: ["`ls -l /etc/passwd /etc/shadow /etc/group /etc/gshadow` — fix mismatches with `chmod`."] },
    { t: "Search for and fix world-writable files/directories outside expected temp locations; verify /tmp and /var/tmp have the sticky bit set.",
      d: ["`find / -xdev -type f -perm -0002 2>/dev/null` — `sudo chmod o-w <path>` for anything outside /tmp.", "`ls -ld /tmp /var/tmp` should end in `t` — `sudo chmod +t` if missing."] },
    { t: "Verify package integrity to detect tampered system binaries (dpkg --verify / rpm -Va).",
      d: ["Investigate any flagged file, especially in /bin, /sbin, /usr/bin, /usr/sbin."] },
    { t: "Check /etc/hosts, /etc/resolv.conf, /etc/nsswitch.conf for tampering — remove malicious static DNS redirects.",
      d: ["`cat` each file — look for unexpected redirect entries or lookup-order tampering, fix to legitimate values."] },
    { t: "Verify home directory permissions (750/700) aren't world-readable/writable; verify the GRUB config isn't world-readable.",
      d: ["`ls -ld /home/*` — `sudo chmod 750 /home/<user>` as needed.", "`ls -alF /boot/grub/grub.cfg` — `sudo chmod 600 /boot/grub/grub.cfg` if world-readable."] }
  ]
},
{
  title: "10. Kernel & Network Hardening",
  items: [
    { t: "Edit /etc/sysctl.conf (or a file in /etc/sysctl.d/) and apply with sysctl -p: ip_forward=0, accept_source_route=0, accept_redirects=0, send_redirects=0, icmp_echo_ignore_broadcasts=1, rp_filter=1, tcp_syncookies=1, randomize_va_space=2.",
      d: ["`sudo nano /etc/sysctl.conf` — add each setting listed in the title, one per line.", "Apply with `sudo sysctl -p` (or `sudo sysctl --system`).", "Verify individually, e.g. `cat /proc/sys/net/ipv4/tcp_syncookies` should output 1."] },
    { t: "Install and configure fail2ban to block repeated failed SSH/login attempts.",
      d: ["`sudo apt-get install fail2ban`.", "`sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local` — ensure `[sshd]` has `enabled = true` — `sudo systemctl restart fail2ban`."] }
  ]
},
{
  title: "11. Logging & Auditing",
  items: [
    { t: "Install and enable auditd; add basic audit rules for changes to /etc/passwd, /etc/shadow, /etc/sudoers.",
      d: ["`sudo apt-get install auditd && sudo systemctl enable --now auditd`.", "`/etc/audit/rules.d/audit.rules`: `-w /etc/passwd -p wa -k passwd_changes` (repeat for shadow, sudoers) — reload with `sudo augenrules --load`."] },
    { t: "Verify rsyslog is running and logs are current; verify logrotate isn't tampered and logging isn't redirected to /dev/null.",
      d: ["`systemctl status rsyslog`; `tail /var/log/auth.log`.", "Check `/etc/logrotate.conf` and `/etc/rsyslog.conf` for suspicious redirects/truncation."] },
    { t: "Review /var/log/auth.log (or /var/log/secure on RHEL) for suspicious login attempts tied to forensics questions.",
      d: ["`sudo less /var/log/auth.log` — `grep` for 'Failed password', 'Accepted password', or specific usernames/dates."] }
  ]
},
{
  title: "12. Cron, Systemd Timers & Persistence",
  items: [
    { t: "Review system-wide and per-user cron (/etc/crontab, /etc/cron.d/, cron.{hourly,daily,weekly,monthly}, crontab -l -u <user> for every account).",
      d: ["`cat /etc/crontab`; `ls /etc/cron.d/` then `cat` each file.", "`sudo crontab -l -u <username>` for every account including root."] },
    { t: "Review systemd timers for unauthorized persistence.",
      d: ["`systemctl list-timers --all` — `systemctl cat <timer-name>` to inspect, `sudo systemctl disable --now <timer-name>` to remove if malicious."] },
    { t: "Check /etc/rc.local/init.d scripts and shell profile files (~/.bashrc, /etc/profile.d) for malicious startup commands, aliases, or LD_PRELOAD hijacking.",
      d: ["`cat /etc/rc.local`; `cat ~/.bashrc ~/.profile`; `cat /etc/profile.d/*`.", "Remove unexpected `alias`, `export LD_PRELOAD=...`, or command execution lines."] },
    { t: "Check for immutable-flagged files (lsattr/chattr) hiding a persistence mechanism, and PATH hijacking prioritizing a malicious directory before /usr/bin.",
      d: ["`lsattr <file>` — `sudo chattr -i <file>` to clear an unauthorized immutable flag.", "`echo $PATH` — check `/etc/environment`, `~/.bashrc`, `~/.profile` for a hijacked export ahead of /usr/bin."] }
  ]
},
{
  title: "13. Miscellaneous Hardening",
  items: [
    { t: "Enable a screen lock/session timeout for GUI environments if applicable.",
      d: ["Desktop Settings → Privacy/Screen Lock — enable automatic lock with a short timeout (5-10 min)."] },
    { t: "Verify system time is correct and NTP sync is enabled.",
      d: ["`timedatectl status` — confirm 'NTP synchronized: yes'; `sudo timedatectl set-ntp true` if not."] },
    { t: "Confirm README-listed critical services are still running after EVERY major change.",
      d: ["`systemctl status <service>` for every README-required service after each major change."] }
  ]
},
{
  title: "14. Finals-Round Notes",
  items: [
    { t: "Expect a hijacked PATH/LD_PRELOAD, aliased core utilities, or immutable files (chattr +i) protecting a malicious config.",
      d: ["`echo $PATH`, `type ls`, `cat /etc/ld.so.preload` — check for tampering.", "`lsattr <file>` before assuming a fix failed — clear with `sudo chattr -i <file>`."] },
    { t: "Expect hidden persistence via systemd timers/services with innocuous names — cross-check every unit against a known-good list.",
      d: ["`systemctl list-units --type=service --all` and `systemctl list-timers --all` — `systemctl cat <name>` to inspect anything unfamiliar."] },
    { t: "Track score after each category — investigate/revert immediately if a change doesn't help. Time budget for a 4-hour round: 0:00–0:15 forensics+baseline, 0:15–1:00 users/password/sudo, 1:00–1:45 updates+malware, 1:45–2:30 services+SSH+firewall, 2:30–3:15 permissions+kernel+cron, 3:15–3:45 second README pass, 3:45–4:00 final check.",
      d: ["If behind schedule, prioritize users/sudo/SSH/firewall — they carry the most point weight."] }
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
