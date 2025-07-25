const fs = require('fs');

// check-unsupported-languages
const { execSync } = require('child_process');

const exts = ['js', 'ts', 'tsx', 'md', 'json', 'css', 'scss', 'html', 'yml', 'yaml', 'mdx'];
const output = execSync('git diff --cached --name-status', { encoding: 'utf8' });

// exclude deleted
const files = output
  .split('\n')
  .map(line => line.trim().split(/\s+/)) // ['A', 'filename']
  .filter(([status, filename]) =>
    filename &&
    status !== 'D' &&
    exts.some(ext => filename.endsWith('.' + ext))
  )
  .map(([_, filename]) => filename);

let hasError = false;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (/[^\x00-\x7F]/.test(content)) {
        console.error(`Unsupported language character found: ${file}`);
        hasError = true;
      }
    }
  } catch (err) {
    console.warn(`Warning: Cannot read file ${file}: ${err.message}`);
  }
});

if (hasError) {
  console.error('The file you are trying to commit contains characters from an unsupported language. The commit will be aborted.');
  process.exit(1);
}
