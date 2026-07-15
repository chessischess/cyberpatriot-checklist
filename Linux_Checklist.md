# Linux CyberPatriot Checklist (Finals-Ready)

> Ubuntu/Debian-focused (notes apply to RHEL/CentOS/Fedora too, package manager differs).
> Screenshot your starting score, and again every 15-20 min. Re-read the README after every major change — it overrides this checklist.

---

## 1. User Accounts & Groups

- [ ] `cat /etc/passwd` — cross-reference every account against README's authorized list. Look for UID 0 accounts other than root, and unexpected UID ≥1000 accounts not authorized.
- [ ] Delete or lock unauthorized accounts: `passwd -l <user>` (safer) or `userdel` (only if certain it's unauthorized).
- [ ] Verify group memberships — sudo/wheel/admin groups AND every other group named in the README (custom groups are scored just as often).
- [ ] Check for accounts with no password set, and for duplicate UIDs (a sign of a hidden shadow account).
- [ ] Set strong passwords for every authorized user, including root; confirm root isn't used for routine logins.
- [ ] Verify each service/system account's shell in `/etc/passwd` is `/usr/sbin/nologin`, not `/bin/bash`.

---

## 2. Password & Account Aging Policy

- [ ] Edit `/etc/login.defs`: `PASS_MAX_DAYS 90`, `PASS_MIN_DAYS 10`, `PASS_WARN_AGE 7` — then apply retroactively to existing users with `chage`.
- [ ] Enforce password complexity via PAM: edit `/etc/pam.d/common-password` (pam_pwquality) — `minlen=12`, require upper/lower/digit/special classes.
- [ ] Set failed-login lockout (pam_tally2/pam_faillock, deny 3-5 attempts, unlock 15-30 min) and remove **`nullok`** from `/etc/pam.d/common-auth` (and common-password) — nullok lets blank-password accounts log in with no prompt.
- [ ] Lock direct root login if README allows it (require sudo instead); verify `/etc/shadow` is 640 or stricter, owned by `root:shadow`.

---

## 3. Sudo & Privilege Escalation Vectors

- [ ] Audit `/etc/sudoers` (via `visudo`) and `/etc/sudoers.d/` — remove `NOPASSWD` and `!authenticate` entries unless explicitly authorized; verify only README-authorized users/groups are granted sudo, not `ALL` wildcards.
- [ ] Search for unexpected SUID/SGID binaries — remove the bit (or the file) if unauthorized.
- [ ] Check `/etc/passwd` and `/etc/group` aren't world-writable (should be 644).

---

## 4. Updates & Patch Management

- [ ] Debian/Ubuntu: `apt-get update/upgrade/dist-upgrade`. RHEL/CentOS/Fedora: `yum/dnf update`.
- [ ] Enable automatic security updates (`unattended-upgrades`) AND separately enable daily automatic update **checks** via Software & Updates — these are two distinct settings.
- [ ] Verify package manager sources (`/etc/apt/sources.list`, `sources.list.d/`) aren't pointing to unauthorized repos; remove suspicious third-party PPAs.

---

## 5. Malware, Rootkits & Unauthorized Software

- [ ] Compare installed packages (`dpkg -l` / `rpm -qa`) against README's authorized list — double-check before removing anything, since uninstalling a required package is a scored **penalty**.
- [ ] Uninstall unauthorized hacking/pentest tools (nmap, wireshark, netcat, john, hydra, aircrack-ng, metasploit).
- [ ] Install and run rootkit detectors: `chkrootkit` and `rkhunter` — investigate any findings.
- [ ] Search for prohibited media files and suspicious archives that might hide contraband.
- [ ] Check `/etc/rc.local` and `init.d` for unauthorized startup commands (classic backdoor location); check for unowned files and world-writable directories outside expected locations.

---

## 6. Services & Processes

- [ ] List active services; disable/remove ones not required by README (Telnet, rsh/rlogin, TFTP, unauthenticated FTP, NFS, Samba, nginx/Apache) — harden a required service rather than removing it.
- [ ] Check for unfamiliar processes and their binaries (`ps aux`, `/proc/<pid>/exe`, `lsof`).
- [ ] Check listening ports (`ss -tulnp`) and kill unauthorized reverse-shell-style processes.
- [ ] Disable the X11/GUI display manager on a server role if not required by README.

---

## 7. SSH Hardening

- [ ] Edit `/etc/ssh/sshd_config`: `PermitRootLogin no` (unless required), `PermitEmptyPasswords no`, `PasswordAuthentication` per README, `X11Forwarding no` unless required.
- [ ] Set a reasonable `MaxAuthTries` (e.g. 3) and `LoginGraceTime`; restrict access with `AllowUsers`/`AllowGroups` if README specifies a limited set.
- [ ] Only change the default port (22) if the README explicitly asks — don't do it blindly.
- [ ] Verify config syntax (`sshd -t`) before restarting the service.

---

## 8. Firewall Configuration

- [ ] Install/enable UFW (Debian/Ubuntu) or firewalld (RHEL/CentOS) and enable it to start on boot.
- [ ] Set default policy to deny incoming, allow outgoing (adjust outgoing if README requires stricter).
- [ ] Explicitly allow only required services; review existing rules for anything overly permissive.

---

## 9. File System Permissions & Integrity

- [ ] Verify permissions on `/etc/passwd` (644), `/etc/shadow` (640/600), `/etc/group` (644), `/etc/gshadow` (640/600).
- [ ] Search for and fix world-writable files/directories outside expected temp locations; verify `/tmp` and `/var/tmp` have the sticky bit set.
- [ ] Verify package integrity to detect tampered system binaries (`dpkg --verify` / `rpm -Va`).
- [ ] Check `/etc/hosts`, `/etc/resolv.conf`, `/etc/nsswitch.conf` for tampering — remove malicious static DNS redirects.
- [ ] Verify home directory permissions (750/700) aren't world-readable/writable; verify the **GRUB config** isn't world-readable (`chmod 600 /boot/grub/grub.cfg`).

---

## 10. Kernel & Network Hardening

- [ ] Edit `/etc/sysctl.conf` (or a file in `/etc/sysctl.d/`) and apply with `sysctl -p`: `net.ipv4.ip_forward=0`, `net.ipv4.conf.all.accept_source_route=0`, `net.ipv4.conf.all.accept_redirects=0`, `net.ipv4.conf.all.send_redirects=0`, `net.ipv4.icmp_echo_ignore_broadcasts=1`, `net.ipv4.conf.all.rp_filter=1`, `net.ipv4.tcp_syncookies=1`, `kernel.randomize_va_space=2`.
- [ ] Install and configure `fail2ban` to block repeated failed SSH/login attempts.

---

## 11. Logging & Auditing

- [ ] Install and enable `auditd`; add basic audit rules for changes to `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`.
- [ ] Verify rsyslog is running and logs are current; verify logrotate isn't tampered and logging isn't redirected to `/dev/null`.
- [ ] Review `/var/log/auth.log` (or `/var/log/secure` on RHEL) for suspicious login attempts tied to forensics questions.

---

## 12. Cron, Systemd Timers & Persistence

- [ ] Review system-wide and per-user cron (`/etc/crontab`, `/etc/cron.d/`, `cron.{hourly,daily,weekly,monthly}`, `crontab -l -u <user>` for every account).
- [ ] Review systemd timers for unauthorized persistence.
- [ ] Check `/etc/rc.local`/`init.d` scripts and shell profile files (`~/.bashrc`, `/etc/profile.d`) for malicious startup commands, aliases, or `LD_PRELOAD` hijacking.
- [ ] Check for immutable-flagged files (`lsattr`/`chattr`) hiding a persistence mechanism, and PATH hijacking prioritizing a malicious directory before `/usr/bin`.

---

## 13. Miscellaneous Hardening

- [ ] Enable a screen lock/session timeout for GUI environments if applicable.
- [ ] Verify system time is correct and NTP sync is enabled.
- [ ] Confirm README-listed critical services are still running after EVERY major change.

---

## 14. Finals-Round Notes

- [ ] Expect a hijacked PATH/`LD_PRELOAD`, aliased core utilities, or immutable files (`chattr +i`) protecting a malicious config.
- [ ] Expect hidden persistence via systemd timers/services with innocuous names — cross-check every unit against a known-good list.
- [ ] Track score after each category. Time budget for a **4-hour round**: 0:00-0:15 forensics+baseline, 0:15-1:00 users/password/sudo, 1:00-1:45 updates+malware, 1:45-2:30 services+SSH+firewall, 2:30-3:15 permissions+kernel+cron, 3:15-3:45 second README pass, 3:45-4:00 final check.

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
