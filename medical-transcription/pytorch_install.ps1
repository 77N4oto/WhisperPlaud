Write-Host "Step 1: Uninstalling PyTorch (CUDA 11.8)..."
C:\Users\user\Desktop\Git\WhisperPlaud\whisper-env\Scripts\pip.exe uninstall -y torch torchvision torchaudio
Write-Host ""
Write-Host "Step 2: Installing PyTorch (CUDA 12.1)..."
C:\Users\user\Desktop\Git\WhisperPlaud\whisper-env\Scripts\pip.exe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
Write-Host ""
Write-Host "Step 3: Verifying installation..."
C:\Users\user\Desktop\Git\WhisperPlaud\whisper-env\Scripts\python.exe -c "import torch; print(f''PyTorch: {torch.__version__}''); print(f''CUDA available: {torch.cuda.is_available()}''); print(f''CUDA version: {torch.version.cuda}'')"
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
