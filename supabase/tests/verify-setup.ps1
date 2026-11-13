# Applies supabase/setup.sql to a THROWAWAY local Postgres (no Docker) and reports errors.
# Usage: powershell -File supabase\tests\verify-setup.ps1 [-Extra supabase\tests\x.sql ...]
param([string[]]$Extra = @())
$ErrorActionPreference = 'Continue'
$env:PGOPTIONS = '-c client_min_messages=warning'
$bin  = 'C:\Program Files\PostgreSQL\18\bin'
$dir  = "$env:TEMP\pgtest"
$port = 54329
$repo = Split-Path (Split-Path $PSScriptRoot)
$psql = { param($db, $args2) & "$bin\psql.exe" -h localhost -p $port -U postgres -w -d $db @args2 }

if (-not (Test-Path "$dir\PG_VERSION")) {
  & "$bin\initdb.exe" -D $dir -U postgres -A trust -E UTF8 --locale=C | Out-Null
}
& "$bin\pg_ctl.exe" status -D $dir *> $null
if ($LASTEXITCODE -ne 0) { & "$bin\pg_ctl.exe" start -D $dir -o "-p $port" -l "$dir\server.log" -w | Out-Null }

& $psql 'postgres' @('-qc', 'drop database if exists store_test') | Out-Null
& $psql 'postgres' @('-qc', 'create database store_test') | Out-Null

# pg_cron / pg_net only exist on Supabase; the stubs provide the cron.* / net.* calls.
$sql = (Get-Content "$repo\supabase\setup.sql" -Raw) -replace '(?im)^\s*create extension if not exists (pg_cron|pg_net);\s*$', '-- (extension provided by Supabase)'
Set-Content "$dir\setup_for_test.sql" $sql -Encoding UTF8

& $psql 'store_test' @('-q', '-v', 'ON_ERROR_STOP=1', '-f', "$repo\supabase\tests\supabase_stubs.sql") 2>&1 | Out-String
Write-Output '=== applying setup.sql (single transaction) ==='
& $psql 'store_test' @('-q', '-1', '-v', 'ON_ERROR_STOP=1', '-f', "$dir\setup_for_test.sql") 2>&1 | Out-String
Write-Output "setup exit code: $LASTEXITCODE"
foreach ($f in $Extra) {
  Write-Output "=== $f ==="
  & $psql 'store_test' @('-q', '-v', 'ON_ERROR_STOP=1', '-f', "$repo\$f") 2>&1 | Out-String
  Write-Output "exit code: $LASTEXITCODE"
}
