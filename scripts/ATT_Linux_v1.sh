#!/bin/bash

###############################################
# DRY RUN PROMPT
###############################################
echo "=============================================="
echo " CyberPatriot Linux Hardening Script"
echo "=============================================="
echo ""
echo "Enable DRY RUN mode? (recommended for testing)"
read -p "Dry run? (y/n): " choice

if [[ "$choice" =~ ^[Yy]$ ]]; then
    DRY_RUN=true
    echo "[DRY RUN ENABLED] No changes will be made."
else
    DRY_RUN=false
    echo "[LIVE MODE] Changes WILL be applied, but you will be asked before each action."
fi

section() {
    echo ""
    echo "===================================================="
    echo "== $1"
    echo "===================================================="
}

ask_permission() {
    local action="$1"
    if $DRY_RUN; then
        echo "[DRY] $action"
        return 1
    fi
    echo ""
    read -p "Perform this action? (y/n): $action " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
        return 0
    else
        echo "Skipped: $action"
        return 1
    fi
}

###############################################
# README LINK + DOWNLOAD
###############################################
section "README Import"

echo "Paste README URL (GitHub/Pastebin/etc.), or leave blank to skip:"
read -p "README URL: " README_URL

README_FILE="/tmp/cp_readme.txt"

if [[ -n "$README_URL" ]]; then
    if $DRY_RUN; then
        echo "[DRY] curl -L \"$README_URL\" -o \"$README_FILE\""
    else
        curl -L "$README_URL" -o "$README_FILE"
    fi

    if [[ -f "$README_FILE" ]]; then
        echo "README downloaded. Preview:"
        head -n 20 "$README_FILE"
    else
        echo "Could not download README, continuing without it."
    fi
else
    echo "No README URL provided, continuing."
fi

###############################################
# SYSTEM UPDATES
###############################################
section "System Updates"

ask_permission "sudo apt update" && sudo apt update
ask_permission "sudo apt full-upgrade -y" && sudo apt full-upgrade -y
ask_permission "sudo apt upgrade -y" && sudo apt upgrade -y
ask_permission "sudo apt autoremove -y" && sudo apt autoremove -y
ask_permission "sudo apt clean" && sudo apt clean

###############################################
# FIREWALL
###############################################
section "Firewall"

ask_permission "sudo ufw enable" && sudo ufw enable
echo "Open ports (ss -tlnp):"
ss -tlnp

###############################################
# PAM HARDENING
###############################################
section "PAM Hardening"

# common-password: yescrypt line add minlen=10
ask_permission "sudo sed -i 's/\\(yescrypt.*\\)/\\1 minlen=10/' /etc/pam.d/common-password" \
  && sudo sed -i 's/\(yescrypt.*\)/\1 minlen=10/' /etc/pam.d/common-password

# common-password: pam_unix.so add remember=3
ask_permission "sudo sed -i 's/\\(pam_unix.so.*\\)/\\1 remember=3/' /etc/pam.d/common-password" \
  && sudo sed -i 's/\(pam_unix.so.*\)/\1 remember=3/' /etc/pam.d/common-password

# common-auth: remove nullok
ask_permission "sudo sed -i 's/nullok//g' /etc/pam.d/common-auth" \
  && sudo sed -i 's/nullok//g' /etc/pam.d/common-auth

###############################################
# SYSCTL HARDENING
###############################################
section "Sysctl Hardening"

SYSCTL="/etc/sysctl.conf"

ask_permission "sudo sed -i 's/kernel.randomize_va_space=0/kernel.randomize_va_space=2/' $SYSCTL" \
  && sudo sed -i 's/kernel.randomize_va_space=0/kernel.randomize_va_space=2/' "$SYSCTL"

ask_permission "sudo sed -i 's/net.ipv4.tcp_syncookies=.*/net.ipv4.tcp_syncookies=1/' $SYSCTL" \
  && sudo sed -i 's/net.ipv4.tcp_syncookies=.*/net.ipv4.tcp_syncookies=1/' "$SYSCTL"

ask_permission "sudo sed -i 's/net.ipv4.ip_forward=.*/net.ipv4.ip_forward=0/' $SYSCTL" \
  && sudo sed -i 's/net.ipv4.ip_forward=.*/net.ipv4.ip_forward=0/' "$SYSCTL"

ask_permission "sudo sysctl --system" && sudo sysctl --system

###############################################
# USER / SUDO / ROOT HARDENING
###############################################
section "User & Sudo Review"

