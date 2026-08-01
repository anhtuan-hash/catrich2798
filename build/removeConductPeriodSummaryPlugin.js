export default function removeConductPeriodSummaryPlugin() {
  return {
    name: 'brian-remove-conduct-period-summary',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (!cleanId.endsWith('/src/components/HomeroomConductTab.jsx')) return null;
      if (!code.includes('hr-conduct-period')) return code;

      return code.replace(
        /\s*<section className="hr-panel hr-conduct-period">[\s\S]*?<\/section>/,
        '',
      );
    },
  };
}
