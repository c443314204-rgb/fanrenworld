# 重新生成单文件版：右键「使用 PowerShell 运行」
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Get-Command node -ErrorAction SilentlyContinue) {
  node "src\build.js"
} else {
  Write-Host "没找到 node。请安装 Node.js 18+，或直接双击已生成的 凡人修仙传-斗法.html"
}
Read-Host "按回车关闭"
