export async function resolve(specifier, context, nextResolve) {
  if (String(specifier || '').endsWith('.css')) {
    return {
      url: new URL(specifier, context.parentURL || import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (String(url || '').endsWith('.css')) {
    return {
      format: 'module',
      source: 'export default {};\n',
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
