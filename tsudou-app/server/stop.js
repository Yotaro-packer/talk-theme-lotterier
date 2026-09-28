import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pidFile = path.join(__dirname, '..', '.server.pid');

if (!fs.existsSync(pidFile)) {
  console.log('サーバーは起動していません');
  process.exit(0);
}

const pid = Number(fs.readFileSync(pidFile, 'utf8'));

try {
  process.kill(pid, 'SIGTERM');
  console.log(`サーバー (pid: ${pid}) を停止しました`);
} catch (err) {
  console.log('サーバーの停止に失敗しました（既に停止している可能性があります）');
}

// Windows は process.kill 経由のシグナルを送るとプロセスを強制終了するため、
// 対象プロセス側の SIGTERM ハンドラーは実行されない。停止側で pid ファイルを片付ける。
if (fs.existsSync(pidFile)) {
  fs.unlinkSync(pidFile);
}
