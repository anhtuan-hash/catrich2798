import {
  assertAdmin, db, fail, guardBody, guardOrigin, handleError, send, staffContext,
} from '../../../serverless-handlers/_galleryCreator.js';
import { isDisplayConfig } from '../src/display-config.js';

const table = 'museum_lab_display_settings';
const fields = 'wallpaper_opacity, high_contrast';

function displayValues({ data, error }, message) {
  if (error || !data) throw fail(503, message);
  return { opacity: data.wallpaper_opacity, highContrast: data.high_contrast };
}

export default async function museumDisplay(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Phương thức không được hỗ trợ.' });
  }

  try {
    if (req.method === 'GET') {
      const result = await db().from(table).select(fields).eq('id', true).single();
      return send(res, 200, displayValues(result, 'Chưa thể đồng bộ cài đặt hiển thị.'));
    }

    guardOrigin(req);
    const values = guardBody(req, 512);
    if (!isDisplayConfig(values)) throw fail(400, 'Cài đặt hiển thị không hợp lệ.');
    const database = db();
    assertAdmin(await staffContext(req, database));

    const result = await database.from(table).update({
      wallpaper_opacity: values.opacity,
      high_contrast: values.highContrast,
    }).eq('id', true).select(fields).single();
    return send(res, 200, displayValues(result, 'Chưa thể lưu cài đặt hiển thị.'));
  } catch (error) {
    return handleError(res, error);
  }
}
