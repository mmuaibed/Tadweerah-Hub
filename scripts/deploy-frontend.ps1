$env:VITE_CLERK_PUBLISHABLE_KEY = (Select-String -Path artifacts/tadweerah/.env.production -Pattern "^VITE_CLERK_PUBLISHABLE_KEY=(.*)").Matches.Groups[1].Value
$env:VITE_TADWEERAH_ADMIN_EMAILS = (Select-String -Path artifacts/tadweerah/.env.production -Pattern "^VITE_TADWEERAH_ADMIN_EMAILS=(.*)").Matches.Groups[1].Value
$env:PORT = "5000"
$env:BASE_PATH = "/"

cmd.exe /c pnpm --filter @workspace/tadweerah build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed"
    exit $LASTEXITCODE
}

cmd.exe /c npx firebase deploy --only hosting --project tadweerah-staging
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed"
    exit $LASTEXITCODE
}

Remove-Item Env:VITE_CLERK_PUBLISHABLE_KEY
Remove-Item Env:VITE_TADWEERAH_ADMIN_EMAILS
Remove-Item Env:PORT
Remove-Item Env:BASE_PATH
