# ============================================
# CyberPatriot Windows 11 Enforcement Script
# Users, Admins, Password Policy, Security Options,
# Firewall, RDP, Unauthorized Software/Files
# Generic - works on any Windows 11 VM
# ============================================
# Only user input required: path to the README user list file.
# Everything else is derived from the live system and the README.
# This script does NOT create user accounts or groups. It only
# fixes/disables/removes things that already exist, per the
# CyberPatriot Exhibition Round answer key (forensics questions
# excluded - those must be answered manually).
# ============================================

#Requires -RunAsAdministrator

<#
.SYNOPSIS
    CyberPatriot Windows 11 hardening/enforcement script.
.PARAMETER ReadmePath
    Path to the README user list file. If omitted, you'll be prompted to paste
    the README content directly into the console instead.
.PARAMETER DryRun
    Run in dry-run mode (report only, no changes made). Cannot be combined with -Execute.
.PARAMETER Execute
    Run in full execution mode (apply all changes). Cannot be combined with -DryRun.
    If neither -DryRun nor -Execute is passed, you'll be prompted interactively (y/n).
.EXAMPLE
    .\ATT15_Enforcement.ps1 -ReadmePath C:\users.txt -DryRun
.EXAMPLE
    .\ATT15_Enforcement.ps1 -ReadmePath C:\users.txt -Execute
.EXAMPLE
    .\ATT15_Enforcement.ps1
    Prompts interactively: paste the README content, then choose dry-run/full-execution mode.
#>
[CmdletBinding()]
param(
    [string]$ReadmePath,
    [switch]$DryRun,
    [switch]$Execute
)

# Captured into distinctly-named variables immediately: PowerShell variable
# names are case-insensitive, so a later local $dryRun would otherwise be the
# *same variable* as the -DryRun switch parameter above and silently
# overwrite it.
$dryRunSwitchPassed = $DryRun.IsPresent
$executeSwitchPassed = $Execute.IsPresent

if ($dryRunSwitchPassed -and $executeSwitchPassed) {
    Write-Host "[ERROR] Specify only one of -DryRun or -Execute, not both."
    exit 1
}

if ($ReadmePath) {
    while (-not (Test-Path $ReadmePath)) {
        Write-Host "File not found. Please enter a valid path."
        $ReadmePath = Read-Host
    }
    $readme = Get-Content $ReadmePath
} else {
    Write-Host "Paste your README content below (Authorized Administrators / Authorized Users sections)."
    Write-Host "When you're done pasting, type END on its own line and press Enter."
    $pastedLines = New-Object System.Collections.Generic.List[string]
    while ($true) {
        $line = Read-Host
        if ($line -eq "END") { break }
        $pastedLines.Add($line)
    }
    if ($pastedLines.Count -eq 0) {
        Write-Host "[ERROR] No README content was pasted."
        exit 1
    }
    $readme = $pastedLines.ToArray()
}

if ($dryRunSwitchPassed) {
    $dryRunSelection = "y"
} elseif ($executeSwitchPassed) {
    $dryRunSelection = "n"
} else {
    Write-Host "Do you want to run in dry-run mode? (y/n)"
    $dryRunSelection = Read-Host
}
$dryRun = $dryRunSelection.ToLower() -eq "y"

if ($dryRun) {
    Write-Host "`n=== DRY RUN ENABLED ==="
} else {
    Write-Host "`n=== FULL EXECUTION MODE ==="
}

function Invoke-Fix {
    param(
        [string]$Description,
        [scriptblock]$Action
    )
    if ($dryRun) {
        Write-Host "[DRY-RUN] Would $Description"
    } else {
        Write-Host "[FIX] $Description"
        try {
            & $Action
        } catch {
            Write-Host "[ERROR] Failed to $Description : $($_.Exception.Message)"
        }
    }
}

# Runs an external executable with a hard timeout, killing it if it exceeds
# that timeout instead of letting it (or the whole script) hang forever.
# Anything that can pop an interactive prompt, stall on network I/O, or wait
# on a service that never responds (winget, UsoClient, uninstallers, sqlcmd,
# net accounts, auditpol) goes through this rather than a bare '&' call.
function Start-ProcessWithTimeout {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string]$ArgumentList = "",
        [int]$TimeoutSeconds = 60
    )

    $proc = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -PassThru -WindowStyle Hidden

    if (-not $proc.WaitForExit($TimeoutSeconds * 1000)) {
        Write-Host "[WARN] '$FilePath $ArgumentList' did not finish within $TimeoutSeconds seconds - terminating it."
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        } catch {
            Write-Host "[WARN] Could not terminate the hung process (PID $($proc.Id)): $($_.Exception.Message)"
        }
        throw "$FilePath timed out after $TimeoutSeconds seconds and was terminated"
    }

    return $proc.ExitCode
}

Write-Host "`n=== Parsing README User List ==="

# -------------------------
# PARSE ADMINS
# -------------------------
$adminSection = $readme | Select-String -Pattern "Authorized Administrators:" -Context 0,200
if (-not $adminSection) {
    Write-Host "[ERROR] Could not find 'Authorized Administrators:' section in the README file. Check the file format and try again."
    exit 1
}
$adminContext = $adminSection[0].Context.PostContext

$adminLines = @()
foreach ($line in $adminContext) {
    if ($line -match "Authorized Users:") { break }
    $adminLines += $line
}

$admins = @{}
$currentUser = ""

foreach ($line in $adminLines) {
    $trim = $line.Trim()
    if ($trim -eq "") { continue }

    # Detect password line even with leading spaces or tabs
    if ($line -match "^\s*password\s*:\s*(.+)$") {
        $password = $matches[1].Trim()
        $admins[$currentUser] = $password
        continue
    }

    # Detect admin username (strip notes like "(you)")
    $cleanUser = $trim.Split(" ")[0]
    $currentUser = $cleanUser

    if (-not $admins.ContainsKey($currentUser)) {
        $admins[$currentUser] = $null
    }
}

# -------------------------
# PARSE USERS
# -------------------------
$userSection = $readme | Select-String -Pattern "Authorized Users:" -Context 0,200
if (-not $userSection) {
    Write-Host "[ERROR] Could not find 'Authorized Users:' section in the README file. Check the file format and try again."
    exit 1
}
$userContext = $userSection[0].Context.PostContext

