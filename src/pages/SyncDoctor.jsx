import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Activity, AlertTriangle, ArrowRight, BookUser, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Cloud, Database, Download, FileSearch, Filter, HardDrive,
  Info, LockKeyhole, MonitorSmartphone, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole} from '../utils/roles.js';
import {runSyncDoctorScan,serializeSyncDoctorReport} from '../utils/syncDoctorDiagnostics.js';
import {buildSyncReviewPlans,serializeSyncReviewDocket} from '../utils/syncDoctorPlanning.mjs';
import {summarizeSyncMonitor} from '../utils/syncDoctorMonitoring.mjs';
import {getSyncDoctorReviewInbox,submitSyncDoctorReview,decideSyncDoctorReview,cancelSyncDoctorReview,previewSyncDoctorReview,createSyncDoctorPrivateBackup,rehearseSyncDoctorRollback,listSyncDoctorMonitorRuns} from '../utils/syncDoctorReviewInbox.js';
import './SyncDoctor.css';

const viText={
  eyebrow:'BRIAN / DATA INTEGRITY CENTER',title:'Sync Doctor',
  sub:'Kiểm tra và đối soát dữ liệu liên thông trong một không gian an toàn.',
  safety:'GIÁM SÁT · BẢO VỆ DỮ LIỆU',safetyText:'Có giám sát tự động; sửa và hoàn tác dữ liệu thật đang bị khóa.',
  tabs:['Tổng quan','Vấn đề','Nguồn dữ liệu','Kế hoạch sửa','Nhật ký','Cài đặt','Giám sát'],
  run:'Quét dữ liệu',running:'Đang đối soát',export:'Xuất báo cáo',year:'Năm học',
  class:'Lớp cần kiểm tra',all:'Tất cả lớp có quyền xem',classHint:'Để trống để quét các lớp được phép đọc.',
  overview:'Tổng quan chẩn đoán',intro:'Thông tin lấy từ nguồn được cấp quyền. Không có dữ liệu không đồng nghĩa đã đồng bộ.',
  findings:'Phát hiện',critical:'Nghiêm trọng',classes:'Lớp đối chiếu',sources:'Nguồn xác minh',
  evidence:'Bằng chứng & hướng xử lý',attention:'Cần xem xét',limited:'Phạm vi kiểm tra chưa đầy đủ',
  empty:'Chưa có lần quét nào',emptyDesc:'Chọn phạm vi và nhấn Quét dữ liệu để nhận kết quả thật từ Brian.',
  emptyIssues:'Không phát hiện vấn đề trong phạm vi đã kiểm tra.',choose:'Chọn một vấn đề để xem bằng chứng.',
  status:'Trạng thái',records:'Bản ghi xem được',message:'Ghi chú',again:'Quét lại',
  planTitle:'Kế hoạch khắc phục',planDesc:'Chức năng sửa dữ liệu chưa được bật trong giai đoạn chỉ đọc.',
  planSteps:['Xác nhận định danh và nguồn gốc','Xem trước thay đổi và ảnh hưởng','Duyệt quyền độc lập','Thực hiện an toàn và quét xác minh'],
  auditTitle:'Nhật ký và phê duyệt',auditDesc:'Yêu cầu và quyết định được lưu trên Supabase. Lượt quét chỉ lưu trong phiên hiện tại.',
  settingsTitle:'Chính sách an toàn',settingsLines:['Không ghi đè điểm, hồ sơ GVCN hay đánh giá.','Không ghép hai học sinh chỉ vì trùng họ tên.','Không suy diễn lỗi khi nguồn bị từ chối quyền đọc.','Hàng đợi cục bộ chỉ thuộc trình duyệt này.','Các thao tác sửa yêu cầu kiến trúc phê duyệt ở giai đoạn tiếp theo.'],
  noAccess:'Tài khoản chưa được cấp quyền quản trị Sync Doctor.',back:'Về ứng dụng',
  device:'Thiết bị hiện tại',pending:'Tác vụ đang chờ',scanHistory:'Lượt quét',review:'Cần người có quyền kiểm tra',
  severity:'Mức độ',filter:'Lọc theo mức',scope:'Phạm vi',sourceLimited:'Chưa xác minh toàn bộ hệ thống',
  view:'Xem chi tiết',closed:'Đóng',started:'Bắt đầu',finished:'Kết thúc',result:'Kết quả',
  report:'Báo cáo sẽ ẩn mã định danh học sinh và không có thông tin cá nhân.',
  submitReview:'Gửi yêu cầu rà soát',submitNote:'Ghi chú gửi người duyệt (không ghi dữ liệu cá nhân)',
  reviewQueue:'Yêu cầu rà soát trên máy chủ',reloadQueue:'Tải lại yêu cầu',serverAudit:'Lịch sử phê duyệt trên máy chủ',
  reviewWarning:'Chấp thuận rà soát không đồng nghĩa cho phép sửa dữ liệu. Mỗi yêu cầu cần người duyệt khác người gửi.',
  decideApprove:'Chấp thuận rà soát',decideReject:'Từ chối',cancelRequest:'Hủy yêu cầu',
  decisionNote:'Ý kiến người duyệt',requester:'Người gửi',reviewer:'Người duyệt',
  statusSubmitted:'Đang chờ',statusApproved:'Đã duyệt rà soát',statusRejected:'Đã từ chối',
  statusStale:'Dữ liệu đã thay đổi',statusCancelled:'Đã hủy',reviewNone:'Chưa có yêu cầu gửi đến máy chủ.',
  auditNone:'Chưa có hoạt động phê duyệt được ghi nhận.',sessionAudit:'Lượt quét trong phiên này',
  safeNoPII:'Chỉ nhập nhận xét quy trình; không nhập tên, mã học sinh hoặc dữ liệu điểm.',
  dryRun:'Kiểm tra an toàn',dryRunTitle:'Xem trước khắc phục trên máy chủ',
  readyPreview:'Có thể lập phương án thủ công',blockedPreview:'Không đủ điều kiện thực hiện',stalePreview:'Phiên bản dữ liệu đã đổi',
  currentCount:'Hiện có',proposedCount:'Dự kiến',checksum:'Dấu kiểm tra dữ liệu',
  backupMissing:'Chưa tạo bản sao lưu',noRollback:'Chưa có khả năng hoàn tác',
  noExecution:'Không thay đổi dữ liệu. Cần quy trình sao lưu, hoàn tác và một lần phê duyệt thực thi riêng.',
  previewTime:'Thời điểm kiểm tra',reasonLabel:'Lý do',
  privateBackup:'Tạo bản sao lưu riêng tư',rehearsal:'Diễn tập hoàn tác',
  backupTitle:'Sao lưu trước khi sửa',backupReady:'Đã sao lưu, chờ diễn tập',
  rehearsalPassed:'Diễn tập trong bộ nhớ thành công',rehearsalFailed:'Chưa đạt kiểm tra hoàn tác',
  retention:'Bản sao lưu hết hạn sau 48 giờ; hệ thống dọn mỗi ngày',restoreNote:'Chưa phục hồi thử trên bảng dữ liệu thật; chức năng sửa và hoàn tác thật vẫn bị khóa.',
  backupUnavailable:'Chỉ người đã duyệt độc lập mới được thực hiện, và chỉ hỗ trợ Sổ điểm.',
  backupTime:'Hết hạn',
  monitorTitle:'Giám sát đồng bộ tự động',monitorSub:'Tổng hợp theo lịch; không thu thập tên, mã học sinh hay điểm số.',
  monitorWarning:'Số liệu chỉ là dấu hiệu cần rà soát. Không phải danh sách học sinh đã xác nhận sai lệch.',
  monitorChecked:'Lần quét gần nhất',monitorClasses:'Lớp chuẩn',monitorGradebooks:'Sổ điểm bộ môn',
  monitorHomeroom:'Lớp chủ nhiệm',monitorSuspects:'Liên kết cần rà soát',
  monitorAffected:'Workspace cần đối soát',monitorCountDrift:'Workspace lệch bộ đếm HS',monitorHistory:'Lịch sử kiểm tra',
  monitorEmpty:'Chưa có dữ liệu giám sát.',monitorRefresh:'Cập nhật giám sát',
  monitorAlertTitle:'Giám sát tự động phát hiện dấu hiệu cần rà soát',
  monitorAlertDetail:'liên kết nghi vấn tại',monitorAlertScope:'workspace. Chưa xác nhận lỗi học sinh.',
  monitorTrend:'Thay đổi so với lần quét trước',monitorStale:'Dữ liệu giám sát quá hạn 36 giờ — kiểm tra Cron.',
  monitorPartial:'Giám sát chưa đủ dữ liệu; không xác nhận hệ thống nhất quán.',
  monitorHealthy:'Giám sát gần nhất chưa ghi nhận thiếu liên kết trong phạm vi kiểm tra.',
  monitorNoRun:'Chưa có kết quả giám sát tự động có thể xác minh.',monitorGo:'Xem chi tiết giám sát',
  repairLocked:'Sửa và hoàn tác dữ liệu thật vẫn bị khóa cho tới khi hoàn tất kiểm thử thực thi độc lập.',
  releaseGateTitle:'Cổng nghiệm thu an toàn',
  releaseGateSubtitle:'PostgreSQL 16 cách ly đã kiểm thử sửa và hoàn tác bằng dữ liệu giả lập. Vẫn cần nghiệm thu đăng nhập thật; chưa mở quyền ghi dữ liệu học sinh.',
  releaseGatePass:'Đã triển khai',
  releaseGatePending:'Chưa nghiệm thu',
  releaseGateLocal:'Kiểm thử ngoại tuyến bằng hồ sơ giả lập, không cần dịch vụ trả phí',
  releaseGateSqlPrepared:'Bộ kiểm thử SQL thực tế đã chạy trên runner công khai miễn phí',
  releaseGateDb:'PostgreSQL 16: sửa một học sinh, bảo toàn điểm, chặn xung đột và hoàn tác — ĐẠT',
  releaseGateAccounts:'Kiểm thử hai tài khoản thật và Safari/Android',
  releaseGateHold:'Cả ba lệnh thực thi, sửa và hoàn tác vẫn bị khóa ở Supabase Production.',
  releaseGateEvidence:'Xem bằng chứng kiểm thử PostgreSQL thực tế · GitHub Actions',
  docket:'Xuất phiếu rà soát',plansOverview:'Kế hoạch dự kiến được tạo từ lần quét gần nhất — không thực hiện thay đổi dữ liệu.',
  preview:'Xem trước phương án',constraints:'Điều kiện an toàn',steps:'Các bước rà soát',
  approval:'Cần người có thẩm quyền duyệt',reviewable:'Có thể rà soát',blocked:'Chưa đủ điều kiện',
  noPlan:'Chưa có kế hoạch; hãy quét dữ liệu trước.',sourceRevision:'Phiên bản nguồn',identity:'Học sinh liên quan',
  planCount:'Phương án đề xuất',viewPlan:'Xem kế hoạch',sourceIncomplete:'Dữ liệu đọc bị giới hạn; không cho phép tự áp dụng.',
  inactive:'Không hỗ trợ tự sửa trong giai đoạn này.',
};
const enText={
  eyebrow:'BRIAN / DATA INTEGRITY CENTER',title:'Sync Doctor',
  sub:'Diagnose data consistency safely across your connected Brian modules.',
  safety:'MONITORING · DATA PROTECTION',safetyText:'Monitoring and review are enabled; live academic repair and rollback remain locked.',
  tabs:['Overview','Issues','Sources','Repair plans','Audit','Settings','Monitoring'],
  run:'Run scan',running:'Scanning',export:'Export report',year:'School year',
  class:'Class scope',all:'All visible classes',classHint:'Leave blank to check classes your account can access.',
  overview:'Diagnostic overview',intro:'Results are limited to authorized sources. Missing data is not proof of success.',
  findings:'Findings',critical:'Critical',classes:'Classes checked',sources:'Verified sources',
  evidence:'Evidence & next step',attention:'Needs review',limited:'Incomplete coverage',
  empty:'No scans yet',emptyDesc:'Choose scope and run an authorized scan of real Brian data.',
  emptyIssues:'No findings in the checked scope.',choose:'Select an issue to inspect the evidence.',
  status:'Status',records:'Visible rows',message:'Notes',again:'Rescan',
  planTitle:'Repair plans',planDesc:'Data repair is not enabled in the read-only release.',
  planSteps:['Verify identity and authoritative source','Preview data changes and impact','Obtain independent approval','Apply safely and verify again'],
  auditTitle:'Approvals & audit',auditDesc:'Review requests and decisions are saved on Supabase. Scans remain session-only.',
  settingsTitle:'Safety policy',settingsLines:['No overwriting scores, homeroom records or assessment results.','Never merge students using name alone.','Permission-denied data is not treated as empty.','Local queue covers this browser only.','Repair requires approval infrastructure in a later phase.'],
  noAccess:'This account does not have Sync Doctor administrative access.',back:'Back to Apps',
  device:'This device',pending:'Pending changes',scanHistory:'Scans',review:'Human review required',
  severity:'Severity',filter:'Filter by severity',scope:'Scope',sourceLimited:'Not a school-wide audit',
  view:'View details',closed:'Close',started:'Started',finished:'Finished',result:'Result',
  report:'Exported reports omit student identity keys and personal data.',
  submitReview:'Submit review request',submitNote:'Note for reviewer (no personal data)',
  reviewQueue:'Server review requests',reloadQueue:'Refresh requests',serverAudit:'Server approval history',
  reviewWarning:'Approval only authorizes manual review, never data modification. The reviewer must be different from the requester.',
  decideApprove:'Approve review',decideReject:'Reject',cancelRequest:'Cancel request',
  decisionNote:'Reviewer note',requester:'Requester',reviewer:'Reviewer',
  statusSubmitted:'Pending',statusApproved:'Review approved',statusRejected:'Rejected',
  statusStale:'Source changed',statusCancelled:'Cancelled',reviewNone:'No server review requests yet.',
  auditNone:'No approval events recorded.',sessionAudit:'Scans in this session',
  safeNoPII:'Enter process notes only; never include student names, IDs or scores.',
  dryRun:'Run safety preflight',dryRunTitle:'Server-side repair preview',
  readyPreview:'Ready for manual planning',blockedPreview:'Repair cannot proceed',stalePreview:'Source revision changed',
  currentCount:'Current',proposedCount:'Proposed',checksum:'Data fingerprint',
  backupMissing:'Backup not created',noRollback:'Rollback not available',
  noExecution:'No data will change. A backup, rollback workflow and separate execution approval are required.',
  previewTime:'Checked at',reasonLabel:'Reason',
  privateBackup:'Create private backup',rehearsal:'Rehearse rollback',
  backupTitle:'Pre-repair private backup',backupReady:'Backup secured; rehearsal pending',
  rehearsalPassed:'In-memory rehearsal passed',rehearsalFailed:'Rollback rehearsal not passed',
  retention:'Backup expires after 48 hours; daily cleanup removes expired copies',restoreNote:'No live database restoration was tested; real repair and rollback remain disabled.',
  backupUnavailable:'Only the independent approver may act; gradebook only.',
  backupTime:'Expires',
  monitorTitle:'Automated data integrity monitoring',monitorSub:'Scheduled summaries without names, student codes or grades.',
  monitorWarning:'Counts are advisory indicators, not confirmed student errors.',
  monitorChecked:'Latest scan',monitorClasses:'Canonical classes',monitorGradebooks:'Subject gradebooks',
  monitorHomeroom:'Homeroom workspaces',monitorSuspects:'Possible missing links',
  monitorAffected:'Affected workspaces',monitorCountDrift:'Student counter mismatches',monitorHistory:'Monitoring history',
  monitorEmpty:'No monitoring results yet.',monitorRefresh:'Refresh monitor',
  monitorAlertTitle:'Scheduled monitoring found possible associations to review',
  monitorAlertDetail:'possible links across',monitorAlertScope:'workspaces. No student error is confirmed.',
  monitorTrend:'Change since previous scan',monitorStale:'Monitoring is more than 36 hours old — check Cron.',
  monitorPartial:'Monitoring coverage is incomplete; consistency is not confirmed.',
  monitorHealthy:'Latest scheduled scan found no potential missing links in its limited scope.',
  monitorNoRun:'No verifiable scheduled scan is available.',monitorGo:'Open Monitoring',
  repairLocked:'Real academic repair and rollback remain locked pending independent execution tests.',
  releaseGateTitle:'Safety release gates',
  releaseGateSubtitle:'Isolated PostgreSQL 16 passed synthetic-data repair and rollback tests. Real-account browser UAT remains pending; academic writes remain disabled.',
  releaseGatePass:'Implemented',
  releaseGatePending:'Not accepted',
  releaseGateLocal:'Offline synthetic student repair/rollback checks, with no paid service',
  releaseGateSqlPrepared:'Real SQL acceptance harness executed on a free public runner',
  releaseGateDb:'PostgreSQL 16: one-student repair, score integrity, conflict refusal and rollback — PASSED',
  releaseGateAccounts:'Two real-account sessions and Safari/Android verification',
  releaseGateHold:'All three execution, repair and rollback RPCs remain disabled in Production.',
  releaseGateEvidence:'View real PostgreSQL test evidence · GitHub Actions',
  docket:'Export review docket',plansOverview:'Proposals from the latest scan; no changes can be executed.',
  preview:'Review preview',constraints:'Safety requirements',steps:'Review steps',
  approval:'Independent approval required',reviewable:'Ready for review',blocked:'Blocked — investigate',
  noPlan:'No review plans yet. Run a scan first.',sourceRevision:'Source revision',identity:'Student in scope',
  planCount:'Review proposals',viewPlan:'View plan',sourceIncomplete:'Incomplete source coverage. No changes can be applied.',
  inactive:'Automatic repair is unavailable in this release.',
};
const tone={critical:'danger',high:'warning',medium:'medium',low:'info'};
const statuses={ok:['Có thể đọc','Readable'],empty:['Không có bản ghi','No visible rows'],limited:['Một phần','Partial'],error:['Lỗi','Error'],
  unauthorized:['Không có quyền','No permission'],unavailable:['Không khả dụng','Unavailable']};

