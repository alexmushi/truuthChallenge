const { spawn } = require('child_process');
const path = require('path');

function runPython(actionPayload) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../python/truuth_client.py');
    const proc = spawn('python3', [scriptPath], {
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || stdout || 'Python command failed'));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Invalid response from Python client'));
      }
    });

    proc.stdin.write(JSON.stringify(actionPayload));
    proc.stdin.end();
  });
}

module.exports = { runPython };
