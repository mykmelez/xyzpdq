#!/usr/bin/env node

const glob = require("glob");
const pify = require("pify");
const spawnSync = require('child_process').spawnSync;

function runTest(executable, args) {
  const times = [];
  let start = [];

  for (let i = 0; i < 10; i++) {
    start = process.hrtime();
    spawnSync(executable, args, { stdio: 'inherit' });
    times.push(process.hrtime(start));
  }

  return times;
}

const runtimes = [
  { name: 'node', executable: 'node', args: [] },
  { name: 'xpcshell', executable: process.env.XPCSHELL, args: [] },
  { name: 'domshell', executable: process.env.XPCSHELL, args: ['domshell.js'] },
];

pify(glob)('test-*.js')
.then(files => {
  let results = '';

  for (const file of files) {
    results += `${file}:\n`;
    for (const runtime of runtimes) {
      const args = runtime.args.slice();
      args.push(file);

      // Run test and get results, which are in the time pair format
      // returned by process.hrtime().
      const timePairs = runTest(runtime.executable, args);

      // Map time pairs ([seconds, nanoseconds]) to a set of single values
      // representing time in milliseconds, then reduce them to their mean.
      const times = timePairs.map(([a, b]) => (a * 1e9 + b) / 1e6);
      const mean = times.reduce((a, b) => (a + b)) / times.length;

      results += `${runtime.name}: ${mean} (${times.join(',')})\n`;
    }
  }

  console.log(results);
})
.catch(error => {
  console.error(error);
});
