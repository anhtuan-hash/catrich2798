import fs from 'node:fs';

const target = 'src/components/GlobalAiWebsiteLauncher.jsx';

if (!fs.existsSync(target)) {
  throw new Error(`Missing AI workspace source: ${target}`);
}

let source = fs.readFileSync(target, 'utf8');

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    throw new Error(`Unable to apply AI workspace persistence patch: ${label}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "  const [open, setOpen] = useState(false);\n",
  "  const [open, setOpen] = useState(false);\n  const [hasOpened, setHasOpened] = useState(false);\n",
  'persistent mount state',
);

replaceOnce(
`  const openWorkspace = async () => {
    if (open) {
      setOpen(false);
      setManageMode(false);
      setExpanded(false);
      return;
    }
    setOpen(true);
    setManageMode(false);
    await refreshCloud();
  };
`,
`  const openWorkspace = () => {
    if (open) {
      setOpen(false);
      setManageMode(false);
      setExpanded(false);
      return;
    }
    setHasOpened(true);
    setOpen(true);
    setManageMode(false);
  };
`,
  'non-refreshing reopen handler',
);

replaceOnce(
  '  const workspace = open ? createPortal(\n',
  '  const workspace = hasOpened ? createPortal(\n',
  'persistent portal mount',
);

replaceOnce(
`      className={\`brian-ai-workspace-layer \${expanded ? 'is-expanded' : ''}\`}
      role="presentation"
`,
`      className={\`brian-ai-workspace-layer \${expanded ? 'is-expanded' : ''}\`}
      style={open ? undefined : { display: 'none' }}
      aria-hidden={!open}
      role="presentation"
`,
  'hidden persistent layer',
);

fs.writeFileSync(target, source);
console.log('AI workspace session persistence patch applied.');
