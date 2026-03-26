import { execSync } from 'child_process';
import prompts from 'prompts';
import { parseArgs } from 'util';

const TARGET_BASE = '/Users/SteffenPlunder/Documents/Workspace/internal/eht';
const PAGES_REPO = '/Users/SteffenPlunder/Documents/Workspace/internal';

interface DeployOptions {
  source: 'current' | 'tag' | 'commit';
  ref?: string;
  target: string;
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
    execSync(`mkdir -p "${targetDir}"`, { stdio: 'inherit' });

    // Clean up only specific build artifacts (preserving subdirectories like alpha/, beta/, v*/)
    execSync(`rm -f "${targetDir}"/index.html`, { stdio: 'inherit' });
    execSync(`rm -rf "${targetDir}"/assets`, { stdio: 'inherit' });
    execSync(`rm -rf "${targetDir}"/presets`, { stdio: 'inherit' });

    execSync(`cp -r dist/* "${targetDir}"/`, { stdio: 'inherit' });

    // Return to original state
    if (options.source !== 'current') {
      execSync(`git checkout ${originalBranch || originalCommit}`, { stdio: 'inherit' });
      try { execSync('git stash pop', { stdio: 'inherit' }); } catch {}
    }

    // Commit to pages repo
    const sourceLabel = options.ref || 'HEAD';
    execSync(`cd "${PAGES_REPO}" && git add eht && git commit -m "Deploy EHT: ${sourceLabel} → ${options.target}" && git push origin main`, { stdio: 'inherit' });

    console.log('\n✓ Deployed successfully!');
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
      target: { type: 'string', default: 'primary' }
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
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Deploy ${sourceLabel} → ${options.target}?`,
    initial: false
  });

  if (confirmed) {
    await deploy(options);
  }
}

main().catch(console.error);
