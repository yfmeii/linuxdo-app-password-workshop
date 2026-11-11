import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { getBuildInfo, git } from './build-info.mjs';

const expectedNode = (await readFile('.node-version', 'utf8')).trim();
if (process.versions.node !== expectedNode) throw new Error(`Release requires Node ${expectedNode}`);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const expectedNpm = pkg.packageManager.replace(/^npm@/, '');
if (execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim() !== expectedNpm) throw new Error(`Release requires npm ${expectedNpm}`);
const before = await getBuildInfo();
if (before.dirty) throw new Error('Release requires a clean committed source tree');
const tag = `v${before.version}`;
if (git('rev-parse', `${tag}^{commit}`) !== before.commit) throw new Error('Release tag must point to HEAD');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== tag) throw new Error('GitHub tag/version mismatch');
execFileSync('npm', ['run', 'package'], { stdio: 'inherit' });
if (JSON.stringify(before) !== JSON.stringify(await getBuildInfo())) throw new Error('Source changed during release build');
