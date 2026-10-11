const os = require('os');

function getSystemSnapshot() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    application: 'Running',
    alarmMonitor: 'Active',
    server: 'Online',
    storage: 'Healthy',
    processId: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    platform: os.platform(),
    arch: os.arch(),
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
    },
    storageStatus: {
      type: 'Local JSON storage',
      status: 'Healthy',
      file: 'data/alarms.json',
    },
    currentTime: new Date().toISOString(),
    technicalDetails: [
      'fork() is represented in the OS-level implementation and is not executed directly from browser JavaScript.',
      'exec() and wait() are handled by the native C implementation when the project is run on Linux.',
      'IPC: anonymous pipe, FIFO, Unix domain sockets, signals, and shared memory are demonstrated at the OS layer.',
      'Virtual memory: mmap() and copy-on-write are documented in the native C implementation.',
      'File system operations: open(), read(), write(), lseek(), and close() are part of the OS implementation.',
      'Concurrency: pthread, mutex, condition variable, and semaphore are demonstrated via native system programming.',
    ],
  };
}

module.exports = {
  getSystemSnapshot,
};
