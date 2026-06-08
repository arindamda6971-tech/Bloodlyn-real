const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/anike/Pictures/original-partner-main/healthswift-mobile-design/src/__tests__';

fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).forEach(file => {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('import { render') || content.includes('render,')) {
    content = content.replace(/import\s+\{([^}]*?)render([^}]*?)\}\s+from\s+['"]@testing-library\/react['"];/g, (match, p1, p2) => {
      let others = [p1, p2].join('').split(',').map(s => s.trim()).filter(Boolean);
      if (others.length === 0) return `import { render } from '@/test-utils';`;
      return `import { ${others.join(', ')} } from '@testing-library/react';\nimport { render } from '@/test-utils';`;
    });
    fs.writeFileSync(p, content);
    console.log('Updated ' + file);
  }
});
