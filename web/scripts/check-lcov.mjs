import fs from 'node:fs';

const [, , lcovPath, thresholdArg, labelArg, fileFilterArg] = process.argv;
const threshold = Number(thresholdArg);
const label = labelArg || 'coverage';
const fileFilters = (fileFilterArg || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

if (!lcovPath || Number.isNaN(threshold)) {
  console.error('Usage: node scripts/check-lcov.mjs <lcovPath> <thresholdPercent> [label] [fileFilterCsv]');
  process.exit(2);
}

if (!fs.existsSync(lcovPath)) {
  console.error(`[${label}] LCOV file not found at ${lcovPath}`);
  process.exit(1);
}

const reportContent = fs.readFileSync(lcovPath, 'utf8');

if (lcovPath.toLowerCase().endsWith('.html')) {
  const lineMatch = reportContent.match(/<span class="strong">\s*([0-9.]+)%\s*<\/span>\s*<span class="quiet">\s*Lines\s*<\/span>/i);
  if (!lineMatch) {
    console.error(`[${label}] Could not parse line coverage from HTML report ${lcovPath}`);
    process.exit(1);
  }

  const percent = Number(lineMatch[1]);
  const rounded = Math.round(percent * 100) / 100;
  console.log(`[${label}] line coverage: ${rounded}%`);

  if (percent < threshold) {
    console.error(`[${label}] coverage gate failed. Required >= ${threshold}%.`);
    process.exit(1);
  }

  console.log(`[${label}] coverage gate passed (>= ${threshold}%).`);
  process.exit(0);
}

const lcovContent = reportContent;
const records = lcovContent.split('end_of_record');

let linesFound = 0;
let linesHit = 0;

for (const record of records) {
  const lines = record.split(/\r?\n/);
  const sourceFileLine = lines.find(line => line.startsWith('SF:'));
  if (!sourceFileLine) {
    continue;
  }

  const sourceFile = sourceFileLine.slice(3);
  if (fileFilters.length > 0 && !fileFilters.some(filter => sourceFile.includes(filter))) {
    continue;
  }

  for (const line of lines) {
    if (line.startsWith('LF:')) {
      linesFound += Number(line.slice(3));
    }
    if (line.startsWith('LH:')) {
      linesHit += Number(line.slice(3));
    }
  }
}

if (linesFound === 0) {
  console.error(`[${label}] No instrumented lines found in coverage report.`);
  process.exit(1);
}

const percent = (linesHit / linesFound) * 100;
const rounded = Math.round(percent * 100) / 100;

console.log(`[${label}] line coverage: ${linesHit}/${linesFound} (${rounded}%)`);

if (percent < threshold) {
  console.error(`[${label}] coverage gate failed. Required >= ${threshold}%.`);
  process.exit(1);
}

console.log(`[${label}] coverage gate passed (>= ${threshold}%).`);
