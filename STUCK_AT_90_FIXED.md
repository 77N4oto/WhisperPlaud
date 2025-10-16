# 90%停止問題の修正

**日時**: 2025-10-16 16:10  
**問題**: 文字起こしが90%で停止する

---

## 🔴 問題の症状

- ✅ 文字起こし処理は完了
- ✅ S3に結果が保存される（13,610バイト）
- ❌ **進捗が90%「Saving transcript...」で停止**
- ❌ 100%完了にならない

---

## 🔍 根本原因

### 発見した問題

1. **Workerが`.env.local`を読み込んでいなかった**
   - `load_dotenv()`がカレントディレクトリのみを探していた
   - 環境変数が設定されず、CPUモードで動作
   - → 修正済み

2. **進捗更新（90% → 100%）でハング**
   - 文字起こしは完了し、S3に保存される
   - しかし`update_job_progress(100, 'Completed')`でWorkerが停止
   - 原因は不明（Redisは正常、S3も正常）

---

## ✅ 実施した修正

### 修正1: 環境変数の読み込み

**`transcription_worker.py`**:
```python
# Load environment variables from project root
project_root = Path(__file__).parent.parent.parent
env_local_path = project_root / '.env.local'

if env_local_path.exists():
    load_dotenv(env_local_path)
    logger.info(f"Loaded environment from: {env_local_path}")
```

### 修正2: デバッグログの追加

**`transcription_worker.py`** (213-223行目):
```python
if not self.upload_to_s3(transcript_key, transcript_data):
    raise Exception("Failed to upload transcript")

logger.info(f"Transcript uploaded successfully to {transcript_key}")

# Complete
logger.info(f"Updating job to 100% completion...")
self.update_job_progress(job_id, 100, 'Completed', 'completed')
logger.info(f"Progress update sent to Redis")

logger.info(f"Job {job_id} completed successfully")
```

これにより、どこで停止しているか特定できます。

### 修正3: 手動でジョブを完了

90%で停止したジョブに対して：
1. S3にトランスクリプトが存在することを確認
2. データベースを手動で更新してジョブを完了

```javascript
await prisma.job.update({
  where: { id: job.id },
  data: {
    status: "completed",
    progress: 100,
    phase: "Completed",
    result: transcriptKey
  }
});
```

---

## 🎯 期待される動作（修正後）

### Worker起動時

```
INFO:__main__:Loaded environment from: C:\...\medical-transcription\.env.local
INFO:__main__:Transcription worker initialized
INFO:__main__:Whisper model: large-v3
```

### 文字起こし処理中

```
INFO:__main__:Loading audio from S3...
INFO:__main__:Starting Whisper transcription...
INFO:__main__:Initializing Whisper model: large-v3
INFO:whisper_processor:Device: cuda, Compute type: float16  ← GPU
INFO:__main__:Transcription complete. Applying medical corrections...
INFO:__main__:Transcript uploaded successfully to transcripts/xxx.json  ← 新しいログ
INFO:__main__:Updating job to 100% completion...  ← 新しいログ
INFO:__main__:Progress update sent to Redis  ← 新しいログ
INFO:__main__:Job xxx completed successfully
```

---

## 🐛 90%停止の可能性のある原因

### 調査済み（問題なし）

1. ✅ **Redis**: 正常に動作、PONG応答あり
2. ✅ **MinIO (S3)**: 正常に動作、ヘルスチェックOK
3. ✅ **S3へのアップロード**: 成功（13,610バイト保存確認）
4. ✅ **データベース**: 手動更新は成功

### 未解決の可能性

1. **Redis Pub/Subの遅延**
   - `redis_client.publish()`は即座に返るはず
   - しかし何らかの理由でブロックしている可能性

2. **Next.js側の処理**
   - Redis経由で受信した進捗をデータベースに書き込む
   - この処理が遅延またはエラーになっている可能性
   - しかしWorkerは応答を待っていないはず

3. **Pythonのログバッファリング**
   - `logger.info`が即座に出力されない
   - → 追加したログで確認可能

4. **GIL (Global Interpreter Lock)**
   - Whisperの処理が重すぎてメインスレッドがブロック
   - → デバッグログで確認可能

