# Linux CyberPatriot Checklist (Finals-Ready)

> Ubuntu/Debian-focused (notes apply to RHEL/CentOS/Fedora too, package manager differs).
> Work order: **Read README → identify distro/baseline score → forensics questions → users/password/sudo → updates → malware/rootkit scan → services/SSH/firewall → permissions/kernel hardening → cron/persistence → misc hardening.**
> Re-read the README after every major change — it overrides this checklist.

---

## 0. Before You Touch Anything

- [ ] Identify distro and version: `cat /etc/os-release` (Ubuntu/Debian use apt; RHEL/CentOS/Fedora use yum/dnf).
- [ ] Screenshot the current Scoring Report/score before making changes.
- [ ] Answer forensics questions first, before the system state changes: `cat`, `less`, `grep`, `find` as needed.
- [ ] If a **packet capture** (`.pcap`/`.pcapng`) is given for forensics, inspect it with `tcpdump -nr <file>.pcap` or Wireshark's `Statistics → Conversations` to find the attacker source IP — look for a source hitting many ports/hosts fast, or repeated failed-auth traffic.

## 1. User Accounts & Groups

- [ ] List all accounts: `cat /etc/passwd` — cross-reference every entry against the README's authorized user list.
- [ ] Look for accounts with UID 0 other than root: `awk -F: '($3 == 0)' /etc/passwd`.
- [ ] Look for unexpected accounts with UID ≥ 1000 not in the README.
- [ ] Delete or lock unauthorized accounts: `passwd -l <user>` or `userdel`.
- [ ] Verify group memberships, especially sudo/wheel/admin groups: `getent group sudo` (or `wheel` on RHEL).
- [ ] Check for accounts with no password set: `awk -F: '($2 == "")' /etc/shadow`.
- [ ] Ensure the root account has a strong password and is not used for routine logins.
- [ ] Set strong passwords for every authorized user: `passwd <user>`.
- [ ] Check for duplicate UIDs/usernames which can indicate a hidden shadow account.
- [ ] Verify each user's shell in `/etc/passwd` — service accounts should use `/usr/sbin/nologin`, not `/bin/bash`.

## 2. Password & Account Aging Policy

- [ ] Edit `/etc/login.defs`: `PASS_MAX_DAYS 90`, `PASS_MIN_DAYS 10`, `PASS_WARN_AGE 7`.
- [ ] Apply aging retroactively to existing users with `chage` (e.g., `chage -M 90 -m 10 -W 7 <user>`).
- [ ] Enforce password complexity via PAM: edit `/etc/pam.d/common-password` using pam_pwquality/pam_cracklib — `minlen=12`, require upper/lower/digit/special classes.
- [ ] Set failed-login lockout via pam_tally2/pam_faillock (deny after 3-5 attempts, unlock time 15-30 min).
- [ ] Disable or lock direct root login where README allows (`passwd -l root`) and require sudo instead.
- [ ] Verify `/etc/shadow` permissions are 640 or stricter, owned by `root:shadow`.

## 3. Sudo & Privilege Escalation Vectors

- [ ] Audit `/etc/sudoers` with `visudo` (never edit directly) and everything under `/etc/sudoers.d/`.
- [ ] Remove any `NOPASSWD` entries unless explicitly authorized by README.
- [ ] Remove any `!authenticate` directives that bypass password prompts for sudo.
- [ ] Verify only README-authorized users/groups are in sudoers, not `ALL` wildcards.
- [ ] Search for world-writable files with SUID/SGID bits: `find / -perm -4000 -o -perm -2000 -type f 2>/dev/null`.
- [ ] Check for unexpected SUID binaries not part of the base OS install; remove the bit (`chmod u-s`) if unauthorized.
- [ ] Check `/etc/passwd` and `/etc/group` for world-writable permissions (should be 644/644, not writable by others).

## 4. Updates & Patch Management

- [ ] Debian/Ubuntu: `sudo apt-get update && sudo apt-get upgrade && sudo apt-get dist-upgrade`.
- [ ] RHEL/CentOS/Fedora: `sudo yum update` or `sudo dnf upgrade`.
- [ ] Enable automatic security updates if the README doesn't forbid it (`unattended-upgrades` on Debian/Ubuntu).
- [ ] Verify package manager sources/repos (`/etc/apt/sources.list`, `/etc/apt/sources.list.d/`) aren't pointing to unauthorized/malicious repositories.
- [ ] Remove any suspicious third-party PPAs or repos not needed for the system's role.

## 5. Malware, Rootkits & Unauthorized Software