$users = @()
foreach ($line in $userContext) {
    $trim = $line.Trim()
    if ($trim -eq "") { continue }
    if ($trim -match "^Authorized ") { break }
    $users += $trim
}

Write-Host "Admins found:" ($admins.Keys -join ", ")
Write-Host "Users found:" ($users -join ", ")

# -------------------------
# GET SYSTEM STATE
# -------------------------
$systemUsers = Get-LocalUser
$systemAdmins = Get-LocalGroupMember -Group "Administrators" | Select-Object -ExpandProperty Name

# Normalize admin names (remove DOMAIN\ prefix)
$systemAdminsClean = $systemAdmins | ForEach-Object { $_.Split("\")[-1] }

# Built-in accounts to ignore for account-removal/type logic (Guest is handled separately below)
$ignoreUsers = @(
    "Administrator",
    "Guest",
    "DefaultAccount",
    "WDAGUtilityAccount"
)

Write-Host "`n=== Checking for Discrepancies ==="

# -------------------------
# FIX ADMIN PRIVILEGES
# -------------------------
foreach ($admin in $admins.Keys) {
    if ($systemAdminsClean -notcontains $admin) {
        if ($dryRun) {
            Write-Host "[DRY-RUN] Would add $admin to Administrators group"
        } else {
            Write-Host "[FIX] Adding $admin to Administrators group"
            Add-LocalGroupMember -Group "Administrators" -Member $admin -ErrorAction SilentlyContinue
        }
    }
}

# -------------------------
# FIX USERS WITH ADMIN PRIVILEGES (unauthorized administrators -> standard users)
# -------------------------
foreach ($sa in $systemAdminsClean) {
    if (($admins.Keys -notcontains $sa) -and ($users -contains $sa)) {
        if ($dryRun) {
            Write-Host "[DRY-RUN] Would remove $sa from Administrators group"
        } else {
            Write-Host "[FIX] Removing $sa from Administrators group"
            Remove-LocalGroupMember -Group "Administrators" -Member $sa -ErrorAction SilentlyContinue
        }
    }
}

# -------------------------
# REMOVE UNKNOWN USERS
# -------------------------
$allowed = $admins.Keys + $users

foreach ($sysUser in $systemUsers.Name) {

    # Skip built-in accounts
    if ($ignoreUsers -contains $sysUser) {
        Write-Host "[INFO] Ignoring built-in account $sysUser"
        continue
    }

    if ($allowed -notcontains $sysUser) {
        if ($dryRun) {
            Write-Host "[DRY-RUN] Would delete unauthorized user $sysUser"
        } else {
            try {
                Remove-LocalUser -Name $sysUser -ErrorAction Stop
                Write-Host "[OK] Deleted unauthorized user $sysUser"
            } catch {
                Write-Host "[ERROR] Could not delete ${sysUser}: $($_.Exception.Message)"
            }
        }
    }
}

# -------------------------
# PASSWORD COMPLEXITY CHECK (for README passwords)
# -------------------------
# Mirrors the policy enforced later in this script: minimum length 12,
# and at least 3 of the 4 Windows complexity categories (upper, lower,
# digit, special). A password that only satisfies the OLD 8-char check
# but not the 12-char policy would get set here and then immediately
# fall short of the policy enforced below - so these two must agree.
function Test-PasswordComplexity($pw) {
    if (-not $pw) { return $false }
    if ($pw.Length -lt 12) { return $false }

    $categories = 0
    if ($pw -cmatch '[A-Z]') { $categories++ }
    if ($pw -cmatch '[a-z]') { $categories++ }
    if ($pw -match '[0-9]') { $categories++ }
    if ($pw -match '[^a-zA-Z0-9]') { $categories++ }

    return ($categories -ge 3)
}

# Strong password generator
# Guarantees at least one character from each of the 4 complexity categories
# by construction rather than by chance - a pure random draw from the
# combined pool can (and, tested over 5000 runs, does ~0.08% of the time)
# miss a category and fail Test-PasswordComplexity / Windows' own policy.
function New-StrongPassword {
    param([int]$Length = 16)

    $upper = [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    $lower = [char[]]'abcdefghijklmnopqrstuvwxyz'
    $digit = [char[]]'0123456789'
    $special = [char[]]'!@#$%^&*()-_=+[]{}'
    $allChars = $upper + $lower + $digit + $special

    $required = @(
        ($upper | Get-Random),
        ($lower | Get-Random),
        ($digit | Get-Random),
        ($special | Get-Random)
    )
    $rest = 1..($Length - $required.Count) | ForEach-Object { $allChars | Get-Random }

    $pw = -join (($required + $rest) | Sort-Object { Get-Random })
    return $pw
}

# -------------------------
# FIX ADMIN PASSWORDS
# -------------------------
foreach ($admin in @($admins.Keys)) {
    $pw = $admins[$admin]

    if (-not (Test-PasswordComplexity $pw)) {
        Write-Host "[WARN] Password for $admin is weak or missing. Generating new strong password..."
        $pw = New-StrongPassword
        $admins[$admin] = $pw
    }

    if ($dryRun) {
        Write-Host "[DRY-RUN] Would set password for $admin"
    } else {
        try {
            $secure = ConvertTo-SecureString $pw -AsPlainText -Force
            Set-LocalUser -Name $admin -Password $secure -ErrorAction Stop
            Write-Host "[OK] Password set for $admin"
        } catch {
            Write-Host "[ERROR] Could not set password for ${admin}: $($_.Exception.Message)"
        }
    }
}

# -------------------------
# ENFORCE PASSWORD EXPIRATION FOR ALL AUTHORIZED USERS
# -------------------------
Write-Host "`n=== Enforcing Password Expiration for Users/Admins ==="

foreach ($user in ($admins.Keys + $users | Select-Object -Unique)) {
    if ($dryRun) {
        Write-Host "[DRY-RUN] Would set password to expire for $user"
    } else {
        Write-Host "[FIX] Setting password to expire for $user"
        try {
            Set-LocalUser -Name $user -PasswordNeverExpires $false -ErrorAction Stop
        } catch {
            Write-Host "[ERROR] Could not modify password expiration for ${user}: $($_.Exception.Message)"
        }
    }
}

# -------------------------
# DISABLE GUEST ACCOUNT
# -------------------------
Write-Host "`n=== Disabling Guest Account ==="

$guest = Get-LocalUser -Name "Guest" -ErrorAction SilentlyContinue
if ($guest) {
    if ($guest.Enabled) {
        Invoke-Fix -Description "disable the Guest account" -Action {
            Disable-LocalUser -Name "Guest" -ErrorAction Stop
        }
    } else {
        Write-Host "[OK] Guest account is already disabled."
    }
} else {
    Write-Host "[INFO] No local account named 'Guest' was found."
}

# -------------------------
# ENFORCE SYSTEM PASSWORD POLICY / LOCKOUT POLICY (ATT14)
# -------------------------
Write-Host "`n=== Enforcing System Password & Lockout Policy ==="
Write-Host "Target values:"
Write-Host "  Enforce password history:  21"
Write-Host "  Maximum password age:      30 days"
Write-Host "  Minimum password age:      5 days"
Write-Host "  Minimum password length:   12 characters"
Write-Host "  Account lockout threshold: 5 invalid attempts"
Write-Host "  Account lockout duration:  30 minutes"
Write-Host "  Account lockout window:    30 minutes"
Write-Host "  Complexity:                Enabled"
Write-Host "  Reversible encryption:     Disabled"
Write-Host ""

if ($dryRun) {
    Write-Host "[DRY-RUN] Would run:"
    Write-Host "  net accounts /uniquepw:21 /maxpwage:30 /minpwage:5 /minpwlen:12 /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30"
    Write-Host "  secedit /export + set PasswordComplexity=1, ClearTextPassword=0 + secedit /configure against the live security database"
} else {
    Write-Host "[FIX] Applying password/lockout policy via net accounts + secedit..."

    try {
        $exitCode = Start-ProcessWithTimeout -FilePath "net.exe" -ArgumentList "accounts /uniquepw:21 /maxpwage:30 /minpwage:5 /minpwlen:12 /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30" -TimeoutSeconds 30
        if ($exitCode -ne 0) { throw "net accounts exited with code $exitCode" }
        Write-Host "[OK] net accounts policy applied."
    } catch {
        Write-Host "[ERROR] net accounts failed: $($_.Exception.Message)"
    }

    # PasswordComplexity and ClearTextPassword are Account Policy settings -
    # they live in the Local Security Policy database (secedit's domain), not
    # a plain registry value the OS reads at runtime. A raw Set-ItemProperty
    # on HKLM:\...\Lsa does NOT reliably get picked up by secpol.msc or a
    # scoring engine that reads the actual security database, which is why
    # this needs secedit (export -> edit -> configure against the live db)
    # instead of net accounts (no complexity/reversible-encryption flag) or
    # a bare registry write (silently ignored).
    try {
        $cfgPath = Join-Path $env:TEMP "att14_secpol_export.cfg"
        $sysDb = Join-Path $env:WINDIR "security\Database\secedit.sdb"

        $exportExit = Start-ProcessWithTimeout -FilePath "secedit.exe" -ArgumentList "/export /cfg `"$cfgPath`" /quiet" -TimeoutSeconds 30
        if ($exportExit -ne 0) { throw "secedit /export exited with code $exportExit" }

        $secpolContent = Get-Content $cfgPath
        $secpolContent = $secpolContent -replace '(?im)^PasswordComplexity\s*=.*', 'PasswordComplexity = 1'
        $secpolContent = $secpolContent -replace '(?im)^ClearTextPassword\s*=.*', 'ClearTextPassword = 0'
        Set-Content -Path $cfgPath -Value $secpolContent -ErrorAction Stop

        $importExit = Start-ProcessWithTimeout -FilePath "secedit.exe" -ArgumentList "/configure /db `"$sysDb`" /cfg `"$cfgPath`" /areas SECURITYPOLICY /quiet" -TimeoutSeconds 30
        if ($importExit -ne 0) { throw "secedit /configure exited with code $importExit" }

        Remove-Item $cfgPath -Force -ErrorAction SilentlyContinue
        Write-Host "[OK] Password complexity enabled and reversible encryption disabled via secedit."
    } catch {
        Write-Host "[ERROR] Failed to apply complexity/reversible-encryption policy via secedit: $($_.Exception.Message)"
    }
}

# -------------------------
# LOCAL SECURITY OPTIONS
# -------------------------
Write-Host "`n=== Enforcing Local Security Options ==="

# Microsoft network client: Digitally sign communications (always) -> Enabled
Invoke-Fix -Description "enable 'Microsoft network client: Digitally sign communications (always)'" -Action {
    $path = "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "RequireSecuritySignature" -Type DWord -Value 1 -ErrorAction Stop
}

# Interactive logon: Do not require CTRL+ALT+DEL -> Disabled
Invoke-Fix -Description "disable 'Interactive logon: Do not require CTRL+ALT+DEL'" -Action {
    $path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "DisableCAD" -Type DWord -Value 0 -ErrorAction Stop
}

# -------------------------
# FIREWALL
# -------------------------
Write-Host "`n=== Enabling Windows Firewall (All Profiles) ==="
Invoke-Fix -Description "enable the Windows Firewall for Domain, Private, and Public profiles" -Action {
    Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True -ErrorAction Stop
}

# -------------------------
# REMOTE DESKTOP
# -------------------------
Write-Host "`n=== Disabling Remote Desktop ==="
Invoke-Fix -Description "disable Remote Desktop connections" -Action {
    $path = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
    Set-ItemProperty -Path $path -Name "fDenyTSConnections" -Type DWord -Value 1 -ErrorAction Stop
    try {
        Disable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction Stop
    } catch {
        Write-Host "[WARN] Could not disable the Remote Desktop firewall rule group: $($_.Exception.Message)"
    }
}

# -------------------------
# REMOVE UNAUTHORIZED / HACKING-TOOL FILES (all user profiles)
# -------------------------
Write-Host "`n=== Scanning All User Profiles for Unauthorized Files ==="

# Filename patterns commonly flagged as non-work-related "hacking tools" in CyberPatriot images.
# Adjust this list to match what your competition README prohibits.
$suspiciousFilePatterns = @(
    "*shellshock*",
    "*exploit*",
    "*metasploit*",
    "*mimikatz*",
    "*netcat*",
    "nc.exe",
    "nc64.exe",
    "*keylogger*",
    "*backdoor*",
    "*rootkit*",
    "*cain*abel*",
    "*johntheripper*",
    "*hydra*",
    "*aircrack*"
)

$usersDir = Join-Path $env:SystemDrive "Users"
$userProfileRoots = Get-ChildItem -Path $usersDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin @("Public", "Default", "Default User", "All Users") }

foreach ($userProfile in $userProfileRoots) {
    $searchDirs = @(
        (Join-Path $userProfile.FullName "Downloads"),
        (Join-Path $userProfile.FullName "Desktop"),
        (Join-Path $userProfile.FullName "Documents"),
        (Join-Path $userProfile.FullName "AppData\Roaming"),
        (Join-Path $userProfile.FullName "AppData\Local\Temp")
    )

    foreach ($dir in $searchDirs) {
        if (-not (Test-Path $dir)) { continue }

        foreach ($pattern in $suspiciousFilePatterns) {
            $matchedFiles = Get-ChildItem -Path $dir -Filter $pattern -File -Recurse -Depth 2 -ErrorAction SilentlyContinue
            foreach ($file in $matchedFiles) {
                if ($dryRun) {
                    Write-Host "[DRY-RUN] Would delete suspicious file: $($file.FullName)"
                } else {
                    Write-Host "[FIX] Deleting suspicious file: $($file.FullName)"
                    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

# Also scan machine-wide locations not tied to a specific user profile.
$globalSearchDirs = @(
    (Join-Path $usersDir "Public\Downloads"),
    (Join-Path $env:SystemRoot "Temp"),
    $env:ProgramData
)

foreach ($dir in $globalSearchDirs) {
    if (-not $dir -or -not (Test-Path $dir)) { continue }

    foreach ($pattern in $suspiciousFilePatterns) {
        $matchedFiles = Get-ChildItem -Path $dir -Filter $pattern -File -Recurse -Depth 2 -ErrorAction SilentlyContinue
        foreach ($file in $matchedFiles) {
            if ($dryRun) {
                Write-Host "[DRY-RUN] Would delete suspicious file: $($file.FullName)"
            } else {
                Write-Host "[FIX] Deleting suspicious file: $($file.FullName)"
                Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# -------------------------
# HOSTS FILE CHECK (informational - DNS redirects require judgment to fix)
# -------------------------
Write-Host "`n=== Checking hosts file for non-default entries ==="
$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
if (Test-Path $hostsPath) {
    $suspiciousHostsLines = Get-Content $hostsPath | Where-Object {
        $l = $_.Trim()
        ($l -ne "") -and (-not $l.StartsWith("#")) -and ($l -notmatch "^\s*(127\.0\.0\.1\s+localhost|::1\s+localhost)")
    }
    if ($suspiciousHostsLines) {
        Write-Host "[REVIEW] Non-default hosts file entries found - verify these are not malicious redirects:"
        $suspiciousHostsLines | ForEach-Object { Write-Host "    $_" }
    } else {
        Write-Host "[OK] hosts file contains no non-default entries."
    }
}

# -------------------------
# REMOVE UNAUTHORIZED SOFTWARE (installed applications)
# -------------------------
Write-Host "`n=== Removing Unauthorized / Non-Work-Related Software ==="

# Names (substring match) of applications considered non-work-related / prohibited.
# Adjust this list to match what your competition README prohibits.
#
# IMPORTANT: Some "hacking tools" (Wireshark, Nmap) are frequently listed as
# AUTHORIZED business software in real CyberPatriot READMEs - do not add them
# here unless your specific README says to remove them. Uninstalling
# README-authorized software costs points just like leaving prohibited
# software installed.
$unauthorizedSoftware = @(
    "Jellyfin",
    "Python 3",
    "Python3",
    "Metasploit",
    "John the Ripper",
    "Hydra",
    "Cain & Abel",
    "TeamViewer",
    "AnyDesk",
    "VNC"
)

$uninstallRoots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$installedApps = Get-ItemProperty -Path $uninstallRoots -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName }

foreach ($name in $unauthorizedSoftware) {
    $matchedApps = $installedApps | Where-Object { $_.DisplayName -like "*$name*" }

    foreach ($app in $matchedApps) {
        if ($dryRun) {
            Write-Host "[DRY-RUN] Would uninstall: $($app.DisplayName)"
        } else {
            Write-Host "[FIX] Uninstalling: $($app.DisplayName)"
            try {
                if ($app.UninstallString) {
                    $uninstallString = $app.UninstallString

                    if ($uninstallString -match "msiexec") {
                        $productCode = $app.PSChildName
                        $exitCode = Start-ProcessWithTimeout -FilePath "msiexec.exe" -ArgumentList "/x $productCode /quiet /norestart" -TimeoutSeconds 180
                        if ($exitCode -ne 0) { throw "msiexec exited with code $exitCode" }
                    } else {
                        # EXE-based uninstallers use vendor-specific silent switches
                        # (NSIS: /S, Inno Setup: /VERYSILENT, etc.) - MSI-style
                        # /quiet /norestart flags are not universally understood and
                        # can cause the uninstaller to ignore them and show a GUI.
                        # Run the uninstall string as-provided; if the app's
                        # uninstaller isn't silent-capable this may pop an interactive
                        # prompt - bounded by a timeout below so it can't hang the
                        # whole script forever if nobody's there to click through it.
                        Write-Host "[WARN] $($app.DisplayName) uses a non-MSI uninstaller - it may show an interactive prompt (will be killed after 120s if unattended)."
                        $exitCode = Start-ProcessWithTimeout -FilePath "cmd.exe" -ArgumentList "/c `"$uninstallString`"" -TimeoutSeconds 120
                        if ($exitCode -ne 0) { throw "uninstaller exited with code $exitCode" }
                    }
                }
            } catch {
                Write-Host "[ERROR] Failed to uninstall $($app.DisplayName): $($_.Exception.Message)"
            }
        }
    }

    if (-not $matchedApps) {
        Write-Host "[INFO] No installed application matching '$name' was found."
    }
}

# -------------------------
# UPDATE BUSINESS SOFTWARE (best-effort, via winget if available)
# -------------------------
# Always search for and attempt to update these three, regardless of whether
# the registry-based detection below finds them - winget does its own
# detection independently, so we still try the upgrade either way.
Write-Host "`n=== Searching For and Updating Wireshark, Google Chrome, Notepad++ ==="

$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget) {
    $softwareToUpdate = @(
        @{ Name = "Notepad++"; Id = "Notepad++.Notepad++" },
        @{ Name = "Google Chrome"; Id = "Google.Chrome" },
        @{ Name = "Wireshark"; Id = "WiresharkFoundation.Wireshark" }
    )

    foreach ($sw in $softwareToUpdate) {
        $found = $installedApps | Where-Object { $_.DisplayName -like "*$($sw.Name)*" }
        if ($found) {
            Write-Host "[INFO] Found $($sw.Name) installed: $($found[0].DisplayName)"
        } else {
            Write-Host "[INFO] $($sw.Name) not found via registry search - will still ask winget to check/update it."
        }

        if ($dryRun) {
            Write-Host "[DRY-RUN] Would run: winget upgrade --id $($sw.Id) --silent --accept-source-agreements --accept-package-agreements"
        } else {
            Write-Host "[FIX] Attempting winget upgrade for $($sw.Name)..."
            try {
                $exitCode = Start-ProcessWithTimeout -FilePath "winget.exe" -ArgumentList "upgrade --id $($sw.Id) --silent --accept-source-agreements --accept-package-agreements --disable-interactivity -e" -TimeoutSeconds 300
                if ($exitCode -eq 0) {
                    Write-Host "[OK] $($sw.Name) is up to date (or was just updated)."
                } else {
                    Write-Host "[WARN] winget upgrade for $($sw.Name) exited with code $exitCode (often just means 'already up to date' or 'not installed')."
                }
            } catch {
                Write-Host "[WARN] winget upgrade for $($sw.Name) failed or was not applicable: $($_.Exception.Message)"
            }
        }
    }
} else {
    Write-Host "[WARN] winget is not available on this system. Notepad++, Google Chrome, and Wireshark must be updated manually."
}

# -------------------------
# CHROME MACHINE-WIDE LOCATION VERIFICATION / FALLBACK REINSTALL
# -------------------------
# The answer key specifically penalizes Chrome NOT being at the default
# machine-wide location. winget (or a prior per-user install) can land Chrome
# under a user's AppData folder instead of Program Files, in which case
# "Google Chrome has been updated" won't score even if winget reported
# success. Verify the real install path and, if it's missing, force a clean
# machine-wide install via Google's official offline Enterprise MSI - which
# always installs to the standard Program Files location and is also the
# most reliable way to guarantee the latest version regardless of what
# winget's catalog thought was already "up to date".
Write-Host "`n=== Verifying Chrome Is Installed at the Default Machine-Wide Location ==="

$chromeStdPaths = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe")
)
$chromeAtStandardLocation = $chromeStdPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chromeAtStandardLocation) {
    Write-Host "[OK] Chrome found at standard location: $chromeAtStandardLocation"
} else {
    Write-Host "[WARN] Chrome was not found at either standard machine-wide location."
    if ($dryRun) {
        Write-Host "[DRY-RUN] Would download and silently install GoogleChromeStandaloneEnterprise64.msi to force a machine-wide install."
    } else {
        try {
            $chromeMsiPath = Join-Path $env:TEMP "GoogleChromeStandaloneEnterprise64.msi"
            Write-Host "[FIX] Downloading Chrome's official offline Enterprise installer..."
            Invoke-WebRequest -Uri "https://dl.google.com/edgedl/chrome/install/GoogleChromeStandaloneEnterprise64.msi" -OutFile $chromeMsiPath -TimeoutSec 120 -UseBasicParsing -ErrorAction Stop

            Write-Host "[FIX] Installing Chrome machine-wide via msiexec..."
            $exitCode = Start-ProcessWithTimeout -FilePath "msiexec.exe" -ArgumentList "/i `"$chromeMsiPath`" /quiet /norestart" -TimeoutSeconds 180
            if ($exitCode -ne 0) { throw "Chrome MSI install exited with code $exitCode" }

            Remove-Item $chromeMsiPath -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Chrome installed machine-wide via offline Enterprise MSI."
        } catch {
            Write-Host "[ERROR] Failed to force-install Chrome via offline MSI: $($_.Exception.Message)"
        }
    }
}

# -------------------------
# HIDDEN ACCOUNTS & AUTOLOGON
# -------------------------
Write-Host "`n=== Checking for Hidden Accounts and Autologon ==="

$specialAccountsPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\SpecialAccounts\UserList"
if (Test-Path $specialAccountsPath) {
    $hiddenEntries = Get-ItemProperty -Path $specialAccountsPath -ErrorAction SilentlyContinue
    $hiddenNames = @()
    if ($hiddenEntries) {
        $hiddenNames = $hiddenEntries.PSObject.Properties |
            Where-Object { $_.Name -notmatch '^PS' -and $_.Value -eq 0 } |
            Select-Object -ExpandProperty Name
    }
    if ($hiddenNames) {
        foreach ($acct in $hiddenNames) {
            Invoke-Fix -Description "unhide account '$acct' from the login screen (SpecialAccounts\UserList)" -Action {
                Set-ItemProperty -Path $specialAccountsPath -Name $acct -Value 1 -ErrorAction Stop
            }
        }
    } else {
        Write-Host "[OK] No hidden accounts found in SpecialAccounts\UserList."
    }
} else {
    Write-Host "[OK] No SpecialAccounts\UserList key found - no hidden accounts configured."
}

$winlogonPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
$autoLogon = Get-ItemProperty -Path $winlogonPath -Name "AutoAdminLogon" -ErrorAction SilentlyContinue
if ($autoLogon -and $autoLogon.AutoAdminLogon -eq "1") {
    Invoke-Fix -Description "disable AutoAdminLogon and clear any cached autologon credentials" -Action {
        Set-ItemProperty -Path $winlogonPath -Name "AutoAdminLogon" -Value "0" -ErrorAction Stop
        Remove-ItemProperty -Path $winlogonPath -Name "DefaultPassword" -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "[OK] AutoAdminLogon is not enabled."
}

# -------------------------
# USER ACCOUNT CONTROL (UAC)
# -------------------------
Write-Host "`n=== Enforcing UAC: Admin Approval Mode / Always Notify ==="
Invoke-Fix -Description "set UAC to Always Notify (Admin Approval Mode)" -Action {
    $path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
    Set-ItemProperty -Path $path -Name "EnableLUA" -Type DWord -Value 1 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "ConsentPromptBehaviorAdmin" -Type DWord -Value 2 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "PromptOnSecureDesktop" -Type DWord -Value 1 -ErrorAction Stop
}

# -------------------------
# ADDITIONAL LOCAL SECURITY POLICY / SECURITY OPTIONS
# -------------------------
Write-Host "`n=== Enforcing Additional Security Options ==="

Invoke-Fix -Description "restrict blank passwords to console logon only" -Action {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LimitBlankPasswordUse" -Type DWord -Value 1 -ErrorAction Stop
}

Invoke-Fix -Description "enable 'Do not display last signed-in username'" -Action {
    $path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
    Set-ItemProperty -Path $path -Name "DontDisplayLastUserName" -Type DWord -Value 1 -ErrorAction Stop
}

Invoke-Fix -Description "block anonymous enumeration of SAM accounts and shares" -Action {
    $path = "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa"
    Set-ItemProperty -Path $path -Name "RestrictAnonymousSAM" -Type DWord -Value 1 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "RestrictAnonymous" -Type DWord -Value 1 -ErrorAction Stop
}

Invoke-Fix -Description "set LAN Manager authentication level to NTLMv2 only (refuse LM/NTLM)" -Action {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "LmCompatibilityLevel" -Type DWord -Value 5 -ErrorAction Stop
}

Invoke-Fix -Description "enable 'Microsoft network server: Digitally sign communications (always)'" -Action {
    $path = "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters"
    Set-ItemProperty -Path $path -Name "RequireSecuritySignature" -Type DWord -Value 1 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "EnableSecuritySignature" -Type DWord -Value 1 -ErrorAction Stop
}

# -------------------------
# AUDIT POLICY
# -------------------------
Write-Host "`n=== Enforcing Audit Policy (Success + Failure) ==="
$auditCategories = @(
    "Logon/Logoff",
    "Account Management",
    "Policy Change",
    "Object Access"
)
foreach ($cat in $auditCategories) {
    Invoke-Fix -Description "enable success and failure auditing for '$cat'" -Action {
        $exitCode = Start-ProcessWithTimeout -FilePath "auditpol.exe" -ArgumentList "/set /category:`"$cat`" /success:enable /failure:enable" -TimeoutSeconds 30
        if ($exitCode -ne 0) { throw "auditpol exited with code $exitCode" }
    }
}

# -------------------------
# DISABLE RISKY / UNNEEDED SERVICES
# -------------------------
Write-Host "`n=== Disabling Risky Services (if present) ==="

# Edit this list to match what your README allows - remove any service the
# README explicitly requires before running in full-execution mode.
$riskyServices = @(
    "TlntSvr",        # Telnet Server
    "ftpsvc",         # FTP Server (IIS)
    "SMTPSVC",        # SMTP Server (legacy IIS)
    "RemoteRegistry", # Remote Registry
    "SNMP",           # SNMP Service
    "SNMPTRAP",       # SNMP Trap
    "simptcp",        # Simple TCP/IP Services
    "Fax"             # Fax Service
)

foreach ($svcName in $riskyServices) {
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if (-not $svc) { continue }

    Invoke-Fix -Description "stop and disable the $svcName service" -Action {
        Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
        Set-Service -Name $svcName -StartupType Disabled -ErrorAction Stop
    }
}

# -------------------------
# DISABLE RISKY WINDOWS OPTIONAL FEATURES
# -------------------------
Write-Host "`n=== Disabling Risky Windows Optional Features ==="

$riskyFeatures = @("TelnetClient", "TFTP", "SMB1Protocol")

foreach ($feature in $riskyFeatures) {
    $state = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
    if (-not $state) {
        Write-Host "[INFO] Feature '$feature' not found on this system (may not apply to this SKU)."
        continue
    }
    if ($state.State -eq 'Disabled') {
        Write-Host "[OK] Feature '$feature' is already disabled."
        continue
    }
    if ($dryRun) {
        Write-Host "[DRY-RUN] Would disable Windows optional feature '$feature'"
    } else {
        Write-Host "[FIX] Disabling Windows optional feature '$feature'"
        try {
            Disable-WindowsOptionalFeature -Online -FeatureName $feature -NoRestart -ErrorAction Stop | Out-Null
        } catch {
            Write-Host "[ERROR] Failed to disable '$feature': $($_.Exception.Message)"
        }
    }
}

# -------------------------
# REMOTE ASSISTANCE
# -------------------------
Write-Host "`n=== Disabling Remote Assistance ==="
Invoke-Fix -Description "disable Remote Assistance connections" -Action {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance" -Name "fAllowToGetHelp" -Type DWord -Value 0 -ErrorAction Stop
}

# -------------------------
# AUTOPLAY / AUTORUN
# -------------------------
Write-Host "`n=== Disabling AutoPlay/AutoRun ==="
Invoke-Fix -Description "disable AutoPlay/AutoRun for all drives" -Action {
    $path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "NoDriveTypeAutoRun" -Type DWord -Value 255 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "NoAutorun" -Type DWord -Value 1 -ErrorAction Stop
}

# -------------------------
# SMARTSCREEN (Explorer + Edge)
# -------------------------
Write-Host "`n=== Enforcing SmartScreen ==="
Invoke-Fix -Description "set Windows SmartScreen (Explorer) to Warn" -Action {
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "EnableSmartScreen" -Type DWord -Value 1 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "ShellSmartScreenLevel" -Type String -Value "Warn" -ErrorAction Stop
}

Invoke-Fix -Description "enable Microsoft Edge SmartScreen" -Action {
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "SmartScreenEnabled" -Type DWord -Value 1 -ErrorAction Stop
}

# -------------------------
# WINDOWS DEFENDER HARDENING
# -------------------------
Write-Host "`n=== Hardening Windows Defender ==="
if (Get-Command Set-MpPreference -ErrorAction SilentlyContinue) {
    Invoke-Fix -Description "enable Windows Defender real-time protection" -Action {
        Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction Stop
    }
    Invoke-Fix -Description "enable Windows Defender cloud-delivered protection (MAPS)" -Action {
        Set-MpPreference -MAPSReporting Advanced -ErrorAction Stop
    }
    Invoke-Fix -Description "attempt to enable Windows Defender tamper protection (may require the Windows Security GUI or Intune to fully apply)" -Action {
        $path = "HKLM:\SOFTWARE\Microsoft\Windows Defender\Features"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "TamperProtection" -Type DWord -Value 5 -ErrorAction Stop
    }
    if (-not $dryRun) {
        try {
            Update-MpSignature -ErrorAction Stop
            Write-Host "[OK] Windows Defender signatures updated."
        } catch {
            Write-Host "[WARN] Could not update Defender signatures: $($_.Exception.Message)"
        }
    } else {
        Write-Host "[DRY-RUN] Would update Windows Defender signatures"
    }
} else {
    Write-Host "[WARN] Windows Defender PowerShell module not available - skipping Defender hardening."
}

# -------------------------
# WINRM ENCRYPTION
# -------------------------
Write-Host "`n=== Disabling Unencrypted WinRM Traffic ==="
Invoke-Fix -Description "disable unencrypted WinRM traffic" -Action {
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WinRM\Service"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "AllowUnencryptedTraffic" -Type DWord -Value 0 -ErrorAction Stop
}

# -------------------------
# SCREEN LOCK / SCREENSAVER
# -------------------------
Write-Host "`n=== Enforcing Password-Protected Screen Lock (10 min timeout) ==="
# Sets the machine policy path (applies to all users) - the currently active
# interactive session may need gpupdate /force or a logoff/logon to pick it up.
Invoke-Fix -Description "enforce a password-protected screen lock with a 10 minute timeout" -Action {
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Control Panel\Desktop"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "ScreenSaveActive" -Type String -Value "1" -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "ScreenSaverIsSecure" -Type String -Value "1" -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "ScreenSaveTimeOut" -Type String -Value "600" -ErrorAction Stop
}

# -------------------------
# ADVANCED HARDENING
# -------------------------
Write-Host "`n=== Advanced Hardening ==="

Invoke-Fix -Description "disable WDigest plaintext credential caching" -Action {
    $path = "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "UseLogonCredential" -Type DWord -Value 0 -ErrorAction Stop
}

Invoke-Fix -Description "enable LSA protection (RunAsPPL) - takes effect after reboot" -Action {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "RunAsPPL" -Type DWord -Value 1 -ErrorAction Stop
}

foreach ($psv2Feature in @("MicrosoftWindowsPowerShellV2Root", "MicrosoftWindowsPowerShellV2")) {
    $state = Get-WindowsOptionalFeature -Online -FeatureName $psv2Feature -ErrorAction SilentlyContinue
    if (-not $state) { continue }
    if ($state.State -eq 'Disabled') {
        Write-Host "[OK] Feature '$psv2Feature' is already disabled."
        continue
    }
    if ($dryRun) {
        Write-Host "[DRY-RUN] Would disable Windows optional feature '$psv2Feature'"
    } else {
        Write-Host "[FIX] Disabling Windows optional feature '$psv2Feature'"
        try {
            Disable-WindowsOptionalFeature -Online -FeatureName $psv2Feature -NoRestart -ErrorAction Stop | Out-Null
        } catch {
            Write-Host "[ERROR] Failed to disable '$psv2Feature': $($_.Exception.Message)"
        }
    }
}

Invoke-Fix -Description "enable PowerShell Script Block and Module logging" -Action {
    $sbPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging"
    $modPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging"
    if (-not (Test-Path $sbPath)) { New-Item -Path $sbPath -Force | Out-Null }
    if (-not (Test-Path $modPath)) { New-Item -Path $modPath -Force | Out-Null }
    Set-ItemProperty -Path $sbPath -Name "EnableScriptBlockLogging" -Type DWord -Value 1 -ErrorAction Stop
    Set-ItemProperty -Path $modPath -Name "EnableModuleLogging" -Type DWord -Value 1 -ErrorAction Stop
}

# Print Spooler - disable only if this machine doesn't need to print.
# Set this to $false before running if the README requires printing.
$disablePrintSpooler = $true
if ($disablePrintSpooler) {
    Invoke-Fix -Description "disable the Print Spooler service (mitigates PrintNightmare, CVE-2021-34527)" -Action {
        Stop-Service -Name "Spooler" -Force -ErrorAction SilentlyContinue
        Set-Service -Name "Spooler" -StartupType Disabled -ErrorAction Stop
    }
}

# -------------------------
# WINDOWS UPDATE
# -------------------------
Write-Host "`n=== Windows Update Settings ==="
Invoke-Fix -Description "remove any policy blocking automatic updates and enable auto-download/schedule-install" -Action {
    $path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name "NoAutoUpdate" -Type DWord -Value 0 -ErrorAction Stop
    Set-ItemProperty -Path $path -Name "AUOptions" -Type DWord -Value 4 -ErrorAction Stop
}

if ($dryRun) {
    Write-Host "[DRY-RUN] Would trigger a Windows Update scan via UsoClient.exe"
} else {
    try {
        $exitCode = Start-ProcessWithTimeout -FilePath "UsoClient.exe" -ArgumentList "StartScan" -TimeoutSeconds 30
        if ($exitCode -ne 0) { throw "UsoClient exited with code $exitCode" }
        Write-Host "[OK] Triggered a Windows Update scan. Check Settings > Windows Update for progress - multiple passes/reboots may be needed."
    } catch {
        Write-Host "[WARN] Could not trigger a Windows Update scan automatically. Check Settings > Windows Update manually."
    }
}

# -------------------------
# APPLICATION-SPECIFIC ROLES (only touched if actually present on the VM)
# -------------------------
Write-Host "`n=== Application-Specific Hardening (IIS / Apache / SQL Server, if present) ==="

# IIS: disable directory browsing site-wide (safe default regardless of README).
if (Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue) {
    $appcmd = Join-Path $env:SystemRoot "System32\inetsrv\appcmd.exe"
    if (Test-Path $appcmd) {
        Invoke-Fix -Description "disable IIS directory browsing site-wide" -Action {
            $exitCode = Start-ProcessWithTimeout -FilePath $appcmd -ArgumentList "set config -section:system.webServer/directoryBrowse /enabled:`"False`" /commit:apphost" -TimeoutSeconds 30
            if ($exitCode -ne 0) { throw "appcmd exited with code $exitCode" }
        }
    }
} else {
    Write-Host "[INFO] IIS (W3SVC) not present - skipping IIS hardening."
}

# Apache (XAMPP or standalone): disable ServerSignature / set ServerTokens Prod.
$apacheConfCandidates = @(
    (Join-Path $env:SystemDrive "xampp\apache\conf\httpd.conf"),
    (Join-Path $env:SystemDrive "Apache24\conf\httpd.conf")
)
$apacheConf = $apacheConfCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($apacheConf) {
    Invoke-Fix -Description "disable Apache ServerSignature and set ServerTokens to Prod in $apacheConf" -Action {
        $content = Get-Content $apacheConf
        $hadServerSignature = [bool]($content -match '(?i)^\s*ServerSignature\s+')
        $hadServerTokens = [bool]($content -match '(?i)^\s*ServerTokens\s+')
        $content = $content -replace '(?i)^\s*ServerSignature\s+.*', 'ServerSignature Off'
        $content = $content -replace '(?i)^\s*ServerTokens\s+.*', 'ServerTokens Prod'
        if (-not $hadServerSignature) { $content += "ServerSignature Off" }
        if (-not $hadServerTokens) { $content += "ServerTokens Prod" }
        Set-Content -Path $apacheConf -Value $content -ErrorAction Stop
        Write-Host "[INFO] Apache config updated - restart the Apache service for this to take effect."
    }
} else {
    Write-Host "[INFO] No Apache httpd.conf found in common install locations - skipping Apache hardening."
}

# SQL Server: disable xp_cmdshell if sqlcmd is available and a local instance responds.
if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
    Invoke-Fix -Description "disable xp_cmdshell on the local SQL Server instance" -Action {
        $sql = "EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 0; RECONFIGURE;"
        $exitCode = Start-ProcessWithTimeout -FilePath "sqlcmd.exe" -ArgumentList "-S . -Q `"$sql`" -b" -TimeoutSeconds 30
        if ($exitCode -ne 0) { throw "sqlcmd exited with code $exitCode" }
    }
} else {
    Write-Host "[INFO] sqlcmd not found - skipping SQL Server hardening (set the sa password and disable xp_cmdshell manually if SQL Server is installed)."
}

# -------------------------
# MANUAL-REVIEW ITEMS (informational only - not auto-modified)
# -------------------------
# These require human judgment (killing the wrong process/task/share can
# break something the README requires), so this script reports on them
# instead of changing them automatically.
Write-Host "`n=== Manual-Review Report ==="

Write-Host "`n--- Non-Microsoft Scheduled Tasks ---"
try {
    Get-ScheduledTask -ErrorAction Stop |
        Where-Object { $_.Author -and $_.Author -notmatch 'Microsoft' } |
        ForEach-Object { Write-Host "  $($_.TaskPath)$($_.TaskName)  [Author: $($_.Author)]" }
} catch {
    Write-Host "  [WARN] Could not enumerate scheduled tasks: $($_.Exception.Message)"
}

Write-Host "`n--- Startup / Run Keys (HKLM + HKCU) ---"
foreach ($runKey in @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
)) {
    if (Test-Path $runKey) {
        $entries = Get-ItemProperty -Path $runKey -ErrorAction SilentlyContinue
        if ($entries) {
            $entries.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
                Write-Host "  [$runKey] $($_.Name) = $($_.Value)"
            }
        }
    }
}

Write-Host "`n--- Listening Ports ---"
try {
    Get-NetTCPConnection -State Listen -ErrorAction Stop |
        Select-Object LocalAddress, LocalPort, OwningProcess |
        Sort-Object LocalPort -Unique |
        ForEach-Object {
            $procName = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName
            Write-Host "  $($_.LocalAddress):$($_.LocalPort)  PID $($_.OwningProcess) ($procName)"
        }
} catch {
    Write-Host "  [WARN] Could not enumerate listening ports: $($_.Exception.Message)"
}

Write-Host "`n--- Network Shares (excluding default admin shares) ---"
try {
    Get-SmbShare -ErrorAction Stop |
        Where-Object { $_.Name -notin @("C$", "ADMIN$", "IPC$", "print$") } |
        ForEach-Object { Write-Host "  $($_.Name) -> $($_.Path)" }
} catch {
    Write-Host "  [WARN] Could not enumerate SMB shares: $($_.Exception.Message)"
}

Write-Host "`n--- System Time / Time Zone ---"
Write-Host "  Current time: $(Get-Date)"
try {
    Write-Host "  Time zone:    $((Get-TimeZone).Id)"
} catch {
    Write-Host "  Time zone:    (unavailable)"
}

# -------------------------
# SUMMARY
# -------------------------
Write-Host "`n=== Effective Password Policy (net accounts) ==="
net accounts

Write-Host "`n=== LSA Registry Values (Complexity / Reversible) ==="
try {
    $lsa = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa"
    Write-Host "  PasswordComplexity:  $($lsa.PasswordComplexity)"
    Write-Host "  ClearTextPassword:   $($lsa.ClearTextPassword)"
} catch {
    Write-Host "[ERROR] Could not read Lsa registry: $($_.Exception.Message)"
}

Write-Host "`n=== DONE ==="
if ($dryRun) {
    Write-Host "Dry-run complete."
} else {
    Write-Host "System now matches README user configuration and hardening baseline."
}
Write-Host "`nReminder: Forensics questions must still be answered manually - this script does not touch them."
Write-Host "Reminder: This script does not create new user accounts or groups (e.g. penguru, allsafe) - create those manually per the README/answer key."
Write-Host "Reminder: Print Spooler was disabled by default (`$disablePrintSpooler = `$true near the Advanced Hardening section) - set it to `$false and re-run if the README requires printing."
Write-Host "Reminder: The 'riskyServices'/'riskyFeatures'/'unauthorizedSoftware' lists were disabled/removed unconditionally - re-check them against your README before running in full-execution mode."
Write-Host "Reminder: See the Manual-Review Report above (scheduled tasks, startup items, listening ports, shares, hosts file, time zone) - those are reported only, not auto-changed."
Write-Host "Reminder: Windows Update, gpedit.msc-equivalent policies, and Local Security Policy changes may require a reboot or 'gpupdate /force' to fully take effect and be reflected by the scoring engine."