export async function resolve(specifier, context, nextResolve) {
  if (String(specifier).endsWith('.css')) {
    return {
      url: new URL(specifier, context.parentURL).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (String(url).endsWith('.css')) {
    return {
      format: 'module',
      source: 'export default {};',
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
