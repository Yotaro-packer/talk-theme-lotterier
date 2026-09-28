import { execSync } from 'child_process';

const PORT = process.env.PORT || 3001;

function killWindows(port) {
  let out;
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
  } catch {
    return false;
  }
  const pids = new Set();
  for (const line of out.split('\n')) {
    const match = line.trim().match(/LISTENING\s+(\d+)\s*$/);
    if (match) pids.add(match[1]);
  }
  if (pids.size === 0) return false;
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`);
      console.log(`stopped process ${pid} (port ${port})`);
    } catch (err) {
      console.error(`failed to stop pid ${pid}: ${err.message}`);
    }
  }
  return true;
}

function killPosix(port) {
  let out;
  try {
    out = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' });
  } catch {
    return false;
  }
  const pids = out.split('\n').map((s) => s.trim()).filter(Boolean);
  if (pids.length === 0) return false;
  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`);
      console.log(`stopped process ${pid} (port ${port})`);
    } catch (err) {
      console.error(`failed to stop pid ${pid}: ${err.message}`);
    }
  }
  return true;
}

const stopped = process.platform === 'win32' ? killWindows(PORT) : killPosix(PORT);
if (!stopped) {
  console.log(`no process found listening on port ${PORT}`);
}
