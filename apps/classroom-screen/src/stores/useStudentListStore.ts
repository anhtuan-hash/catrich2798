import { useState, useEffect } from 'react';
import { StudentList } from '../types';
import { getAllStudentLists, saveStudentList, deleteStudentListFromDB } from '../services/db';
import { SAMPLE_STUDENT_LIST } from '../services/sampleData';

export function useStudentListStore() {
  const [studentLists, setStudentLists] = useState<StudentList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  useEffect(() => {
    async function initLists() {
      let loaded = await getAllStudentLists();
      if (loaded.length === 0) {
        await saveStudentList(SAMPLE_STUDENT_LIST);
        loaded = [SAMPLE_STUDENT_LIST];
      }
      setStudentLists(loaded);
      if (loaded.length > 0) setActiveListId(loaded[0].id);
    }
    initLists();
  }, []);

  const activeList = studentLists.find((l) => l.id === activeListId) || studentLists[0] || null;

  const saveList = async (list: StudentList) => {
    await saveStudentList(list);
    setStudentLists((prev) => {
      const idx = prev.findIndex((l) => l.id === list.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = list;
        return updated;
      }
      return [...prev, list];
    });
  };

  const deleteList = async (id: string) => {
    await deleteStudentListFromDB(id);
    setStudentLists((prev) => prev.filter((l) => l.id !== id));
    if (activeListId === id) {
      const remaining = studentLists.filter((l) => l.id !== id);
      setActiveListId(remaining[0]?.id || null);
    }
  };

  const toggleStudentAbsent = async (listId: string, studentId: string) => {
    const target = studentLists.find((l) => l.id === listId);
    if (!target) return;

    const updatedStudents = target.students.map((s) =>
      s.id === studentId ? { ...s, absent: !s.absent } : s
    );
    const updatedList = { ...target, students: updatedStudents, updatedAt: Date.now() };
    await saveList(updatedList);
  };

  return {
    studentLists,
    activeListId,
    setActiveListId,
    activeList,
    saveList,
    deleteList,
    toggleStudentAbsent,
  };
}
