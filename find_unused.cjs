const fs = require('fs');
const path = require('path');

function getAllFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const allFiles = getAllFiles(srcDir);

const components = getAllFiles(componentsDir).filter(f => !f.includes(path.join('components', 'ui')));

components.forEach(comp => {
  const name = path.basename(comp, '.tsx').replace('.ts', '');
  if (name === 'index') return;
  let count = 0;
  allFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    // Using a regex to match the exact word to avoid partial matches
    const regex = new RegExp(`\\b${name}\\b`);
    if (regex.test(content)) {
      count++;
    }
  });
  if (count <= 1) { // Appears only in its own definition file
    console.log(`Unused Component: ${name}`);
  }
});