- [ ] Compare installed packages (`dpkg -l` or `rpm -qa`) against the README's authorized software list.
- [ ] Uninstall hacking/pentest tools if unauthorized: nmap, wireshark, netcat/ncat, john, hydra, aircrack-ng, metasploit.
- [ ] Install and run rootkit detectors: `chkrootkit` and `rkhunter` — investigate any findings.
- [ ] Search for prohibited media/files per README: `find / -iname '*.mp3' -o -iname '*.mp4' -o -iname '*.avi' 2>/dev/null` (adjust extensions).
- [ ] Search for suspicious archives that might hide contraband: `*.zip`, `*.tar.gz`, `*.rar`, `*.deb` in user home directories.
- [ ] Check `/etc/rc.local` and old-style init scripts for unauthorized startup commands.
- [ ] Check for unowned files: `find / -nouser -o -nogroup 2>/dev/null`.
- [ ] Check for world-writable files/directories outside expected temp locations: `find / -xdev -type d -perm -0002 2>/dev/null`.

## 6. Services & Processes

- [ ] List active services: `systemctl list-units --type=service --state=running` (or `service --status-all` on older SysV systems).
- [ ] Disable/remove services not required by README: Telnet, rsh/rlogin, TFTP, unauthenticated FTP, NFS, Samba if unneeded.
- [ ] If the README requires a specific service (web/SSH/DB), harden it rather than removing it.
- [ ] Check for unfamiliar processes and their binaries: `ps aux` and `lsof -p <pid>` / `ls -l /proc/<pid>/exe`.
- [ ] Check listening ports and the owning process: `ss -tulnp` or `netstat -tulnp`.
- [ ] Investigate and kill unauthorized reverse-shell-style processes.
- [ ] Disable X11/GUI display manager services on a server role if not required by README.

## 7. SSH Hardening

- [ ] Edit `/etc/ssh/sshd_config`: `PermitRootLogin no` (unless README explicitly requires root SSH).
- [ ] `PasswordAuthentication` — set per README.
- [ ] `PermitEmptyPasswords no`.
- [ ] Protocol 2 only (verify no legacy `Protocol 1` config remains).
- [ ] `X11Forwarding no` unless required.
- [ ] Set a reasonable `LoginGraceTime` and `MaxAuthTries` (e.g., `MaxAuthTries 3`).
- [ ] Restrict SSH access with `AllowUsers` / `AllowGroups` if README specifies a limited set.
- [ ] Only change the default port (22) if the README explicitly asks.
- [ ] Restart after changes: `sudo systemctl restart sshd`, but verify config first with `sshd -t`.

## 8. Firewall Configuration

- [ ] Ubuntu/Debian: install/enable UFW — `sudo apt-get install ufw && sudo ufw enable`.
- [ ] Set default policy: `sudo ufw default deny incoming`, `sudo ufw default allow outgoing`.
- [ ] Explicitly allow only required services (e.g., `sudo ufw allow ssh`, `sudo ufw allow 80/tcp`).
- [ ] RHEL/CentOS: use firewalld (`firewall-cmd`) or iptables/nftables — same allow-list principle.
- [ ] Review existing rules for anything overly permissive.
- [ ] Verify the firewall service is enabled to start on boot.

## 9. File System Permissions & Integrity

- [ ] Verify permissions on `/etc/passwd` (644), `/etc/shadow` (640/600), `/etc/group` (644), `/etc/gshadow` (640/600).
- [ ] Search for and fix world-writable files/directories outside of expected temp locations.
- [ ] Verify `/tmp` and `/var/tmp` have the sticky bit set (`chmod +t`).
- [ ] Verify package integrity to detect tampered system binaries: `dpkg --verify` or `rpm -Va`.
- [ ] Check for unexpected changes to `/etc/hosts`, `/etc/resolv.conf`, `/etc/nsswitch.conf`.
- [ ] Check `/etc/hosts` for malicious static DNS-style redirects.
- [ ] Verify home directory permissions (typically 750/700) aren't world-readable/writable.

## 10. Kernel & Network Hardening

- [ ] Edit `/etc/sysctl.conf` (or a file in `/etc/sysctl.d/`) and apply with `sysctl -p`.
- [ ] `net.ipv4.ip_forward = 0` (unless this box is a router/gateway per README).
- [ ] `net.ipv4.conf.all.accept_source_route = 0`.
- [ ] `net.ipv4.conf.all.accept_redirects = 0` and `net.ipv4.conf.all.send_redirects = 0`.
- [ ] `net.ipv4.icmp_echo_ignore_broadcasts = 1`.
- [ ] `net.ipv4.conf.all.rp_filter = 1`.
- [ ] `kernel.randomize_va_space = 2` (ASLR enabled).
- [ ] Install and configure `fail2ban` to block repeated failed SSH/login attempts.

