# WhisperPlaud Setup Test Script
# Tests all components to verify the system is ready

Write-Host "=== WhisperPlaud Setup Test ===" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0

# Test 1: Docker Services
Write-Host "1. Checking Docker services..." -ForegroundColor Yellow
try {
    $redisStatus = docker ps --filter "name=whisperplaud-redis-1" --format "{{.Status}}"
    $minioStatus = docker ps --filter "name=whisperplaud-minio-1" --format "{{.Status}}"
    
    if ($redisStatus -like "*Up*") {
        Write-Host "   ✅ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis is not running" -ForegroundColor Red
        $ErrorCount++
    }
    
    if ($minioStatus -like "*Up*") {
        Write-Host "   ✅ MinIO is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MinIO is not running" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "   ❌ Docker is not available" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 2: Python Environment
Write-Host "2. Checking Python environment..." -ForegroundColor Yellow
$pythonPath = "C:\Users\user\Desktop\Git\WhisperPlaud\whisper-env\Scripts\python.exe"
if (Test-Path $pythonPath) {
    Write-Host "   ✅ Python virtual environment exists" -ForegroundColor Green
    
    # Check PyTorch
    $torchCheck = & $pythonPath -c "import torch; print(f'PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}')" 2>&1
    Write-Host "   $torchCheck" -ForegroundColor Gray
    
    # Check faster-whisper
    $whisperCheck = & $pythonPath -c "import faster_whisper; print('faster-whisper installed')" 2>&1
    if ($whisperCheck -like "*installed*") {
        Write-Host "   ✅ faster-whisper is installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ faster-whisper is not installed" -ForegroundColor Red
        $ErrorCount++
    }
} else {
    Write-Host "   ❌ Python virtual environment not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 3: Database
Write-Host "3. Checking database..." -ForegroundColor Yellow
$dbPath = "C:\Users\user\Desktop\Git\WhisperPlaud\medical-transcription\prisma\transcription.db"
if (Test-Path $dbPath) {
    Write-Host "   ✅ Database file exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database file not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 4: Environment Variables
Write-Host "4. Checking environment variables..." -ForegroundColor Yellow
$envPath = "C:\Users\user\Desktop\Git\WhisperPlaud\medical-transcription\.env.local"
if (Test-Path $envPath) {
    Write-Host "   ✅ .env.local exists" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "WHISPER_MODEL_SIZE") {
        Write-Host "   ✅ WHISPER_MODEL_SIZE is set" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  WHISPER_MODEL_SIZE not found" -ForegroundColor Yellow
    }
    
    if ($envContent -match "WHISPER_DEVICE") {
        Write-Host "   ✅ WHISPER_DEVICE is set" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  WHISPER_DEVICE not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ .env.local not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 5: Node.js Dependencies
Write-Host "5. Checking Node.js dependencies..." -ForegroundColor Yellow
Set-Location "C:\Users\user\Desktop\Git\WhisperPlaud\medical-transcription"
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ node_modules not found. Run: npm install" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 6: GPU (if available)
Write-Host "6. Checking GPU..." -ForegroundColor Yellow
try {
    $gpuInfo = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ GPU detected: $gpuInfo" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  nvidia-smi not available (CPU mode will be used)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  GPU not detected (CPU mode will be used)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "✅ All tests passed! System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start Next.js: npm run dev"
    Write-Host "  2. Start Python Worker: python src\workers\transcription_worker.py"
    Write-Host "  3. Open browser: http://localhost:3000/login"
} else {
    Write-Host "❌ $ErrorCount error(s) found. Please fix the issues above." -ForegroundColor Red
}

Write-Host ""

