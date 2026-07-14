import { getRuntimeClient, runtimeRpc, subscribeTable } from '../services/runtime/core.js';
import { readLocal, scopedLocalKey, uid, writeLocal } from '../pages/v1093/shared.js';

export const CLOUD_OPERATIONS_UPDATED = 'bes-cloud-operations-updated-v1097';

function nowIso() { return new Date().toISOString(); }

function keys(user) {
  return {
    jobs: scopedLocalKey('bes-cloud-jobs-v1097', user),
    deliveries: scopedLocalKey('bes-cloud-deliveries-v1097', user),
    heartbeat: scopedLocalKey('bes-cloud-heartbeat-v1097', user),
    digest: scopedLocalKey('bes-cloud-digest-v1097', user),
  };
}

function emit(detail = {}) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CLOUD_OPERATIONS_UPDATED, { detail }));
}

function normalizeJob(job, user) {
  return {
    id: job.id || uid('cloud-job'),
    rule_id: job.rule_id || '',
    owner_id: job.owner_id || user?.id || '',
    rule_name: job.rule_name || job.rule?.name || 'Automation',
    trigger_type: job.trigger_type || 'schedule',
    status: job.status || 'queued',
    payload: job.payload || {},
    attempts: Number(job.attempts || 0),
    max_attempts: Number(job.max_attempts || 3),
    run_after: job.run_after || nowIso(),
    locked_at: job.locked_at || null,
    approved_at: job.approved_at || null,
    last_error: job.last_error || '',
    created_at: job.created_at || nowIso(),
    updated_at: job.updated_at || nowIso(),
    finished_at: job.finished_at || null,
  };
}

function normalizeDelivery(item, user) {
  return {
    id: item.id || uid('cloud-delivery'),
    job_id: item.job_id || null,
    owner_id: item.owner_id || user?.id || '',
    channel: item.channel || 'in_app',
    status: item.status || 'ready',
    title: item.title || 'Brian English Studio',
    body: item.body || '',
    route: item.route || '',
    payload: item.payload || {},
    delivered_at: item.delivered_at || null,
    created_at: item.created_at || nowIso(),
  };
}

function defaultDigest(user) {
  return {
    owner_id: user?.id || '',
    enabled: true,
    cadence: 'daily',
    delivery_time: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    include_summary: true,
    include_failures: true,
    include_pending: true,
    next_delivery_at: null,
    updated_at: nowIso(),
  };
}

async function safeQuery(operation, fallback) {
  try {
    const result = await operation();
    if (result?.error) {
      if (/does not exist|not found|schema cache|could not find/i.test(result.error.message || '')) return fallback;
      throw result.error;
    }
    return result?.data ?? fallback;
  } catch (error) {
    if (/does not exist|not found|schema cache|could not find/i.test(error?.message || '')) return fallback;
    throw error;
  }
}

export async function loadCloudOperationsState(user) {
  const storage = keys(user);
  const local = {
    jobs: readLocal(storage.jobs, []).map((item) => normalizeJob(item, user)),
    deliveries: readLocal(storage.deliveries, []).map((item) => normalizeDelivery(item, user)),
    heartbeat: readLocal(storage.heartbeat, null),
    digest: readLocal(storage.digest, defaultDigest(user)),
    status: { available: false, scheduler: false, mode: 'local' },
    mode: 'local',
  };
  const client = getRuntimeClient();
  if (!client || !user?.id) return local;

  const [jobs, deliveries, heartbeat, digest, statusResult] = await Promise.all([
    safeQuery(() => client.from('automation_cloud_jobs').select('*, automation_rules(name)').order('created_at', { ascending: false }).limit(300), null),
    safeQuery(() => client.from('automation_delivery_log').select('*').order('created_at', { ascending: false }).limit(300), null),
    safeQuery(() => client.from('automation_worker_heartbeats').select('*').eq('worker_key', 'primary').maybeSingle(), null),
    safeQuery(() => client.from('automation_digest_preferences').select('*').eq('owner_id', user.id).maybeSingle(), null),
    safeQuery(() => runtimeRpc('bes_v1097_cloud_status'), null),
  ]);

  if (!jobs || !deliveries) return local;
  const state = {
    jobs: jobs.map((item) => normalizeJob({ ...item, rule_name: item.automation_rules?.name || item.rule_name }, user)),
    deliveries: deliveries.map((item) => normalizeDelivery(item, user)),
    heartbeat: heartbeat || local.heartbeat,
    digest: digest || local.digest,
    status: statusResult || { available: true, scheduler: false, mode: 'cloud' },
    mode: 'cloud',
  };
  writeLocal(storage.jobs, state.jobs);
  writeLocal(storage.deliveries, state.deliveries);
  writeLocal(storage.heartbeat, state.heartbeat);
  writeLocal(storage.digest, state.digest);
  return state;
}

export async function runCloudWorker(user, batchSize = 25) {
  const client = getRuntimeClient();
  if (!client || !user?.id) throw new Error('Cloud worker requires Supabase and an authenticated account.');
  const { data, error } = await runtimeRpc('bes_v1097_worker_tick', { batch_size: Math.max(1, Math.min(100, Number(batchSize || 25))) });
  if (error) throw error;
  emit({ type: 'worker-tick', result: data });
  return data;
}

export async function approveCloudJob(jobId) {
  const { data, error } = await runtimeRpc('bes_v1097_approve_job', { target_job: jobId });
  if (error) throw error;
  emit({ type: 'job-approved', jobId });
  return data;
}

export async function retryCloudJob(jobId) {
  const { data, error } = await runtimeRpc('bes_v1097_retry_job', { target_job: jobId });
  if (error) throw error;
  emit({ type: 'job-retried', jobId });
  return data;
}

export async function cancelCloudJob(jobId) {
  const { data, error } = await runtimeRpc('bes_v1097_cancel_job', { target_job: jobId });
  if (error) throw error;
  emit({ type: 'job-cancelled', jobId });
  return data;
}

export async function saveDigestPreferences(preferences, user) {
  const storage = keys(user);
  const next = { ...defaultDigest(user), ...preferences, owner_id: user?.id || preferences.owner_id, updated_at: nowIso() };
  const client = getRuntimeClient();
  if (client && user?.id) {
    const { data, error } = await client.from('automation_digest_preferences').upsert(next).select('*').single();
    if (!error && data) {
      writeLocal(storage.digest, data);
      emit({ type: 'digest-saved', digest: data });
      return data;
    }
    if (error && !/does not exist|schema cache/i.test(error.message || '')) throw error;
  }
  writeLocal(storage.digest, next);
  emit({ type: 'digest-saved', digest: next });
  return next;
}

export function subscribeCloudOperations(user, onChange) {
  const cleanups = [
    subscribeTable({ key: `v1097-jobs-${user?.id || 'guest'}`, table: 'automation_cloud_jobs', onChange }),
    subscribeTable({ key: `v1097-delivery-${user?.id || 'guest'}`, table: 'automation_delivery_log', onChange }),
    subscribeTable({ key: `v1097-heartbeat-${user?.id || 'guest'}`, table: 'automation_worker_heartbeats', onChange }),
  ];
  const listener = () => onChange?.();
  if (typeof window !== 'undefined') window.addEventListener(CLOUD_OPERATIONS_UPDATED, listener);
  return () => {
    cleanups.forEach((cleanup) => cleanup?.());
    if (typeof window !== 'undefined') window.removeEventListener(CLOUD_OPERATIONS_UPDATED, listener);
  };
}
