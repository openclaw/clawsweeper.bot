import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/clawsweeper-dispatch.yml', import.meta.url), 'utf8');
const endpoint = 'https://intake.example.test/github/target-dispatch';
const tokenEndpoint = 'https://oidc.example.test/token';

function dispatchScript(name) {
  const block = workflow.split(`      - name: ${name}\n`)[1]?.split('\n      - name: ')[0];
  const script = block?.split('\n        run: |\n')[1];
  assert.ok(script, `${name} script must exist`);
  return script.replace(/^ {10}/gm, '');
}

function dispatch(name, { httpStatus = '202', transportExit = '0', tokenResponse = '{"value":"synthetic-oidc"}', tokenExit = '0', credentials = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dispatch-oidc-'));
  try {
    const log = join(root, 'requests.jsonl');
    const curl = join(root, 'curl');
    // Shadow curl completely: these workflow scripts must never reach the network.
    writeFileSync(curl, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.REQUEST_LOG, JSON.stringify(args) + '\\n');
if (args.includes('--get')) {
  process.stdout.write(process.env.TOKEN_RESPONSE);
  process.exit(Number(process.env.TOKEN_EXIT));
}
fs.writeFileSync(args[args.indexOf('--output') + 1], '{"queued":true}');
process.stdout.write(process.env.HTTP_STATUS);
process.exit(Number(process.env.TRANSPORT_EXIT));
`);
    chmodSync(curl, 0o755);
    const eventPath = join(root, 'event.json');
    writeFileSync(eventPath, JSON.stringify({
      pull_request: {
        title: 'Synthetic change', body: null, locked: false, labels: [],
        head: { sha: 'a'.repeat(40) }, base: { sha: 'b'.repeat(40) },
        updated_at: '2026-10-19T00:00:00Z', draft: false,
      },
    }));
    const result = spawnSync('bash', ['-e', '-c', dispatchScript(name)], {
      encoding: 'utf8', timeout: 10000,
      env: {
        PATH: `${root}:${process.env.PATH}`,
        REQUEST_LOG: log, HTTP_STATUS: httpStatus, TRANSPORT_EXIT: transportExit,
        TOKEN_RESPONSE: tokenResponse, TOKEN_EXIT: tokenExit,
        ...(credentials ? {
          ACTIONS_ID_TOKEN_REQUEST_URL: tokenEndpoint,
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'synthetic-request-token',
        } : {}),
        TARGET_REPO: 'example/project', TARGET_BRANCH: 'main',
        ITEM_NUMBER: '42', ITEM_KIND: 'pull_request', COMMENT_ID: '100',
        SOURCE_EVENT: 'pull_request_target', SOURCE_ACTION: 'edited',
        SUPERSEDES_IN_PROGRESS: 'true', TARGET_DISPATCH_URL: endpoint,
        GITHUB_EVENT_PATH: eventPath, RUNNER_TEMP: root,
      },
    });
    assert.ifError(result.error);
    const requests = readFileIfPresent(log).trim().split('\n').filter(Boolean).map(JSON.parse);
    return { ...result, requests };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function readFileIfPresent(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

for (const name of ['Dispatch ClawSweeper comment', 'Dispatch exact ClawSweeper review']) {
  test(`${name} authenticates and queues the source identity without App credentials`, () => {
    const result = dispatch(name);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Queued ClawSweeper intake directly/);
    assert.equal(result.requests.length, 2);
    const [tokenRequest, intakeRequest] = result.requests;
    assert.equal(tokenRequest.at(-1), tokenEndpoint);
    assert.ok(tokenRequest.includes(`audience=${endpoint}`));
    assert.ok(tokenRequest.includes('Authorization: bearer synthetic-request-token'));
    assert.equal(intakeRequest.at(-1), endpoint);
    assert.ok(intakeRequest.includes('authorization: Bearer synthetic-oidc'));
    const payload = JSON.parse(intakeRequest[intakeRequest.indexOf('--data') + 1]);
    assert.equal(payload.target_repo, 'example/project');
    assert.equal(payload.item_number, 42);
    assert.equal(payload.source_action, 'edited');
    if (name === 'Dispatch ClawSweeper comment') {
      assert.deepEqual(payload, {
        target_repo: 'example/project', item_number: 42, comment_id: 100,
        source_event: 'issue_comment', source_action: 'edited',
      });
    } else {
      assert.equal(payload.source_event, 'pull_request_target');
      assert.equal(payload.target_branch, 'main');
      assert.equal(payload.item_kind, 'pull_request');
      assert.equal(payload.supersedes_in_progress, true);
      assert.equal(payload.queue_claim.source_head_sha, 'a'.repeat(40));
      assert.equal(payload.queue_claim.source_base_sha, 'b'.repeat(40));
      assert.equal(payload.queue_claim.source_is_draft, false);
      assert.equal(payload.queue_claim.source_updated_at, '2026-10-19T00:00:00Z');
      assert.match(payload.queue_claim.source_content_revision, /^[a-f0-9]{64}$/);
      assert.equal(payload.ingress_route, 'target_dispatcher');
      assert.match(payload.ingress_fingerprint, /^[a-f0-9]{64}$/);
    }
  });

  test(`${name} leaves deliberate refusals to the independent webhook`, () => {
    const result = dispatch(name, { httpStatus: '403' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /intake declined this event \(HTTP 403\)/);
    assert.doesNotMatch(result.stdout, /Queued ClawSweeper intake directly/);
  });

  for (const httpStatus of ['408', '429', '500', '503']) {
    test(`${name} fails on HTTP ${httpStatus} so it can be rerun`, () => {
      const result = dispatch(name, { httpStatus });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout, /intake unavailable/);
    });
  }

  test(`${name} fails on transport errors`, () => {
    const result = dispatch(name, { httpStatus: '000', transportExit: '28' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /intake unavailable/);
  });

  for (const [scenario, options] of [
    ['missing credentials', { credentials: false }],
    ['token request failure', { tokenExit: '22' }],
    ['empty token', { tokenResponse: '{"value":""}' }],
    ['invalid token response', { tokenResponse: 'unavailable' }],
  ]) {
    test(`${name} fails without dispatching on ${scenario}`, () => {
      const result = dispatch(name, options);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout, /OIDC token unavailable/);
      assert.equal(result.requests.length, options.credentials === false ? 0 : 1);
    });
  }
}