---

## 🧪 次のテスト手順

### 1. Workerログを確認

新しく開いたPowerShellウィンドウで以下を確認：
```
INFO:__main__:Loaded environment from: ...\.env.local  ← 必須
INFO:__main__:Whisper model: large-v3
```

### 2. ブラウザをリフレッシュ

```
http://localhost:3000/dashboard
```

**期待される結果**:
- `001-sibutomo.mp3`のステータスが「完了」（緑）
- 右パネルに文字起こしテキストが表示

### 3. 新しいファイルでテスト

- 小さいファイル（1-2分）をアップロード
- Workerログで新しいデバッグメッセージを確認：
  ```
  INFO:__main__:Transcript uploaded successfully to ...
  INFO:__main__:Updating job to 100% completion...
  INFO:__main__:Progress update sent to Redis
  INFO:__main__:Job xxx completed successfully
  ```

### 4. 90%で停止した場合

**確認すべきログ**:
- 「Transcript uploaded successfully」が表示される → S3保存は成功
- 「Updating job to 100% completion...」が表示される → 100%更新開始
- 「Progress update sent to Redis」が**表示されない** → Redis publishでハング

---

## 🔧 さらなる対策（必要な場合）

### 対策1: Redis publishをタイムアウト付きにする

```python
def update_job_progress(self, job_id: str, progress: int, phase: str, status: str = 'processing'):
    try:
        message = json.dumps({...})
        # タイムアウトを設定
        self.redis_client.execute_command('PUBLISH', 'job:progress', message)
        logger.info(f"[Job {job_id}] {progress}% - {phase}")
    except Exception as e:
        logger.error(f"Failed to update job progress: {e}")
        # 失敗しても処理を継続
```

### 対策2: 非同期処理に変更

進捗更新を別スレッドで実行：
```python
import threading

def update_job_progress_async(self, ...):
    thread = threading.Thread(target=self.update_job_progress, args=(...))
    thread.daemon = True
    thread.start()
```

### 対策3: 100%更新を削除

Workerは90%までで終了し、Next.js側で完了を検出：
```python
# 100%更新をスキップ
# self.update_job_progress(job_id, 100, 'Completed', 'completed')
logger.info(f"Job {job_id} completed (not updating to 100%)")
```

---

## 📊 性能（確認済み）

### GPU動作確認

```powershell
nvidia-smi
# GPU Memory Usage: 4632MiB / 12288MiB
# GPU-Util: 34%
```

✅ GPUは正常に使用されている

### 処理速度

- ファイル: `001-sibutomo.mp3` (374.8 KB)
- 処理時間: 約3分（90%まで）
- 内訳:
  - 音声読み込み: 数秒
  - 文字起こし: 2-3分
  - 保存: 即座（S3確認済み）
  - **90% → 100%**: ハング（3分以上）

---

## 📁 修正したファイル

- ✅ `medical-transcription/src/workers/transcription_worker.py`
  - 環境変数読み込みを修正
  - デバッグログを追加

---

## 📚 関連ドキュメント

- `ENV_LOADING_FIX.md` - 環境変数読み込み問題の詳細
- `CUDA12_SETUP_COMPLETE.md` - CUDA 12.1セットアップ
- `READY_FOR_TESTING.md` - テスト準備完了ガイド

---

## 📝 まとめ

### 完了した作業

1. ✅ 環境変数読み込みを修正（`.env.local`を正しく読み込む）
2. ✅ デバッグログを追加（90% → 100%のどこで停止するか特定）
3. ✅ 停止したジョブを手動で完了（文字起こし結果は正常）

### 未解決

- ❌ **90% → 100%でWorkerがハングする根本原因**
- 追加したデバッグログで原因を特定する必要あり

### 次のアクション

1. ブラウザをリフレッシュして完了した文字起こしを確認
2. 新しいファイルでテストし、デバッグログを確認
3. 必要に応じてさらなる対策を実施

---

**更新日時**: 2025-10-16 16:10  
**ステータス**: 🔧 部分的に修正 - デバッグ継続中

