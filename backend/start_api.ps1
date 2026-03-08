$HostAddress = if ($env:LUNAR_API_HOST) { $env:LUNAR_API_HOST } else { "127.0.0.1" }
$Port = if ($env:LUNAR_API_PORT) { $env:LUNAR_API_PORT } else { "8000" }
$Workers = if ($env:LUNAR_API_WORKERS) { $env:LUNAR_API_WORKERS } else { "1" }
$LogLevel = if ($env:LUNAR_LOG_LEVEL) { $env:LUNAR_LOG_LEVEL.ToLower() } else { "info" }

python -m uvicorn app.main:app `
  --host $HostAddress `
  --port $Port `
  --workers $Workers `
  --proxy-headers `
  --forwarded-allow-ips "127.0.0.1" `
  --log-level $LogLevel
