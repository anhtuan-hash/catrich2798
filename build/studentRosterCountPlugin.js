export default function studentRosterCountPlugin() {
  return {
    name: 'brian-student-roster-count',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (!cleanId.endsWith('/src/components/homeroom/HomeroomCoreTabs.jsx')) return null;

      return code.replace(
        '<small>{(workspace.students || []).filter((item) => !isDeletedStudent(item)).length} hồ sơ · {(workspace.students || []).filter(isDeletedStudent).length} đã xóa</small><h2>Danh sách lớp</h2>',
        '<small>{(workspace.students || []).filter((item) => item.active !== false && !isDeletedStudent(item)).length} học sinh đang học · {(workspace.students || []).filter((item) => item.active === false && !isDeletedStudent(item)).length} lưu trữ · {(workspace.students || []).filter(isDeletedStudent).length} đã xóa</small><h2>Danh sách lớp</h2>',
      );
    },
  };
}