## 11. Logging & Auditing

- [ ] Install and enable auditd: `sudo apt-get install auditd && sudo systemctl enable --now auditd`.
- [ ] Add basic audit rules for changes to `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`, sensitive config directories.
- [ ] Verify rsyslog/syslog is running and logs are being written to `/var/log/`.
- [ ] Verify logrotate is configured so logs aren't disabled or truncated maliciously.
- [ ] Review `/var/log/auth.log` (or `/var/log/secure` on RHEL) for suspicious login attempts.
- [ ] Check that logging hasn't been redirected to `/dev/null` or disabled in `rsyslog.conf`.

## 12. Cron, Systemd Timers & Persistence

- [ ] Review system-wide cron: `/etc/crontab` and `/etc/cron.d/`, `/etc/cron.{hourly,daily,weekly,monthly}/`.
- [ ] Review each user's personal crontab: `crontab -l -u <user>` for every account.
- [ ] Review systemd timers for unauthorized persistence: `systemctl list-timers --all`.
- [ ] Check `/etc/rc.local` and any lingering SysV init scripts.
- [ ] Check shell profile/init files (`~/.bashrc`, `~/.profile`, `/etc/profile.d/`) for malicious aliases or `LD_PRELOAD` hijacking.
- [ ] Check for immutable-flagged files: `lsattr` on suspicious files; remove unauthorized `chattr +i` if found.
- [ ] Verify PATH variables haven't been hijacked to prioritize a malicious directory before `/usr/bin`.

## 13. Miscellaneous Hardening

- [ ] Enable a screen lock/session timeout for GUI environments if applicable.
- [ ] Disable or restrict USB storage auto-mount only if the README calls for it.
- [ ] Verify system time is correct and NTP sync is enabled (`timedatectl` / chronyd or ntpd).
- [ ] Confirm README-listed critical services are still running after EVERY major change.
- [ ] Final full README re-read to confirm every instruction and named vulnerability was addressed.

## 14. Finals-Round Specific Notes

- [ ] Expect a broken or hijacked PATH, aliased core utilities, or a tampered shell profile — check `echo $PATH`.
- [ ] Expect LD_PRELOAD-based process hijacking — check `/etc/ld.so.preload` and per-user environment.
- [ ] Expect hidden persistence via systemd timers/services with innocuous names — cross-check every unit.
- [ ] Expect immutable files (`chattr +i`) protecting a malicious config — check with `lsattr` before assuming a fix failed.
- [ ] Watch for tampered package manager sources or intercepted DNS causing updates to silently fail.
- [ ] Skim the current year's CIS Benchmark for your specific distro/version for edge-case items.
- [ ] Track score after each category — if a change doesn't move the score or it drops, investigate/revert immediately.
- [ ] Time budget for a **4-hour round**:
  - 0:00–0:15 README + forensics questions + baseline
  - 0:15–1:00 Users/password/sudo
  - 1:00–1:45 Updates + malware/rootkit scan
  - 1:45–2:30 Services + SSH + firewall
  - 2:30–3:15 Permissions + kernel hardening + cron/persistence
  - 3:15–3:45 Second README pass + verify critical services
  - 3:45–4:00 Final check, screenshots

---

## Quick Reference

| Item | Command |
|---|---|
| View all accounts | `cat /etc/passwd` |
| View shadow file | `sudo cat /etc/shadow` |
| Edit sudoers safely | `visudo` |
| Find SUID/SGID files | `find / -perm -4000 -o -perm -2000 -type f 2>/dev/null` |
| Find unowned files | `find / -nouser -o -nogroup 2>/dev/null` |
| List running services | `systemctl list-units --type=service --state=running` |
| List listening ports | `ss -tulnp` |
| List cron jobs | `crontab -l -u <user>` |
| List systemd timers | `systemctl list-timers --all` |
| Check file attributes | `lsattr <file>` |
| Verify installed packages | `dpkg --verify` / `rpm -Va` |
| Enable UFW firewall | `sudo ufw enable` |
| Update (Debian/Ubuntu) | `sudo apt-get update && sudo apt-get upgrade` |
| Update (RHEL/CentOS) | `sudo dnf upgrade` |
| Restart SSH | `sudo systemctl restart sshd` |
| Test sshd config | `sudo sshd -t` |
| Apply sysctl changes | `sudo sysctl -p` |

---

*Practice on official CyberPatriot practice images before competition day — muscle memory matters more than this list under a 4-hour clock.*

See also: [Windows Client Checklist](Windows_Client_Checklist.md) · [Windows Server Checklist](Windows_Server_Checklist.md)
