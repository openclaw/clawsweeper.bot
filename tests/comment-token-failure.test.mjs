import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/clawsweeper-dispatch.yml', import.meta.url), 'utf8');

function steps(source) {
  const marks = [];
  const pattern = /^ {6}- name: (.+)$/gm;
  for (const match of source.matchAll(pattern)) {
    marks.push({ name: match[1], index: match.index });
  }
  return marks.map((mark, index) => {
    const block = source.slice(mark.index, marks[index + 1]?.index ?? source.length);
    return {
      name: mark.name,
      block,
      continueOnError: /^ {8}continue-on-error:\s*true\s*$/m.test(block),
    };
  });
}

function namesRunAfterFailure(source, failedName) {
  const parsed = steps(source);
  const failedAt = parsed.findIndex((step) => step.name === failedName);
  assert.ok(failedAt >= 0, failedName);
  if (parsed[failedAt].continueOnError) return parsed.map((step) => step.name);
  return parsed.slice(0, failedAt + 1).map((step) => step.name);
}

function runScript(source) {
  const parsed = steps(source);
  const step = parsed.find((item) => item.name === 'Acknowledge and dispatch ClawSweeper comment');
  const match = step.block.match(/\n {8}run: \|\n([\s\S]*)$/);
  assert.ok(match, 'comment dispatch script must exist');
  return match[1].replace(/^ {10}/gm, '').replace(/\n*$/, '');
}

test('a failed target token still dispatches the comment command', () => {
  const ran = namesRunAfterFailure(workflow, 'Create target comment token');
  assert.ok(
    ran.includes('Acknowledge and dispatch ClawSweeper comment'),
    `skipped steps after token failure: ${ran.join(', ')}`,
  );

  const root = mkdtempSync(join(tmpdir(), 'comment-token-'));
  try {
    const log = join(root, 'gh.log');
    const gh = join(root, 'gh');
    writeFileSync(gh, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\nexit 0\n`);
    chmodSync(gh, 0o755);
    const result = spawnSync('bash', ['-e', '-c', runScript(workflow)], {
      encoding: 'utf8',
      env: {
        PATH: `${root}:${process.env.PATH}`,
        DISPATCH_TOKEN: 'dispatch-token',
        TARGET_TOKEN: '',
        TARGET_REPO: 'example/project',
        ITEM_NUMBER: '42',
        COMMENT_ID: '100',
        COMMENT_BODY: 'please /review',
        AUTHOR_ASSOCIATION: 'NONE',
        SOURCE_ACTION: 'created',
        RUNNER_TEMP: root,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(log, 'utf8'), /repos\/openclaw\/clawsweeper\/dispatches/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
