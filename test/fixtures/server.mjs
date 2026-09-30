import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const port = Number(process.argv[2]);
const child = spawn(process.execPath, ['-e', 'require("node:http").createServer((_, response) => response.end("child")).listen(Number(process.argv[1]))', String(port + 1)], { stdio: 'ignore' });
console.log(child.pid);
createServer((_, response) => response.end('runner')).listen(port);
