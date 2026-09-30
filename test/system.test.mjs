import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { which } from '../dist/system.js';

test('executable lookup skips directories and follows executable file symlinks', () => {
  const directory = mkdtempSync(join(tmpdir(), 'devps-which-'));
  const previousPath = process.env.PATH;
  try {
    mkdirSync(join(directory, 'fzf'));
    process.env.PATH = directory;
    assert.equal(which('fzf'), false);

    const target = join(directory, 'target');
    writeFileSync(target, '#!/bin/sh\nexit 0\n');
    chmodSync(target, 0o755);
    symlinkSync(target, join(directory, 'command'));
    assert.equal(which('command'), true);
  } finally {
    process.env.PATH = previousPath;
    rmSync(directory, { recursive: true, force: true });
  }
});
