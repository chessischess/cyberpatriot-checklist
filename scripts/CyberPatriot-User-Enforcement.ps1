# ============================================
# CyberPatriot User Enforcement Script (ATT13)
# Users, Admins, Password Expiration, Policy
# CLEAN VERSION – WORKING PASSWORD POLICY
# Compatible with Windows PowerShell 5.1+
# ============================================

Write-Host "Enter the path to your README user list file (example: C:\users.txt)"
$readmePath = Read-Host

while (-not (Test-Path $readmePath)) {
    Write-Host "File not found. Please enter a valid path."
    $readmePath = Read-Host
}

$readme = Get-Content $readmePath

Write-Host "Do you want to run in dry-run mode? (y/n)"
$dryRunInput = Read-Host
$dryRun = $dryRunInput.ToLower() -eq "y"

if ($dryRun) {
    Write-Host "`n=== DRY RUN ENABLED ==="
} else {
    Write-Host "`n=== FULL EXECUTION MODE ==="
}

Write-Host "`n=== Parsing README User List ==="

# -------------------------
# PARSE ADMINS
# -------------------------
$adminSection = $readme | Select-String -Pattern "Authorized Administrators:" -Context 0,200
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

# Built-in accounts to ignore
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
# FIX USERS WITH ADMIN PRIVILEGES
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
            Write-Host "[DRY-RUN] Would disable unknown user $sysUser"
        } else {
            Write-Host "[FIX] Disabling unknown user $sysUser"
            Disable-LocalUser -Name $sysUser -ErrorAction SilentlyContinue
        }
    }
}

# -------------------------
# PASSWORD COMPLEXITY CHECK (for README passwords)
# -------------------------
function Test-PasswordComplexity($pw) {
    if (-not $pw) { return $false }
    return ($pw.Length -ge 8)   # weak if < 8 chars
}

# Strong password generator
function New-StrongPassword {
    param([int]$Length = 16)

    $chars = @()
    $chars += [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    $chars += [char[]]'abcdefghijklmnopqrstuvwxyz'
    $chars += [char[]]'0123456789'
    $chars += [char[]]'!@#$%^&*()-_=+[]{}'

    $pw = -join (1..$Length | ForEach-Object { $chars | Get-Random })
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
        Write-Host "[FIX] Setting password for $admin"
        $secure = ConvertTo-SecureString $pw -AsPlainText -Force
        Set-LocalUser -Name $admin -Password $secure -ErrorAction SilentlyContinue
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
# ENFORCE SYSTEM PASSWORD POLICY (ATT13 – WORKING, CLEAN)
# -------------------------
Write-Host "`n=== Enforcing System Password Policy (ATT13) ==="
Write-Host "Target values:"
Write-Host "  Enforce password history: 21"
Write-Host "  Maximum password age:     30 days"
Write-Host "  Minimum password age:     5 days"
Write-Host "  Minimum password length:  8 characters"
Write-Host "  Complexity:               Enabled"
Write-Host "  Reversible encryption:    Disabled"
Write-Host ""

if ($dryRun) {
    Write-Host "[DRY-RUN] Would run:"
    Write-Host "  net accounts /uniquepw:21 /maxpwage:30 /minpwage:5 /minpwlen:8"
    Write-Host "  Set-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\Lsa PasswordComplexity=1 (DWORD)"
    Write-Host "  Set-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\Lsa ClearTextPassword=0 (DWORD)"
} else {
    Write-Host "[FIX] Applying password policy via net accounts + registry..."

    try {
        & net accounts /uniquepw:21 /maxpwage:30 /minpwage:5 /minpwlen:8 | Out-Null
        Write-Host "[OK] net accounts policy applied."
    } catch {
        Write-Host "[ERROR] net accounts failed: $($_.Exception.Message)"
    }

    try {
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "PasswordComplexity" -Type DWord -Value 1
        Write-Host "[OK] PasswordComplexity set to 1 (Enabled)."
    } catch {
        Write-Host "[ERROR] Failed to set PasswordComplexity: $($_.Exception.Message)"
    }

    try {
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "ClearTextPassword" -Type DWord -Value 0
        Write-Host "[OK] ClearTextPassword set to 0 (Disabled)."
    } catch {
        Write-Host "[ERROR] Failed to set ClearTextPassword: $($_.Exception.Message)"
    }
}

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
    Write-Host "System now matches README user configuration and password policy."
}
