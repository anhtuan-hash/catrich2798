import React, { useState } from 'react';
import { StudentList, Student } from '../../types';
import { X, Plus, Trash2, UserX, UserCheck, Upload } from 'lucide-react';

interface StudentListModalProps {
  isOpen: boolean;
  studentLists: StudentList[];
  activeList: StudentList | null;
  onClose: () => void;
  onSaveList: (list: StudentList) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
  onToggleAbsent: (listId: string, studentId: string) => Promise<void>;
}

export const StudentListModal: React.FC<StudentListModalProps> = ({
  isOpen,
  studentLists,
  activeList,
  onClose,
  onSaveList,
  onDeleteList,
  onToggleAbsent,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [newListName, setNewListName] = useState('');

  if (!isOpen) return null;

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const now = Date.now();
    const newList: StudentList = {
      id: `list_${now}`,
      name: newListName,
      students: [],
      createdAt: now,
      updatedAt: now,
    };
    await onSaveList(newList);
    setNewListName('');
  };

  const handleAddStudentsFromText = async () => {
    if (!activeList || !pasteText.trim()) return;
    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newStudents: Student[] = lines.map((name, idx) => ({
      id: `std_${Date.now()}_${idx}`,
      displayName: name,
      absent: false,
    }));

    const updatedList = {
      ...activeList,
      students: [...activeList.students, ...newStudents],
      updatedAt: Date.now(),
    };

    await onSaveList(updatedList);
    setPasteText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
            Quản Lý Danh Sách Học Sinh
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
          {/* Left Column: Lists */}
          <div className="border-r border-slate-200 dark:border-slate-800 pr-3 space-y-3">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Tên lớp mới..."
                className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200"
              />
              <button
                onClick={handleCreateList}
                className="p-1.5 bg-blue-600 text-white rounded-lg font-bold shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[300px]">
              {studentLists.map((list) => (
                <div
                  key={list.id}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer ${
                    activeList?.id === list.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="text-[10px] opacity-75">({list.students.length})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Students in list & Quick paste */}
          <div className="col-span-2 flex flex-col space-y-3 overflow-hidden">
            {activeList ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                    Sĩ số: {activeList.students.length} học sinh
                  </span>
                </div>

                <div className="flex-1 border rounded-xl p-2 overflow-y-auto space-y-1">
                  {activeList.students.map((std, idx) => (
                    <div
                      key={std.id}
                      className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                        <span className={std.absent ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                          {std.displayName}
                        </span>
                      </div>
                      <button
                        onClick={() => onToggleAbsent(activeList.id, std.id)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          std.absent
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {std.absent ? 'Vắng mặt' : 'Có mặt'}
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Dán danh sách tên học sinh (mỗi tên 1 dòng)..."
                    className="w-full h-16 p-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleAddStudentsFromText}
                    className="mt-1 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Thêm Học Sinh
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center my-auto">Chọn một lớp học để chỉnh sửa</div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
