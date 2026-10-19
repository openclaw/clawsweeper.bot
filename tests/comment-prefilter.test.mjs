import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/clawsweeper-dispatch.yml', import.meta.url), 'utf8');

function prefilterScript(source) {
  const match = source.match(/- name: Pre-filter ClawSweeper comment[\s\S]*?\n {8}run: \|\n([\s\S]*?)\n {6}- name:/);
  assert.ok(match, 'prefilter step must exist');
  return match[1].replace(/^ {10}/gm, '');
}

function classify(body) {
  const root = mkdtempSync(join(tmpdir(), 'comment-prefilter-'));
  const output = join(root, 'github-output');
  try {
    writeFileSync(output, '');
    const result = spawnSync('bash', ['-e', '-c', prefilterScript(workflow)], {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        COMMENT_BODY: body,
        GITHUB_OUTPUT: output,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(output, 'utf8').trim();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const accepted = [
  '@clawsweeper',
  '@openclaw-clawsweeper[bot]',
  '/clawsweeper',
  '/clawsweeper re-review',
  '/review',
  '/automerge',
  '/auto merge',
  '/auto-merge',
  '/autoclose',
  '/re-review',
  '/rerun review',
  '/rerun-review',
  '/stop',
  '/explain',
  '/fix',
  '/status',
  '/approve',
  '/build',
  '/implement',
  '/create pr',
  '/create-pr',
  '/fix issue',
  '/fix-issue',
  '/autofix',
  '/auto fix',
  '/auto-fix',
];

for (const command of accepted) {
  test(`${command} is admitted by the prefilter`, () => {
    assert.equal(classify(`please ${command}\n`), 'is_command=true');
  });
}

for (const command of ['/preview', '/stopwatch', '/reviewer', '/auto', '/create', '/rerun']) {
  test(`${command} is not queued`, () => {
    assert.equal(classify(`please ${command}\n`), 'is_command=false');
  });
}

test('an opt-in reminder that also contains a command does not route', () => {
  const body = [
    '<!-- clawsweeper-maintainer-opt-in:opened item=42 -->',
    'ClawSweeper reviews are opt-in for maintainers. If a review is required, finish the work and validation first, then comment `@clawsweeper review`.',
    '/review',
  ].join('\n');
  assert.equal(classify(body), 'is_command=false');
});

test('ordinary comments and lookalike words do not route', () => {
  assert.equal(classify('thanks for the patch\n'), 'is_command=false');
  assert.equal(classify('please /preview the page\n'), 'is_command=false');
  assert.equal(classify('please /stopwatch the build\n'), 'is_command=false');
});
