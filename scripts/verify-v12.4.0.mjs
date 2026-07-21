import fs from 'node:fs';
const files = [
  'src/pages/Library.jsx',
  'src/pages/ResourceLibrary.jsx',
  'src/pages/KnowledgeHub.jsx',
  'src/pages/Resources.jsx',
  'src/ui-core/styles/ui-core.css',
  'src/ui-core/layouts/routeLayout.js',
  'src/config/version.js',
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const source = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const css = source['src/ui-core/styles/ui-core.css'];
const assertions = [
  ['Teacher Library contract', source[files[0]].includes('data-library-app="teacher-library"')],
  ['Resource Library contract', source[files[1]].includes('data-library-app="resource-library"')],
  ['Knowledge Hub contract', source[files[2]].includes('data-library-app="knowledge-hub"')],
  ['Resources Hub contract', source[files[3]].includes('data-library-app="resources-hub"')],
  ['Shared library root styling', css.includes('.bui-library {')],
  ['Shared library header styling', css.includes('.bui-library-header')],
  ['Shared library metrics styling', css.includes('.bui-library-metrics')],
  ['Shared library toolbar styling', css.includes('.bui-library-toolbar')],
  ['Shared library navigation styling', css.includes('.bui-library-navigation')],
  ['Shared library content styling', css.includes('.bui-library-content')],
  ['Horizontal textarea safeguard', css.includes('writing-mode: horizontal-tb !important')],
  ['Responsive library layout', css.includes('@media (max-width: 1080px)')],
  ['Library route contract', source[files[5]].includes("['library', 'library']") && source[files[5]].includes("['resource-library', 'library']")],
  ['Version registry', source[files[6]].includes("12.4.0")],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.4.0 unified library UI verification PASS (${passed}/${assertions.length})`);
