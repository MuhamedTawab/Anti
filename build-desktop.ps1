# Nightlink Desktop Build Helper
# This script helps you build the Windows installer (.exe) for Nightlink.

Write-Host "--- Nightlink Desktop Builder ---" -ForegroundColor Cyan

# 1. Check for Rust
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Rust/Cargo not found. Please install it from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# 2. Check for NodeJS
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: NodeJS/NPM not found." -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..."
npm install

Write-Host "Building Nightlink Web..."
npm run build

Write-Host "Building Nightlink Desktop App..."
npx tauri build

Write-Host "--------------------------------" -ForegroundColor Green
Write-Host "Done! Your installer is located in: src-tauri\target\release\bundle\msi\" -ForegroundColor Green
