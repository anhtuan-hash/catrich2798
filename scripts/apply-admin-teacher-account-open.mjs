import { readFile, writeFile } from 'node:fs/promises';

const url = new URL('../src/components/BulkTeacherAccountsPanel.jsx', import.meta.url);
const source = await readFile(url, 'utf8');

if (source.includes("addEventListener('bes-open-teacher-account-manager'")) {
  console.log('Teacher account open listener already present.');
  process.exit(0);
}

const marker = `  useEffect(() => {\n    if (route !== 'admin') return undefined;`;
const insertion = `  useEffect(() => {\n    const onOpenManager = () => {\n      if (currentRoute() === 'admin') setOpen(true);\n    };\n    window.addEventListener('bes-open-teacher-account-manager', onOpenManager);\n    return () => window.removeEventListener('bes-open-teacher-account-manager', onOpenManager);\n  }, []);\n\n`;

if (!source.includes(marker)) {
  throw new Error('Could not find BulkTeacherAccountsPanel auth effect marker.');
}

await writeFile(url, source.replace(marker, `${insertion}${marker}`));
console.log('Inserted direct teacher-account open listener.');
