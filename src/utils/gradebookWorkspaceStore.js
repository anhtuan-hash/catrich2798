import {
  createHomeroomWorkspace,
  listHomeroomWorkspaces,
  listLocalHomeroomWorkspaces,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
} from './homeroomClassWorkspaceStore.js';
import { SUBJECT_CLASS_TYPE } from './homeroomClassTypes.js';

// Gradebook owns this adapter API. The current persistence backend intentionally
// reuses the existing class workspace payload so every historical roster and
// learningGradebook remains available without a destructive migration. A later
// dedicated gradebook table can replace this backend without changing the UI.

export function listLocalGradebookClasses(user) {
  return listLocalHomeroomWorkspaces(user);
}

export async function listGradebookClasses(user) {
  return listHomeroomWorkspaces(user);
}

export function loadLocalGradebookClass(user, classId) {
  return loadLocalHomeroomWorkspace(user, classId);
}

export async function loadGradebookClass(user, classId) {
  return loadHomeroomWorkspace(user, classId);
}

export function saveLocalGradebookClass(workspace, user) {
  return saveLocalHomeroomWorkspace(workspace, user);
}

export async function saveGradebookClass(workspace, user) {
  return saveHomeroomWorkspace(workspace, user);
}

export async function createGradebookClass(user, input = {}) {
  return createHomeroomWorkspace(user, {
    ...input,
    classProfile: {
      ...(input.classProfile || {}),
      classType: SUBJECT_CLASS_TYPE,
    },
  });
}
