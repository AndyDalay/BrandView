param([Parameter(Mandatory = $true)][string]$Mensaje)

$ErrorActionPreference = 'Stop'

$pasos = @(
    'Cambiar a diseno', 'Revisar cambios', 'Preparar archivos', 'Crear commit', 'Subir diseno',
    'Cambiar a dev', 'Actualizar dev', 'Unir diseno en dev', 'Subir dev',
    'Cambiar a produccion', 'Actualizar produccion', 'Unir dev en produccion', 'Subir produccion',
    'Volver a diseno'
)
$total = $pasos.Count
$actual = 0
$inicio = Get-Date

function EjecutarGit {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw "Falló: git $($args -join ' ')" }
}

function Avance([string]$nombre) {
    $script:actual++
    $pct = [int]([math]::Floor(($script:actual - 1) / $total * 100))
    $llenos = [int]([math]::Floor($pct / 5))
    $barra = ('#' * $llenos) + ('.' * (20 - $llenos))
    Write-Progress -Activity 'Publicando cambios' -Status "$($script:actual)/$total  $nombre" -PercentComplete $pct
    Write-Host ("[{0}] {1,3}%  {2}/{3}  {4}" -f $barra, $pct, $script:actual, $total, $nombre) -ForegroundColor Cyan
}

try {
    Avance $pasos[0];  EjecutarGit switch diseno
    Avance $pasos[1];  EjecutarGit status
    Avance $pasos[2];  EjecutarGit add -A

    Avance $pasos[3]
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        EjecutarGit commit -m $Mensaje
    } else {
        Write-Host '   Sin cambios nuevos: se omite el commit' -ForegroundColor Yellow
    }
    Avance $pasos[4];  EjecutarGit push origin diseno

    Avance $pasos[5];  EjecutarGit switch dev
    Avance $pasos[6];  EjecutarGit pull --no-rebase --no-edit origin dev
    Avance $pasos[7];  EjecutarGit merge --no-edit diseno
    Avance $pasos[8];  EjecutarGit push origin dev

    Avance $pasos[9];  EjecutarGit switch produccion
    Avance $pasos[10]; EjecutarGit pull --no-rebase --no-edit origin produccion
    Avance $pasos[11]; EjecutarGit merge --no-edit dev
    Avance $pasos[12]; EjecutarGit push origin produccion

    Avance $pasos[13]; EjecutarGit switch diseno

    Write-Progress -Activity 'Publicando cambios' -Completed
    $tiempo = [int]((Get-Date) - $inicio).TotalSeconds
    $hash = (git rev-parse --short HEAD).Trim()
    Write-Host ''
    Write-Host "[####################] 100%  OK" -ForegroundColor Green
    Write-Host "Publicado correctamente en diseno, dev y produccion." -ForegroundColor Green
    Write-Host "Commit: $hash  ·  Tiempo: ${tiempo}s" -ForegroundColor Green
}
catch {
    Write-Progress -Activity 'Publicando cambios' -Completed
    Write-Host ''
    Write-Host "[ERROR] Se detuvo en el paso $($actual)/${total}: $($pasos[$actual - 1])" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Revisa el mensaje de git de arriba, resuelve el problema y vuelve a ejecutar el script.' -ForegroundColor Yellow
    exit 1
}

###COMANDO:  powershell -ExecutionPolicy Bypass -File "C:\Users\andyy\Documents\WORK\WEB DESING\Workflow-DESIGN 2.0\GrandBrandView\grandbrandview\publicar.ps1" -Mensaje "Describe el cambio"