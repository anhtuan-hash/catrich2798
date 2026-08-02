export default function studentBulkDeletePlugin() {
  return {
    name: 'brian-student-bulk-delete-pass-through',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (!cleanId.endsWith('/src/components/homeroom/HomeroomCoreTabs.jsx')) return null;
      return code;
    },
  };
}
