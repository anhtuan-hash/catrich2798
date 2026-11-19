import {isAsean} from './aseanLesson.js';

export const DOSSIER_CLASS = '11.3';
export const DOSSIER_ROUTE = '#/tool/immersive-gallery?dossier=1';
export const PUBLIC_WORKSHOP_OPERATION = 'public-group-workshop';

export const isPublicWorkshopGroup = (assignment, group) => (
 isAsean(assignment) && assignment.class_scope === DOSSIER_CLASS &&
 Boolean(assignment.content_frozen_at) && !assignment.archived_at && group.state === 'published'
);

export const publicWorkshopHref = (groupId, language) => (
 '#/gallery-create?' + new URLSearchParams({viewGroup:groupId,lang:language})
);
