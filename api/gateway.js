import briefingWeather from '../serverless-handlers/_briefing-weather.js';
import checkEmbed from '../serverless-handlers/_check-embed.js';
import googleDriveHomeroomBackup from '../serverless-handlers/_google-drive-homeroom-backup.js';
import weeklyPracticeDriveAction from '../serverless-handlers/_weekly-practice-drive-action.js';
import weeklyPracticeFile from '../serverless-handlers/_weekly-practice-file.js';
import workHubArchiveResource from '../serverless-handlers/_work-hub-archive-resource.js';
import workHubFileAccess from '../serverless-handlers/_work-hub-file-access.js';
import workHubFileAction from '../serverless-handlers/_work-hub-file-action.js';
import workHubFile from '../serverless-handlers/_work-hub-file.js';

const handlers = Object.freeze({
  'briefing-weather': briefingWeather,
  'check-embed': checkEmbed,
  'google-drive-homeroom-backup': googleDriveHomeroomBackup,
  'weekly-practice-drive-action': weeklyPracticeDriveAction,
  'weekly-practice-file': weeklyPracticeFile,
  'work-hub-archive-resource': workHubArchiveResource,
  'work-hub-file-access': workHubFileAccess,
  'work-hub-file-action': workHubFileAction,
  'work-hub-file': workHubFile,
});

export default async function gateway(req, res) {
  const key = String(req.query?.handler || '').trim();
  const selected = handlers[key];
  if (!selected) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'API route not found' }));
  }
  return selected(req, res);
}
