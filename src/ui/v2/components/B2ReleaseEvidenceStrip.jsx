import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button } from './B2UI.jsx';
import { fetchBuildIdentity, isDeployBoundBuild, readCachedBuildIdentity } from '../buildIdentity.js';
import { V2_RELEASE_CANDIDATE_ID } from '../releaseCandidate.js';
import { BOOTSTRAP_REHEARSAL_EVENT, BOOTSTRAP_REHEARSAL_STORAGE_KEY, readBootstrapRehearsalLedger, summarizeBootstrapRehearsal } from '../bootstrapRehearsal.js';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { TOOL_BEHAVIOR_MANIFEST } from '../toolBehaviorManifest.js';
import './B2ReleaseEvidenceStrip.css';

const LEVEL2_COUNT = Object.values(V2_TOOL_BRIDGE).filter((meta) => meta.tested && Number(meta.level || 0) === 2).length;
const BEHAVIOR_COUNT = Object.values(TOOL_BEHAVIOR_MANIFEST).reduce((sum, item) => sum + (item?.checks?.length || 0), 0);

export default function B2ReleaseEvidenceStrip() {
  const [build, setBuild] = useState(readCachedBuildIdentity);
  const [rehearsal, setRehearsal] = useState(readBootstrapRehearsalLedger);

  useEffect(() => {
    const controller = new AbortController();
    fetchBuildIdentity({ signal: controller.signal }).then(setBuild).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const sync = () => setRehearsal(readBootstrapRehearsalLedger());
    const onStorage = (event) => {
      if (!event.key || event.key === BOOTSTRAP_REHEARSAL_STORAGE_KEY) sync();
    };
    window.addEventListener(BOOTSTRAP_REHEARSAL_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(BOOTSTRAP_REHEARSAL_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const summary = useMemo(() => summarizeBootstrapRehearsal(rehearsal, {
    candidate: V2_RELEASE_CANDIDATE_ID,
    buildSha: build.sha || '',
  }), [rehearsal, build.sha]);
  const buildBound = isDeployBoundBuild(build);

  return (
    <section className={`b2-release-evidence-strip ${summary.passed ? 'is-pass' : 'is-closed'}`} role="status" aria-live="polite">
      <div className="b2-release-evidence-strip__lead">
        <span aria-hidden="true">{summary.passed ? '✓' : '◇'}</span>
        <div>
          <strong>{summary.passed ? 'Boot rehearsal đã PASS trên build hiện tại' : 'Owner Approval đang bị khóa bởi release evidence'}</strong>
          <small>{summary.passed ? 'Gate có thể tiếp tục sau khi các evidence còn lại hoàn tất.' : 'Chạy Boot Rehearsal và behavior QA trên đúng build trước khi owner approval có hiệu lực.'}</small>
        </div>
      </div>
      <div className="b2-release-evidence-strip__facts">
        <span><b>RC</b>{V2_RELEASE_CANDIDATE_ID.replace('rc-', '')}</span>
        <span><b>SHA</b>{build.shortSha || 'UNBOUND'}</span>
        <span><b>Tools</b>{LEVEL2_COUNT}/14 L2</span>
        <span><b>Behavior</b>{BEHAVIOR_COUNT} checks</span>
        <B2Badge tone={buildBound ? 'green' : 'cyan'}>{buildBound ? 'BUILD BOUND' : 'BUILD PENDING'}</B2Badge>
        <B2Badge tone={summary.passed ? 'green' : 'violet'}>{summary.passed ? `${summary.completed}/${summary.required} REHEARSAL PASS` : 'REHEARSAL REQUIRED'}</B2Badge>
      </div>
      <div className="b2-release-evidence-strip__actions">
        <B2Button variant="ghost" onClick={() => window.open('/preview-ui-v2-behavior.html', '_blank', 'noopener,noreferrer')}>Behavior QA ↗</B2Button>
        <B2Button variant={summary.passed ? 'ghost' : 'primary'} onClick={() => window.open('/preview-ui-v2-rehearsal.html', '_blank', 'noopener,noreferrer')}>
          {summary.passed ? 'Xem rehearsal ↗' : 'Mở Boot Rehearsal ↗'}
        </B2Button>
      </div>
    </section>
  );
}