ALL_USERS=$(cut -d: -f1 /etc/passwd)
SUDO_USERS=$(getent group sudo | awk -F: '{print $4}' | tr ',' ' ')

for user in $ALL_USERS; do
    # NOTE: named user_uid, not UID - UID is a readonly bash builtin
    # (the invoking user's own real UID) and silently fails to reassign,
    # which would make every iteration of this loop check the wrong UID.
    user_uid=$(id -u "$user")
    if [[ "$user_uid" -lt 1000 && "$user" != "root" ]]; then
        continue
    fi

    echo "----------------------------------------------"
    echo "User: $user (UID: $user_uid)"

    read -p "Should this user exist? (y/n): " exists
    if [[ "$exists" =~ ^[Nn]$ ]]; then
        ask_permission "sudo userdel -r $user" && sudo userdel -r "$user"
        continue
    fi

    if echo "$SUDO_USERS" | grep -qw "$user"; then
        echo "User is in sudo group."
        read -p "Should this user be in sudo? (y/n): " sudo_ok
        if [[ "$sudo_ok" =~ ^[Nn]$ ]]; then
            ask_permission "sudo deluser $user sudo" && sudo deluser "$user" sudo
        fi
    fi

    read -p "Should this user's password be changed now? (y/n): " pw_change
    if [[ "$pw_change" =~ ^[Yy]$ ]]; then
        ask_permission "sudo passwd $user" && sudo passwd "$user"
        ask_permission "sudo chage -d 0 $user" && sudo chage -d 0 "$user"
        ask_permission "sudo chage -M 90 -m 1 -W 7 $user" && sudo chage -M 90 -m 1 -W 7 "$user"
    fi
done

# Lock root login and root group
ask_permission "sudo passwd -l root" && sudo passwd -l root
ask_permission "sudo gpasswd -l root" && sudo gpasswd -l root

###############################################
# PERMISSIONS
###############################################
section "Critical File Permissions"

ask_permission "sudo chmod 640 /etc/shadow" && sudo chmod 640 /etc/shadow
ask_permission "sudo chmod 600 /boot/grub/grub.cfg" && sudo chmod 600 /boot/grub/grub.cfg

###############################################
# PROHIBITED SOFTWARE REMOVAL
###############################################
section "Prohibited Software Removal"

PROHIBITED_PKGS=("nmap" "wireshark" "ophcrack" "ophcrack-cli" "zenmap" "aMule" "zangband")

for pkg in "${PROHIBITED_PKGS[@]}"; do
    if dpkg -l | grep -q "^ii  $pkg"; then
        ask_permission "sudo apt purge -y $pkg" && sudo apt purge -y "$pkg"
    fi
done

###############################################
# GAME REMOVAL
###############################################
section "Game Removal (/usr/games)"

if [[ -d /usr/games ]]; then
    echo "Games in /usr/games:"
    ls /usr/games
    for game in /usr/games/*; do
        ask_permission "sudo rm -f $game" && sudo rm -f "$game"
    done
fi

###############################################
# PROHIBITED MEDIA FILES
###############################################
section "Prohibited Media Files (.mp3, .ogg)"

echo "Searching for .mp3 files..."
MP3S=$(locate "*.mp3" 2>/dev/null)
for f in $MP3S; do
    ask_permission "sudo rm -f $f" && sudo rm -f "$f"
done

echo "Searching for .ogg files..."
OGGS=$(locate "*.ogg" 2>/dev/null)
for f in $OGGS; do
    ask_permission "sudo rm -f $f" && sudo rm -f "$f"
done

###############################################
# SERVICES
###############################################
section "Service Audit"

echo "Active services:"
systemctl list-units --type=service --state=active

BAD_SERVICES=("vsftpd" "nginx" "squid")

for svc in "${BAD_SERVICES[@]}"; do
    if systemctl list-unit-files | grep -q "$svc"; then
        ask_permission "sudo systemctl disable --now $svc" && sudo systemctl disable --now "$svc"
    fi
done

###############################################
# PORT CHECK
###############################################
section "Port Check (ss -tlnp)"

ss -tlnp

###############################################
# GUEST ACCOUNT / MISC
###############################################
section "Guest / Misc Checks"

echo "Ensure guest account is disabled (check display manager settings manually)."
echo "Check public downloads directory manually for prohibited files."

###############################################
# DONE
###############################################
section "Hardening Complete"

echo "Dry run: $DRY_RUN"
echo "Review output above for any skipped actions."
echo "Script finished."