const sourceEn={canonical:'Canonical roster',homeroom:'Homeroom',gradebook:'Gradebook',assessment:'Assessment',assignment:'Assignments'};
const issueEn={
  IDENTITY_MISSING:'Student missing a stable identifier',
  IDENTITY_DUPLICATE:'Duplicate internal student identifier',
  STUDENT_CODE_DUPLICATE:'Duplicate student code in class',
  MULTIPLE_LOCAL_MATCHES:'Multiple local records match one student',
  AMBIGUOUS_IDENTITY:'Similar records without a reliable identity key',
  STUDENT_NOT_LINKED:'Canonical student not linked to destination',
  CANONICAL_NOT_VISIBLE:'No visible canonical class roster',
  ASSESSMENT_LINK_REVIEW:'Assessment student association unverified',
  SOURCE_UNVERIFIED:'Data source cannot be verified',
  SOURCE_COVERAGE_PARTIAL:'Source scan has incomplete coverage',
  SOURCE_NO_VISIBLE_ROWS:'No visible rows in source',
  LOCAL_QUEUE_PENDING:'Pending changes on this device',
};
const issueTitle=(issue,vi)=>vi?issue.description:(issueEn[issue.code]||issue.description);

const iconFor={canonical:Database,homeroom:BookUser,gradebook:ClipboardCheck,assessment:FileSearch,assignment:ShieldCheck};
const yearNow=()=>{const today=new Date(),start=today.getMonth()>=7?today.getFullYear():today.getFullYear()-1;return String(start)+'-'+String(start+1);};
const saveDocket=(report,plans)=>{
  if(!report || !plans.length)return;
  const blob=new Blob([serializeSyncReviewDocket(report,plans)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download='brian-sync-review-'+report.schoolYear+'.json';
  a.click();URL.revokeObjectURL(href);
};
const saveReport=(report)=>{const blob=new Blob([serializeSyncDoctorReport(report)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='brian-sync-doctor-'+report.schoolYear+'.json';a.click();
  URL.revokeObjectURL(href);};
const datetime=value=>{if(!value)return '—';try{return new Date(value).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'medium'});}catch{return value;}};

export default function SyncDoctor({currentUser,language='vi'}){
  const t=language==='en'?enText:viText,vi=language!=='en';
  const authorized=!!currentUser&&(isAdminRole(currentUser.role)||isDepartmentLeaderRole(currentUser.role));
  const [tab,setTab]=useState(0),[schoolYear,setSchoolYear]=useState(yearNow),
    [className,setClassName]=useState(''),[filter,setFilter]=useState('all'),
    [query,setQuery]=useState(''),[report,setReport]=useState(null),
    [history,setHistory]=useState([]),[progress,setProgress]=useState(null),
    [error,setError]=useState(''),[selected,setSelected]=useState(null);
  const [reviewInbox,setReviewInbox]=useState({requests:[],events:[]});
  const [reviewLoading,setReviewLoading]=useState(false);
  const [reviewError,setReviewError]=useState('');
  const [reviewSuccess,setReviewSuccess]=useState('');
  const [reviewNote,setReviewNote]=useState('');
  const [decisionNote,setDecisionNote]=useState('');
  const [reviewTarget,setReviewTarget]=useState('');
  const [reviewSubmitting,setReviewSubmitting]=useState(false);
  const [preflightById,setPreflightById]=useState({});
  const [preflightLoading,setPreflightLoading]=useState('');
  const [backupLoading,setBackupLoading]=useState('');
  const [recoveryByRequest,setRecoveryByRequest]=useState({});
  const [monitorRuns,setMonitorRuns]=useState([]);
  const [monitorLoading,setMonitorLoading]=useState(false);
  const [monitorError,setMonitorError]=useState('');
  const controller=useRef(null);
  const busy=!!progress;
  const refreshMonitor=async()=>{
    if(!authorized)return;
    setMonitorLoading(true);setMonitorError('');
    try{setMonitorRuns(await listSyncDoctorMonitorRuns());}
    catch(err){setMonitorError(String(err?.message||err));}
    finally{setMonitorLoading(false);}
  };
  useEffect(()=>{
    controller.current?.abort();
    setReport(null);setSelected(null);setHistory([]);
    setMonitorRuns([]);setReviewInbox({requests:[],events:[]});
    setPreflightById({});setRecoveryByRequest({});
  },[currentUser?.id]);
  useEffect(()=>{if(authorized&&(tab===0||tab===6))void refreshMonitor();},[tab,authorized,currentUser?.id]);
  const refreshReviews=async()=>{
    if(!authorized)return;
    setReviewLoading(true);setReviewError('');
    try{const next=await getSyncDoctorReviewInbox();setReviewInbox(next);}
    catch(err){setReviewError(String(err?.message||err));}
    finally{setReviewLoading(false);}
  };
  useEffect(()=>{if(authorized&&(tab===3||tab===4))void refreshReviews();},[tab,authorized,currentUser?.id]);
  const requestReview=async()=>{
    const issue=report?.issues?.find(i=>i.id===selectedPlan?.id);
    if(!issue || !selectedPlan || reviewSubmitting)return;
    setReviewSubmitting(true);setReviewError('');setReviewSuccess('');
    try{
      await submitSyncDoctorReview(selectedPlan,issue,report,reviewNote);
      setReviewSuccess(vi?'Đã gửi phiếu rà soát đến máy chủ.':'Review request submitted.');
      setReviewNote('');await refreshReviews();
    }catch(err){setReviewError(String(err?.message||err));}
    finally{setReviewSubmitting(false);}
  };
  const actionReview=async(requestId,decision)=>{
    if(reviewSubmitting)return;
    setReviewSubmitting(true);setReviewError('');setReviewSuccess('');
    try{
      if(decision==='cancelled')await cancelSyncDoctorReview(requestId);
      else await decideSyncDoctorReview(requestId,decision,decisionNote);
      setReviewSuccess(vi?'Đã lưu quyết định và nhật ký trên máy chủ.':'Decision and audit saved on server.');
      setDecisionNote('');setReviewTarget('');await refreshReviews();
    }catch(err){setReviewError(String(err?.message||err));}
    finally{setReviewSubmitting(false);}
  };
  const inspectRepair=async(requestId)=>{
    if(preflightLoading)return;
    setPreflightLoading(requestId);setReviewError('');
    try{
      const result=await previewSyncDoctorReview(requestId);
      setPreflightById(old=>({...old,[requestId]:result}));
    }catch(err){setReviewError(String(err?.message||err));}
    finally{setPreflightLoading('');}
  };
  const backupReview=async(requestId)=>{
    if(backupLoading||reviewSubmitting)return;
    setBackupLoading(requestId);setReviewError('');
    try{
      const result=await createSyncDoctorPrivateBackup(requestId);
      setRecoveryByRequest(old=>({...old,[requestId]:{...(old[requestId]||{}),backup:result}}));
    }catch(err){setReviewError(String(err?.message||err));}
    finally{setBackupLoading('');}
  };
  const rehearseReview=async(requestId)=>{
    if(backupLoading||reviewSubmitting)return;
    setBackupLoading(requestId);setReviewError('');
    try{
      const result=await rehearseSyncDoctorRollback(requestId);
      setRecoveryByRequest(old=>({...old,[requestId]:{...(old[requestId]||{}),rehearsal:result}}));
    }catch(err){setReviewError(String(err?.message||err));}
    finally{setBackupLoading('');}
  };
  const run=async()=>{
    if(busy||!authorized)return;
    controller.current?.abort();
    const ctrl=new AbortController();controller.current=ctrl;
    setProgress({done:0,total:5});setError('');setSelected(null);
    try{
      const result=await runSyncDoctorScan({user:currentUser,schoolYear,className:className.trim(),
        signal:ctrl.signal,onProgress:setProgress});
      if(!ctrl.signal.aborted){
        setReport(result);
        setHistory(old=>[{
          startedAt:result.startedAt,schoolYear:result.schoolYear,className:result.className,
          count:result.issues.length,coverage:result.completeness,
        },...old].slice(0,12));
      }
    }catch(err){if(!ctrl.signal.aborted)setError(String(err?.message||err));}
    finally{if(controller.current===ctrl){controller.current=null;setProgress(null);}}
  };
  const reviewPlans=useMemo(()=>buildSyncReviewPlans(report),[report]);
  const selectedPlan=reviewPlans.find(p=>p.id===selected?.id)||reviewPlans[0]||null;
  const staleScope=Boolean(report&&(report.schoolYear!==schoolYear||report.className!==className.trim()));
  const issues=useMemo(()=>report?.issues.filter(item=>(filter==='all'||item.severity===filter)&&
    (!query||[item.description,item.className,item.code].join(' ').toLowerCase().includes(query.toLowerCase())))||[],[report,filter,query]);
  const totals={issues:report?.issues.length||0,critical:report?.issues.filter(i=>i.severity==='critical'||i.severity==='high').length||0,
    sources:report?.sources.filter(s=>s.status==='ok').length||0};
  const monitorSummary=summarizeSyncMonitor(monitorRuns);
  if(!authorized)return <section className="bsd-root bsd-denied"><LockKeyhole size={36}/><h1>Sync Doctor</h1><p>{t.noAccess}</p>
    <button type="button" onClick={()=>window.location.hash='#/apps'}>{t.back}</button></section>;
  return <div className="bsd-root">
    <section className="bsd-hero">
      <div className="bsd-hero-copy"><span className="bsd-overline"><Activity size={16}/>{t.eyebrow}</span>
        <h1>{t.title}<span className="bsd-hero-dot">.</span></h1><p>{t.sub}</p>
        <div className="bsd-safety"><ShieldCheck size={17}/><strong>{t.safety}</strong><span>{t.safetyText}</span></div>
      </div>
      <div className="bsd-hero-mark" aria-hidden="true"><div className="bsd-hero-mark-inner"><Database size={53}/><CheckCircle2 size={29}/></div></div>
    </section>
    <section className="bsd-controls">
      <div className="bsd-field"><label htmlFor="bsd-year">{t.year}</label><input id="bsd-year" value={schoolYear} onChange={e=>setSchoolYear(e.target.value)} disabled={busy} placeholder="2026-2027"/></div>
      <div className="bsd-field bsd-grow"><label htmlFor="bsd-class">{t.class}</label><input id="bsd-class" value={className} onChange={e=>setClassName(e.target.value)} disabled={busy} placeholder={t.all}/><small>{t.classHint}</small></div>
      <button className="bsd-primary" disabled={busy} type="button" onClick={run}><RefreshCw size={17} className={busy?'bsd-spin':''}/>{busy?t.running:t.run}</button>
      <button className="bsd-outline" disabled={!report||busy} type="button" title={t.report} onClick={()=>saveReport(report)}><Download size={16}/>{t.export}</button>
    </section>
    {progress&&<div className="bsd-progress" role="status"><div style={{width:Math.round(progress.done/progress.total*100)+'%'}} /><span>{t.running} · {progress.done}/{progress.total}</span></div>}
    {error&&<div className="bsd-alert" role="alert"><AlertTriangle size={18}/>{error}</div>}
    {reviewError&&<div className="bsd-alert" role="alert"><AlertTriangle size={18}/>{reviewError}</div>}
    {reviewSuccess&&<div className="bsd-advice" role="status"><CheckCircle2 size={18}/>{reviewSuccess}</div>}
    {staleScope&&<div className="bsd-banner" role="status"><Info size={17}/><div><strong>{vi?'Bạn đã đổi phạm vi quét':'Scan scope changed'}</strong><p>{vi?'Kết quả bên dưới thuộc lần quét trước. Hãy quét lại để cập nhật kế hoạch.':'The displayed results are from the previous scan; rescan before reviewing plans.'}</p></div></div>}
    <nav className="bsd-tabs" aria-label={vi?'Khu vực Sync Doctor':'Sync Doctor sections'}>
      {t.tabs.map((label,i)=><button key={label} type="button" aria-current={tab===i?'page':undefined} className={tab===i?'active':''} onClick={()=>setTab(i)}>{label}</button>)}
    </nav>
    {tab===0&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">SYSTEM OVERVIEW</span><h2>{t.overview}</h2><p>{t.intro}</p></div>
        {report&&<span className="bsd-timestamp"><Clock3 size={15}/>{datetime(report.finishedAt)}</span>}</div>
      <div className={'bsd-live-health '+monitorSummary.kind} role="status">
        <div className="bsd-live-health-icon"><Activity size={22}/></div>
        <div className="bsd-live-health-copy">
          <strong>{monitorSummary.kind==='attention'?t.monitorAlertTitle:
            monitorSummary.kind==='stale'?t.monitorStale:
            monitorSummary.kind==='partial'?t.monitorPartial:
            monitorSummary.kind==='healthy'?t.monitorHealthy:t.monitorNoRun}</strong>
          {monitorSummary.kind==='attention'&&<p><b>{monitorSummary.possibleLinks}</b> {t.monitorAlertDetail} <b>{monitorSummary.affected}</b> {t.monitorAlertScope}</p>}
          {monitorSummary.counterMismatches!==null&&monitorSummary.counterMismatches>0&&
            <p><b>{monitorSummary.counterMismatches}</b> · {t.monitorCountDrift}</p>}
          {monitorSummary.delta!==null&&<small>{t.monitorTrend}: {monitorSummary.delta>0?'+':''}{monitorSummary.delta}</small>}
          {monitorSummary.checkedAt&&<small>{t.monitorChecked}: {datetime(monitorSummary.checkedAt)}</small>}
        </div>
        <button type="button" className="bsd-outline" onClick={()=>setTab(6)}>{t.monitorGo}<ArrowRight size={16}/></button>
      </div>
      <div className="bsd-metrics">
        {[[t.findings,report?totals.issues:'—',FileSearch],[t.critical,report?totals.critical:'—',AlertTriangle],[t.classes,report?report.classesChecked:'—',BookUser],[t.sources,report?totals.sources+'/5':'—',Cloud]].map(([label,n,Icon])=>
          <article className="bsd-metric" key={label}><div><span>{label}</span><strong>{n}</strong></div><span className="bsd-metric-icon"><Icon size={23}/></span></article>)}
      </div>
      {!report?<Empty t={t}/>:<>
        {report.completeness!=='complete'&&<div className="bsd-banner"><Info size={19}/><div><strong>{t.limited}</strong><p>{report.scopeNotice}</p></div></div>}
        <div className="bsd-two">
          <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.sources}</h3><button type="button" onClick={()=>setTab(2)}>{t.view}<ArrowRight size={15}/></button></div>
            {report.sources.map(s=><SourceRow key={s.id} src={s} vi={vi}/>)}</section>
          <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.attention}</h3><button type="button" onClick={()=>setTab(1)}>{t.view}<ArrowRight size={15}/></button></div>
            {report.issues.slice(0,5).map(i=><button className="bsd-issue-preview" key={i.id} onClick={()=>{setSelected(i);setTab(1)}}><span className={'bsd-severity '+(tone[i.severity]||'info')}></span><span><strong>{issueTitle(i,vi)}</strong><small>{i.className||'—'} · {i.code}</small></span><ChevronRight size={17}/></button>)}
            {!report.issues.length&&<div className="bsd-subempty"><CheckCircle2/>{t.emptyIssues}</div>}
          </section>
        </div>
        <div className="bsd-device"><MonitorSmartphone size={20}/><div><strong>{t.device}</strong><span>{t.pending}: {report.localQueue?.pending??'—'} · {t.sourceLimited}</span></div></div>
      </>}
    </div>}
    {tab===1&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">ISSUE CENTER</span><h2>{t.tabs[1]}</h2><p>{t.review}</p></div></div>
      {!report?<Empty t={t}/>:<>
        <div className="bsd-issue-filters"><div className="bsd-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={vi?'Tìm theo lớp, loại lỗi...':'Search class or rule...'}/></div>
          <label><Filter size={16}/>{t.filter}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{vi?'Tất cả':'All'}</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div>
        <div className="bsd-two bsd-issues-layout"><section className="bsd-panel bsd-issues-list">
          {issues.length?issues.map(i=><button key={i.id} className={'bsd-issue-line '+(selected?.id===i.id?'selected':'')} onClick={()=>setSelected(i)}>
            <span className={'bsd-severity '+(tone[i.severity]||'info')}></span><span><strong>{issueTitle(i,vi)}</strong><small>{i.className||'—'} · {i.code}</small></span><ChevronRight size={16}/></button>):<div className="bsd-subempty">{t.emptyIssues}</div>}
        </section><section className="bsd-panel bsd-evidence">
          <div className="bsd-panel-head"><h3>{t.evidence}</h3>{selected&&<button type="button" aria-label={t.closed} onClick={()=>setSelected(null)}><X size={17}/></button>}</div>
          {selected?<><div className="bsd-case-label"><span className={'bsd-severity '+(tone[selected.severity]||'info')}></span>{selected.severity.toUpperCase()} · {selected.code}</div>
            <h3>{issueTitle(selected,vi)}</h3><p>{selected.detail}</p>
            <dl><dt>{t.scope}</dt><dd>{selected.year} · {selected.className||'—'}</dd><dt>{t.sourceLimited}</dt><dd>{selected.evidence?.source||'—'}</dd></dl>
            {selected.evidence?.studentName&&<div className="bsd-student-evidence"><BookUser size={17}/><span><strong>{t.identity}:</strong> {selected.evidence.studentName}{selected.evidence.studentCode?' · '+selected.evidence.studentCode:''}</span></div>}
            <div className="bsd-advice"><LockKeyhole size={17}/>{t.review}. {t.planDesc}</div>
            <button className="bsd-outline bsd-review-link" type="button" onClick={()=>setTab(3)}>{t.viewPlan}<ArrowRight size={16}/></button>
          </>:<div className="bsd-subempty"><FileSearch size={28}/>{t.choose}</div>}
        </section></div>
      </>}
    </div>}
    {tab===2&&<div className="bsd-stack"><div className="bsd-heading"><div><span className="bsd-overline bsd-dark">SOURCE HEALTH</span><h2>{t.tabs[2]}</h2><p>{t.sourceLimited}</p></div><button className="bsd-outline" onClick={run} disabled={busy}>{t.again}</button></div>
      {!report?<Empty t={t}/>:<section className="bsd-panel">{report.sources.map(s=><SourceRow key={s.id} src={s} vi={vi} expanded/>)}</section>}
    </div>}
    {tab===3&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">REPAIR PREFLIGHT · NO MUTATION</span><h2>{t.planTitle}</h2><p>{t.plansOverview}</p></div>
        <button type="button" className="bsd-outline" disabled={!reviewPlans.length||busy||staleScope} onClick={()=>saveDocket(report,reviewPlans)}><Download size={16}/>{t.docket}</button></div>
      {!report?<Empty t={t}/>:!reviewPlans.length?<div className="bsd-empty">{t.noPlan}</div>:<>
        <div className="bsd-review-summary"><ShieldCheck size={19}/><div><strong>{t.safety}</strong><span>{t.planCount}: {reviewPlans.length} · {t.inactive}</span></div></div>
        {staleScope&&<div className="bsd-banner"><AlertTriangle size={18}/><div><strong>{t.sourceIncomplete}</strong><p>{vi?'Phạm vi quét đã thay đổi. Hãy quét lại trước khi lập hồ sơ rà soát.':'Scope has changed. Rescan before preparing a review docket.'}</p></div></div>}
        <div className="bsd-two bsd-review-layout"><section className="bsd-panel bsd-issues-list">
          {reviewPlans.map(p=><button key={p.id} className={'bsd-issue-line '+(selectedPlan?.id===p.id?'selected':'')} type="button"
            onClick={()=>setSelected(report.issues.find(item=>item.id===p.id)||null)}>
            <span className={'bsd-severity '+(tone[p.severity]||'info')}></span>
            <span><strong>{vi?p.viTitle:p.enTitle}</strong><small>{p.className||'—'} · {p.code} · {p.eligibility==='blocked'?t.blocked:t.reviewable}</small></span>
            <ChevronRight size={16}/></button>)}
        </section><section className="bsd-panel bsd-plan-detail">
          <div className="bsd-panel-head"><h3>{t.preview}</h3><span className={'bsd-status '+(selectedPlan?.eligibility==='blocked'?'warn':'ok')}>{selectedPlan?.eligibility==='blocked'?t.blocked:t.reviewable}</span></div>
          {selectedPlan&&<><h3>{vi?selectedPlan.viTitle:selectedPlan.enTitle}</h3><p>{vi?selectedPlan.viSummary:selectedPlan.enSummary}</p>
            <div className="bsd-plan-meta"><span>{t.scope}: <strong>{selectedPlan.year} · {selectedPlan.className||'—'}</strong></span>
            <span>{vi?'Nguồn':'Source'}: <strong>{selectedPlan.source}</strong></span>
            <span>{t.sourceRevision}: <strong>{selectedPlan.sourceRevision?selectedPlan.sourceRevision.slice(0,19):'—'}</strong></span>
            <span>{vi?'Thời điểm quét':'Scanned'}: <strong>{datetime(selectedPlan.scanAt)}</strong></span></div>
            {selectedPlan.blockers.length>0&&<div className="bsd-plan-blockers"><strong><AlertTriangle size={15}/>{t.constraints}</strong>
              {selectedPlan.blockers.map((item,i)=><div key={i}>{item}</div>)}</div>}
            <h4>{t.steps}</h4><ol>{(vi?selectedPlan.viSteps:selectedPlan.enSteps).map(step=><li key={step}>{step}</li>)}</ol>
            <div className="bsd-advice"><LockKeyhole size={17}/><div><strong>{t.approval}</strong><p>{t.inactive}</p></div></div>
            {selected?.id===selectedPlan.id&&selected.evidence?.studentName&&
              <div className="bsd-student-evidence"><BookUser size={17}/><span><strong>{t.identity}:</strong> {selected.evidence.studentName}{selected.evidence.studentCode?' · '+selected.evidence.studentCode:''}</span></div>}
            <button type="button" className="bsd-outline bsd-review-link" disabled={busy||staleScope} onClick={()=>saveDocket(report,[selectedPlan])}>
              <Download size={16}/>{t.docket}</button>
            <section className="bsd-submit-panel">
              <h4>{t.submitReview}</h4><p>{t.reviewWarning}</p>
              <label htmlFor="bsd-review-note">{t.submitNote}</label>
              <textarea id="bsd-review-note" value={reviewNote} maxLength={600} onChange={e=>setReviewNote(e.target.value)}
                placeholder={t.safeNoPII} rows={3}/>
              <button className="bsd-primary" type="button" onClick={requestReview}
                disabled={reviewSubmitting||busy||staleScope||selectedPlan.eligibility!=='reviewable'||!selectedPlan.year||!selectedPlan.className||
                  (selectedPlan.code==='STUDENT_NOT_LINKED'&&(!selectedPlan.canonicalRevision||!selectedPlan.sourceRevision||
                    !report.issues.some(i=>i.id===selectedPlan.id&&i.evidence?.workspaceId)))}>
                <ShieldCheck size={16}/>{reviewSubmitting?(vi?'Đang gửi...':'Submitting...'):t.submitReview}
              </button>
              <small>{t.safeNoPII}</small>
            </section>
          </>}
        </section></div></>}
    </div>}
    {tab===4&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">SERVER AUDIT · HUMAN APPROVAL</span>
        <h2>{t.auditTitle}</h2><p>{t.auditDesc}</p></div>
        <button type="button" className="bsd-outline" onClick={refreshReviews} disabled={reviewLoading||reviewSubmitting}>
          <RefreshCw size={16}/>{reviewLoading?t.running:t.reloadQueue}</button></div>
      <div className="bsd-advice"><ShieldCheck size={17}/>{t.reviewWarning}</div>
      <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.reviewQueue}</h3><span>{reviewInbox.requests.length}</span></div>
        {!reviewInbox.requests.length?<div className="bsd-subempty">{t.reviewNone}</div>:
          reviewInbox.requests.map(item=>{
            const owned=item.requester_id===currentUser.id;
            const pending=item.status==='submitted';
            const canDecide=pending&&!owned;
            const target=reviewTarget===item.id;
            const statusText={submitted:t.statusSubmitted,approved_for_review:t.statusApproved,rejected:t.statusRejected,stale:t.statusStale,cancelled:t.statusCancelled}[item.status]||item.status;
            return <div key={item.id} className="bsd-request">
              <div className="bsd-request-main"><div><strong>{item.issue_code} · {item.class_name} · {item.school_year}</strong>
                <small>{item.source} · {datetime(item.submitted_at)} · {owned?t.requester:t.reviewer}</small>
                {item.note&&<p>{item.note}</p>}</div><span className={'bsd-status '+(pending?'warn':item.status==='approved_for_review'?'ok':'error')}>{statusText}</span></div>
              {item.reviewer_note&&<p className="bsd-reviewer-note">{t.decisionNote}: {item.reviewer_note}</p>}
              {item.status==='approved_for_review' && item.issue_code==='STUDENT_NOT_LINKED' &&
                (item.source==='gradebook'||item.source==='homeroom') && <div className="bsd-preflight">
                  <button type="button" className="bsd-outline" disabled={reviewSubmitting||!!preflightLoading}
                    onClick={()=>inspectRepair(item.id)}><FileSearch size={16}/>
                    {preflightLoading===item.id?t.running:t.dryRun}</button>
                  {preflightById[item.id]&&(()=>{
                    const p=preflightById[item.id];
                    const ready=p.state==='ready_for_manual_review';
                    return <div className={'bsd-preflight-result '+(ready?'ready':'blocked')}>
                      <strong><ShieldCheck size={16}/>{ready?t.readyPreview:p.state==='stale'?t.stalePreview:t.blockedPreview}</strong>
                      <p>{t.reasonLabel}: {p.reason||'—'}</p>
                      {ready&&<>
                        <div className="bsd-preflight-metrics">
                          <span>{t.currentCount}: <b>{p.beforeCount}</b></span>
                          <span>{t.proposedCount}: <b>{p.proposedCount}</b></span>
                        </div>
                        <p>{t.checksum}: <code>{String(p.targetChecksum||'').slice(0,16)}…</code></p>
                        <p>{t.backupMissing} · {t.noRollback}</p>
                      </>}
                      <small>{t.previewTime}: {datetime(p.checkedAt)} · {t.noExecution}</small>
                    </div>;
                  })()}
                </div>}
              {item.status==='approved_for_review'&&item.issue_code==='STUDENT_NOT_LINKED'&&
                item.source==='gradebook'&&item.reviewer_id===currentUser.id&&
                <section className="bsd-backup-panel">
                  <div className="bsd-backup-head"><ShieldCheck size={18}/><div><strong>{t.backupTitle}</strong>
                    <small>{t.backupUnavailable}</small></div></div>
                  <div className="bsd-backup-actions">
                    <button type="button" className="bsd-outline" onClick={()=>backupReview(item.id)}
                      disabled={!!backupLoading||!!reviewSubmitting}><Database size={16}/>{t.privateBackup}</button>
                    <button type="button" className="bsd-outline" onClick={()=>rehearseReview(item.id)}
                      disabled={!!backupLoading||!recoveryByRequest[item.id]?.backup}><RefreshCw size={16}/>{t.rehearsal}</button>
                  </div>
                  {recoveryByRequest[item.id]?.backup&&<div className="bsd-backup-result">
                    <CheckCircle2 size={17}/><div><strong>{t.backupReady}</strong>
                      <small>{t.backupTime}: {datetime(recoveryByRequest[item.id].backup.expiresAt)}</small></div></div>}
                  {recoveryByRequest[item.id]?.rehearsal&&<div className="bsd-backup-result">
                    <ShieldCheck size={17}/><div>
                      <strong>{recoveryByRequest[item.id].rehearsal.state==='rehearsal_passed'?t.rehearsalPassed:t.rehearsalFailed}</strong>
                      <small>{t.restoreNote}</small></div></div>}
                  <small>{t.retention} · {t.restoreNote}</small>
                </section>}
              {pending&&<div className="bsd-request-actions">
                {owned?<button type="button" className="bsd-outline" disabled={reviewSubmitting} onClick={()=>actionReview(item.id,'cancelled')}>
                  <X size={15}/>{t.cancelRequest}</button>:
                  <button type="button" className="bsd-outline" disabled={reviewSubmitting}
                    onClick={()=>{setReviewTarget(target?'':item.id);setDecisionNote('')}}>{t.reviewQueue}<ChevronRight size={15}/></button>}
              </div>}
              {canDecide&&target&&<div className="bsd-decision">
                <label htmlFor={'bsd-decision-'+item.id}>{t.decisionNote}</label>
                <textarea id={'bsd-decision-'+item.id} rows={3} maxLength={600} value={decisionNote}
                  onChange={e=>setDecisionNote(e.target.value)} placeholder={t.safeNoPII}/>
                <div><button className="bsd-primary" type="button" disabled={reviewSubmitting}
                  onClick={()=>actionReview(item.id,'approved_for_review')}><ShieldCheck size={15}/>{t.decideApprove}</button>
                  <button className="bsd-outline" type="button" disabled={reviewSubmitting||!decisionNote.trim()}
                    onClick={()=>actionReview(item.id,'rejected')}><X size={15}/>{t.decideReject}</button></div>
                <small>{t.reviewWarning}</small>
              </div>}
            </div>;
          })}
      </section>
      <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.serverAudit}</h3></div>
        {!reviewInbox.events.length?<div className="bsd-subempty">{t.auditNone}</div>:
          reviewInbox.events.map(event=><div className="bsd-history-line" key={event.id}><Clock3 size={17}/>
            <div><strong>{event.action} · {datetime(event.occurred_at)}</strong>
              <span>{event.request_id?.slice(0,8)} · {event.note||'—'}</span></div></div>)}
      </section>
      <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.sessionAudit}</h3></div>
        {history.length?history.map((h,i)=><div className="bsd-history-line" key={h.startedAt+i}><Clock3 size={17}/>
          <div><strong>{datetime(h.startedAt)}</strong><span>{h.schoolYear} · {h.className||t.all} · {h.count} {t.findings} · {h.coverage}</span></div></div>):
          <div className="bsd-subempty">{t.empty}</div>}
      </section>
    </div>}
    {tab===6&&<section className="bsd-panel bsd-monitor">
      <div className="bsd-panel-head"><div><span className="bsd-overline bsd-dark">AUTOMATED HEALTH · PRIVACY SAFE</span>
        <h2>{t.monitorTitle}</h2><p>{t.monitorSub}</p></div>
        <button type="button" className="bsd-outline" onClick={refreshMonitor} disabled={monitorLoading}>
          <RefreshCw size={16} className={monitorLoading?'bsd-spin':''}/>{t.monitorRefresh}</button></div>
      <div className="bsd-advice"><Info size={17}/>{t.monitorWarning}</div>
      {monitorError&&<div className="bsd-alert" role="alert">{monitorError}</div>}
      {!monitorRuns.length?<div className="bsd-subempty">{t.monitorEmpty}</div>:<>
        <div className="bsd-monitor-snapshot">
          {[
            [t.monitorClasses,monitorRuns[0].canonical_classes,BookUser],
            [t.monitorGradebooks,monitorRuns[0].gradebook_workspaces,ClipboardCheck],
            [t.monitorHomeroom,monitorRuns[0].homeroom_workspaces,Database],
            [t.monitorSuspects,monitorRuns[0].possible_missing_links,AlertTriangle],
            [t.monitorAffected,monitorRuns[0].affected_workspaces,FileSearch],
            [t.monitorCountDrift,monitorRuns[0].counter_mismatch_workspaces??'—',AlertTriangle]
          ].map(([label,value,Icon])=><div className="bsd-monitor-stat" key={label}>
            <Icon size={19}/><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <p className="bsd-monitor-checked"><Clock3 size={16}/>{t.monitorChecked}: {datetime(monitorRuns[0].checked_at)} · {monitorRuns[0].school_year}</p>
        <h3>{t.monitorHistory}</h3>
        <div className="bsd-monitor-history">
          {monitorRuns.map(r=><div key={r.id} className="bsd-monitor-row">
            <span><Clock3 size={16}/>{datetime(r.checked_at)}</span>
            <span>{r.school_year}</span>
            <span>{t.monitorSuspects}: <b>{r.possible_missing_links}</b></span>
            <span className={'bsd-status '+(r.status==='healthy'?'ok':'warn')}>{r.status}</span>
          </div>)}
        </div>
      </>}
      <div className="bsd-advice"><LockKeyhole size={16}/>{t.repairLocked}</div>
    </section>}
    {tab===5&&<section className="bsd-panel bsd-simple">
      <span className="bsd-overline bsd-dark">GOVERNANCE POLICY</span>
      <h2>{t.settingsTitle}</h2><p>{t.safetyText}</p>
      {t.settingsLines.map(line=><div className="bsd-policy" key={line}><ShieldCheck size={18}/>{line}</div>)}
      <div className="bsd-release-gates">
        <h3>{t.releaseGateTitle}</h3><p>{t.releaseGateSubtitle}</p>
        {[[t.releaseGateLocal,true],[t.releaseGateSqlPrepared,true],[t.releaseGateDb,true],[t.releaseGateAccounts,false]].map(([label,passed])=>
          <div className="bsd-release-gate" key={label}>
            {passed?<CheckCircle2 size={19} color="#24755c"/>:<LockKeyhole size={19} color="#99682d"/>}
            <span>{label}</span>
            <strong className={passed?'pass':'pending'}>{passed?t.releaseGatePass:t.releaseGatePending}</strong>
          </div>)}
        <div className="bsd-advice"><LockKeyhole size={17}/>{t.releaseGateHold}</div>
        <a className="bsd-evidence-link" href="https://github.com/anhtuan-hash/catrich2798/actions/runs/40194640091"
          target="_blank" rel="noopener noreferrer">{t.releaseGateEvidence}</a>
      </div>
    </section>}
  </div>;
}
function Empty({t}){return <section className="bsd-empty"><div><FileSearch size={32}/></div><h3>{t.empty}</h3><p>{t.emptyDesc}</p></section>;}
function SourceRow({src,vi,expanded=false}){const Icon=iconFor[src.id]||HardDrive;const label=statuses[src.status]?.[vi?0:1]||(vi?'Chưa xác định':'Unknown');
  return <div className="bsd-source-row"><span className="bsd-source-icon"><Icon size={20}/></span><div><strong>{vi?src.label:(sourceEn[src.id]||src.label)}</strong>{expanded&&<p>{src.message||(vi?'Dữ liệu được phân quyền theo tài khoản hiện tại.':'Visible under the active account only.')}</p>}</div>
    <span className={'bsd-status '+(src.status==='ok'?'ok':(src.status==='limited'||src.status==='empty')?'warn':'error')}>{label}</span><span className="bsd-count">{src.count??'—'}</span></div>;}
