# Blaze Desktop Build Helper
# This script helps you build the Windows installer (.exe) for Blaze.

try {
    Write-Host "--- Blaze Desktop Builder ---" -ForegroundColor Cyan
    Write-Host "Verifying environment..."

    # 1. Check for Rust (with default path fallback)
    $cargoPath = Get-Command cargo -ErrorAction SilentlyContinue
    if (!$cargoPath) {
        $defaultCargo = "$HOME\.cargo\bin\cargo.exe"
        if (Test-Path $defaultCargo) {
            $env:Path += ";$HOME\.cargo\bin"
            Write-Host "Detected Rust in $HOME\.cargo\bin - Added to session Path." -ForegroundColor Yellow
        } else {
            Write-Host "Error: Rust/Cargo not found. Please install it from https://rustup.rs/" -ForegroundColor Red
            throw "Missing Rust"
        }
    }

    # 2. Check for NodeJS
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "Error: NodeJS/NPM not found." -ForegroundColor Red
        throw "Missing NodeJS"
    }

    Write-Host "Installing dependencies..."
    npm install

    Write-Host "Building Blaze Web..."
    npm run build

    Write-Host "Building Blaze Desktop App..."
    npx tauri build

    Write-Host "--------------------------------" -ForegroundColor Green
    Write-Host "Done! Your installer is located in: src-tauri\target\release\bundle\msi\" -ForegroundColor Green
}
catch {
    Write-Host "`n[!] Build Failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Make sure you have installed the C++ Build Tools for Windows (Visual Studio)." -ForegroundColor Gray
}
finally {
    Write-Host "`n--------------------------------"
    Read-Host "Press Enter to close this window..."
}
