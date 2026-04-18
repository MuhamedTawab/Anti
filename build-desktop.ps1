# Nightlink Desktop Build Helper
# This script helps you build the Windows installer (.exe) for Nightlink.

try {
    Write-Host "--- Nightlink Desktop Builder ---" -ForegroundColor Cyan
    Write-Host "Verifying environment..."

    # 1. Check for Rust
    if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
        Write-Host "Error: Rust/Cargo not found. Please install it from https://rustup.rs/" -ForegroundColor Red
        throw "Missing Rust"
    }

    # 2. Check for NodeJS
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "Error: NodeJS/NPM not found." -ForegroundColor Red
        throw "Missing NodeJS"
    }

    Write-Host "Installing dependencies..."
    npm install

    Write-Host "Building Nightlink Web..."
    npm run build

    Write-Host "Building Nightlink Desktop App..."
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
