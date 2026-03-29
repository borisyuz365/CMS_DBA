const { exec } = require('child_process');
const os = require('os');

const platform = os.platform();

function killProcesses() {
  console.log('Stopping development processes...\n');

  if (platform === 'win32') {
    // Windows - Kill node processes (but not system processes)
    const commands = [
      { cmd: 'taskkill /F /IM node.exe', name: 'Node.js processes' },
      { cmd: 'taskkill /F /IM npm.cmd', name: 'npm processes' },
      { cmd: 'taskkill /F /IM vite.exe', name: 'Vite processes' },
    ];

    let completed = 0;
    const total = commands.length;

    commands.forEach(({ cmd, name }) => {
      exec(cmd, (error, stdout, stderr) => {
        completed++;
        
        if (error) {
          // Error code 128 means no processes found, which is fine
          if (error.code === 128) {
            console.log(`✓ ${name}: No processes found (already stopped)`);
          } else {
            console.log(`✗ ${name}: ${error.message}`);
          }
        } else if (stdout) {
          console.log(`✓ ${name}: Stopped`);
          if (stdout.trim()) {
            console.log(stdout);
          }
        }
        
        if (completed === total) {
          console.log('\n✓ All development processes have been terminated.');
        }
      });
    });
  } else {
    // Unix-like systems (Linux, macOS)
    const commands = [
      { cmd: "pkill -f 'node.*server.js'", name: 'Backend server' },
      { cmd: "pkill -f 'vite'", name: 'Vite dev server' },
      { cmd: "pkill -f 'npm.*dev'", name: 'npm dev processes' },
    ];

    let completed = 0;
    const total = commands.length;

    commands.forEach(({ cmd, name }) => {
      exec(cmd, (error) => {
        completed++;
        
        if (error) {
          // Code 1 means no processes found, which is fine
          if (error.code === 1) {
            console.log(`✓ ${name}: No processes found (already stopped)`);
          } else {
            console.log(`✗ ${name}: ${error.message}`);
          }
        } else {
          console.log(`✓ ${name}: Stopped`);
        }
        
        if (completed === total) {
          console.log('\n✓ All development processes have been terminated.');
        }
      });
    });
  }
}

killProcesses();
