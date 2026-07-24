import fs from 'node:fs';

const target = 'src/components/GlobalAiWebsiteLauncher.jsx';
const styleTarget = 'src/components/GlobalAiWebsiteLauncher.css';

if (!fs.existsSync(target)) {
  throw new Error(`Missing AI workspace source: ${target}`);
}
if (!fs.existsSync(styleTarget)) {
  throw new Error(`Missing AI workspace stylesheet: ${styleTarget}`);
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

const cleanLayer = `      className={\`brian-ai-workspace-layer \${expanded ? 'is-expanded' : ''}\`}
      role="presentation"
`;
const legacyHiddenLayer = `      className={\`brian-ai-workspace-layer \${expanded ? 'is-expanded' : ''}\`}
      style={open ? undefined : { display: 'none' }}
      aria-hidden={!open}
      role="presentation"
`;
const persistentHiddenLayer = `      className={\`brian-ai-workspace-layer \${expanded ? 'is-expanded' : ''} \${!open ? 'is-closed' : ''}\`}
      aria-hidden={!open}
      role="presentation"
`;

if (source.includes(legacyHiddenLayer)) {
  source = source.replace(legacyHiddenLayer, persistentHiddenLayer);
} else {
  replaceOnce(cleanLayer, persistentHiddenLayer, 'hidden persistent layer');
}

fs.writeFileSync(target, source);

let styles = fs.readFileSync(styleTarget, 'utf8');
const closedRule = `
/* Keep the embedded AI iframe alive while the panel is visually hidden. */
.brian-ai-workspace-layer.is-closed {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`;
if (!styles.includes('.brian-ai-workspace-layer.is-closed')) {
  styles += closedRule;
  fs.writeFileSync(styleTarget, styles);
}

console.log('AI workspace session persistence patch applied.');
