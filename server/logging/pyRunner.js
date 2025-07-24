const { spawn } = require('child_process');
const path = require('path');
const { log } = require('./simpleLogger');

module.exports = (prompt) => new Promise((resolve, reject) => {
  const py = spawn('python', [path.join(__dirname, '../npai.py'), prompt]);

  let stdout = '';
  const echo = (buf) => log.python(buf.toString().trim());

  py.stdout.on('data', (d) => { stdout += d.toString(); echo(d); });
  py.stderr.on('data', echo);

  py.on('close', (code) =>
    code === 0 ? resolve(stdout) : reject(new Error(`python exit ${code}`)));
});