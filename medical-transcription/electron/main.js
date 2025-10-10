const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let nextServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 開発モードではlocalhost:3000、プロダクションでは埋め込みサーバー
  const url = isDev ? 'http://localhost:3000' : 'http://localhost:3000';

  mainWindow.loadURL(url);

  // 開発モードではDevToolsを開く
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (!isDev) {
    // プロダクションモードではNext.jsサーバーを起動
    const nextPath = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    nextServer = spawn(nextPath, ['start'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: { ...process.env, PORT: '3000' }
    });

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js error: ${data}`);
    });
  }
}

app.whenReady().then(() => {
  startNextServer();
  
  // Next.jsサーバーが起動するまで少し待つ
  setTimeout(() => {
    createWindow();
  }, isDev ? 1000 : 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

