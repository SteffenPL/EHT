import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_REPO = path.resolve(process.env.EHT_PAGES_REPO ?? path.join(REPO_ROOT, '.deploy', 'internal'));
const PAGES_REMOTE = process.env.EHT_PAGES_REMOTE ?? 'https://github.com/SteffenPL/internal.git';
const TARGET_BASE = path.join(PAGES_REPO, 'eht');

interface DeployOptions {
  source: 'current' | 'tag' | 'commit';
  ref?: string;
  target: string;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function ensurePagesRepo(): void {
  const gitDir = path.join(PAGES_REPO, '.git');

  if (fs.existsSync(gitDir)) {
    execSync(`git -C ${shellQuote(PAGES_REPO)} fetch origin main`, { stdio: 'inherit' });
    execSync(`git -C ${shellQuote(PAGES_REPO)} pull --ff-only origin main`, { stdio: 'inherit' });
    return;
  }

  if (fs.existsSync(PAGES_REPO) && fs.readdirSync(PAGES_REPO).length > 0) {
    throw new Error(`${PAGES_REPO} exists but is not a git checkout. Set EHT_PAGES_REPO or remove the directory.`);
  }

  fs.mkdirSync(path.dirname(PAGES_REPO), { recursive: true });
  execSync(`git clone ${shellQuote(PAGES_REMOTE)} ${shellQuote(PAGES_REPO)}`, { stdio: 'inherit' });
}

function tagToVersionUrl(tag: string): string {
  return 'v' + tag.replace(/\./g, '-');
}

async function getTags(): Promise<{ name: string; date: string }[]> {
  const output = execSync('git tag -l --sort=-creatordate', { encoding: 'utf-8' });
  return output.trim().split('\n').filter(Boolean).map(tag => ({
    name: tag,
    date: execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf-8' }).trim()
  }));
}

async function selectInteractive(): Promise<DeployOptions> {
  const tags = await getTags();

  const sourceChoices = [
    { title: 'Current working directory', value: { source: 'current' } },
    ...tags.map(t => ({
      title: `Tag: ${t.name} (${t.date})`,
      value: { source: 'tag', ref: t.name }
    })),
    { title: 'Enter commit hash', value: { source: 'commit' } }
  ];

  const { sourceChoice } = await prompts({
    type: 'select',
    name: 'sourceChoice',
    message: 'Select source:',
    choices: sourceChoices
  });

  let ref = sourceChoice.ref;
  if (sourceChoice.source === 'commit') {
    const { commitHash } = await prompts({
      type: 'text',
      name: 'commitHash',
      message: 'Enter commit hash:'
    });
    ref = commitHash;
  }

  // Build target choices
  const targetChoices = [
    { title: 'Primary (/internal/eht/)', value: 'primary' },
    { title: 'Beta (/internal/eht/beta/)', value: 'beta' },
    { title: 'Alpha (/internal/eht/alpha/)', value: 'alpha' }
  ];

  // Add versioned target option if a tag was selected
  if (sourceChoice.source === 'tag' && ref) {
    const versionUrl = tagToVersionUrl(ref);
    targetChoices.push({
      title: `Version ${ref} (/internal/eht/${versionUrl}/)`,
      value: versionUrl
    });
  }

  const { target } = await prompts({
    type: 'select',
    name: 'target',
    message: 'Select target:',
    choices: targetChoices
  });

  return { source: sourceChoice.source, ref, target };
}

async function deploy(options: DeployOptions) {
  const originalBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  const originalCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

  try {
    ensurePagesRepo();

    // Checkout source if not current
    if (options.source !== 'current' && options.ref) {
      execSync('git stash --include-untracked', { stdio: 'inherit' });
      execSync(`git checkout ${options.ref}`, { stdio: 'inherit' });
    }

    // Set target directory and env
    const targetDir = options.target === 'primary'
      ? TARGET_BASE
      : `${TARGET_BASE}/${options.target}`;

    const env = { ...process.env };
    if (options.target !== 'primary') {
      env.VITE_BASE_SUBDIR = options.target;
    }

    // Build
    execSync('npm run build', { stdio: 'inherit', env });

    // Deploy
    execSync(`mkdir -p ${shellQuote(targetDir)}`, { stdio: 'inherit' });

    // Clean up only specific build artifacts (preserving subdirectories like alpha/, beta/, v*/)
    execSync(`rm -f ${shellQuote(path.join(targetDir, 'index.html'))}`, { stdio: 'inherit' });
    execSync(`rm -rf ${shellQuote(path.join(targetDir, 'assets'))}`, { stdio: 'inherit' });
    execSync(`rm -rf ${shellQuote(path.join(targetDir, 'presets'))}`, { stdio: 'inherit' });

    execSync(`cp -r dist/* ${shellQuote(targetDir)}/`, { stdio: 'inherit' });

    // Return to original state
    if (options.source !== 'current') {
      execSync(`git checkout ${originalBranch || originalCommit}`, { stdio: 'inherit' });
      try { execSync('git stash pop', { stdio: 'inherit' }); } catch {}
    }

    // Commit to pages repo
    const sourceLabel = options.ref || 'HEAD';
    execSync(`git -C ${shellQuote(PAGES_REPO)} add eht`, { stdio: 'inherit' });
    const status = execSync(`git -C ${shellQuote(PAGES_REPO)} status --porcelain eht`, { encoding: 'utf-8' }).trim();
    if (!status) {
      console.log(`\nNo pages changes for ${sourceLabel} -> ${options.target}.`);
      return;
    }
    execSync(`git -C ${shellQuote(PAGES_REPO)} commit -m ${shellQuote(`Deploy EHT: ${sourceLabel} -> ${options.target}`)}`, { stdio: 'inherit' });
    execSync(`git -C ${shellQuote(PAGES_REPO)} push origin main`, { stdio: 'inherit' });

    console.log('\nDeployed successfully!');
  } catch (error) {
    // Restore original state on error
    execSync(`git checkout ${originalBranch || originalCommit}`, { stdio: 'pipe' });
    try { execSync('git stash pop', { stdio: 'pipe' }); } catch {}
    throw error;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      tag: { type: 'string' },
      commit: { type: 'string' },
      current: { type: 'boolean' },
      target: { type: 'string', default: 'primary' },
      yes: { type: 'boolean', short: 'y' }
    }
  });

  let options: DeployOptions;

  if (values.tag) {
    options = { source: 'tag', ref: values.tag, target: values.target as any };
  } else if (values.commit) {
    options = { source: 'commit', ref: values.commit, target: values.target as any };
  } else if (values.current) {
    options = { source: 'current', target: values.target as any };
  } else {
    options = await selectInteractive();
  }

  // Confirm
  const sourceLabel = options.ref || 'current';
  const confirmed = values.yes || (await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Deploy ${sourceLabel} → ${options.target}?`,
    initial: false
  })).confirmed;

  if (confirmed) {
    await deploy(options);
  }
}

main().catch(console.error);
