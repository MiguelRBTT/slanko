# Publica docs/wiki/*.md no GitHub Wiki (slanko.wiki.git).
# Pré-requisito: Wiki habilitada no repositório e pelo menos uma página criada uma vez
# (GitHub → Wiki → Create the first page), ou clone já existente.
#
# Uso (você executa; o script faz commit + push na wiki):
#   powershell -ExecutionPolicy Bypass -File .\scripts\publish-wiki.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$wikiSource = Join-Path $repoRoot "docs\wiki"
$wikiDir = Join-Path $repoRoot ".wiki-tmp"
$wikiRemote = "https://github.com/MiguelRBTT/slanko.wiki.git"

if (-not (Test-Path $wikiSource)) {
  throw "Pasta não encontrada: $wikiSource"
}

if (Test-Path $wikiDir) {
  Remove-Item -Recurse -Force $wikiDir
}

Write-Host "Clonando wiki..."
git clone $wikiRemote $wikiDir
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Clone falhou. Faça uma vez no navegador:"
  Write-Host "  1. https://github.com/MiguelRBTT/slanko/wiki"
  Write-Host "  2. Settings do repo → Features → Wikis (ligado)"
  Write-Host "  3. Create the first page (título Home) e salve"
  Write-Host "  4. Rode este script de novo"
  exit 1
}

Get-ChildItem -Path $wikiSource -File | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $wikiDir $_.Name) -Force
}

Push-Location $wikiDir
try {
  git add .
  $status = git status --porcelain
  if (-not $status) {
    Write-Host "Wiki já está atualizada. Nada a publicar."
    exit 0
  }

  git commit -m "docs: sync wiki pages from docs/wiki"
  git push origin HEAD
  Write-Host ""
  Write-Host "Wiki publicada: https://github.com/MiguelRBTT/slanko/wiki"
}
finally {
  Pop-Location
}
