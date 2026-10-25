// Brian Sync Doctor preflight: recommendations ONLY. Never create mutation payloads.
const txt = value => String(value ?? '').trim();
const severe = new Set(['IDENTITY_DUPLICATE','STUDENT_CODE_DUPLICATE','IDENTITY_MISSING','MULTIPLE_LOCAL_MATCHES','AMBIGUOUS_IDENTITY']);
const sourceFor = (issue) => txt(issue?.evidence?.source || (
  ['IDENTITY_DUPLICATE','STUDENT_CODE_DUPLICATE','IDENTITY_MISSING'].includes(issue?.code) ? 'canonical' : ''
));
const definitions = {
  STUDENT_NOT_LINKED: {
    category:'association',vi:'Đối chiếu liên kết học sinh',en:'Student association review',
    viSummary:'Kiểm tra hồ sơ danh sách chuẩn và bản ghi lớp ở phân hệ đích. Nếu cùng một học sinh, chuẩn bị yêu cầu bổ sung liên kết mà không thay đổi khóa điểm cũ.',
    enSummary:'Compare canonical student and target workspace. A verified association must preserve existing local score keys.',
    viSteps:['Đối chiếu mã định danh chuẩn và mã học sinh','Kiểm tra bản ghi đích, điểm và lịch sử hiện có','Tạo bản xem trước riêng từng hồ sơ','Yêu cầu người có quyền phê duyệt'],
    enSteps:['Verify canonical identity and student code','Inspect destination record, scores and history','Preview a single-student association','Submit for authorized approval'],
  },
  CANONICAL_NOT_VISIBLE:{
    category:'source',vi:'Xác minh nguồn danh sách chuẩn',en:'Verify canonical roster source',
    viSummary:'Phân biệt lớp chưa được tạo với lớp bị giới hạn quyền. Không tự tạo bản ghi danh sách chuẩn.',
    enSummary:'Distinguish missing roster creation from authorization limits. Do not create canonical rosters automatically.',
    viSteps:['Xác minh lớp và năm học','Đối chiếu quyền trên nguồn danh sách chuẩn','Kiểm tra lịch sử trước khi đề xuất tạo mới'],
    enSteps:['Verify class and year','Verify read access to canonical source','Inspect source history before proposing a new roster']
  },
  ASSESSMENT_LINK_REVIEW:{
    category:'historical',vi:'Đối chiếu kết quả kiểm tra',en:'Assessment record review',
    viSummary:'Đối chiếu alias/mã học sinh lịch sử và kết quả đánh giá; không đổi khóa student_ref và không sửa điểm.',
    enSummary:'Cross-check legacy student aliases and historical results without modifying score values or student_ref.',
    viSteps:['Kiểm tra các alias lịch sử','Xác nhận kết quả của đúng học sinh','Không can thiệp bảng kết quả đánh giá'],
    enSteps:['Inspect legacy student aliases','Confirm historical result ownership','Do not alter assessment results']
  },
  LOCAL_QUEUE_PENDING:{
    category:'device',vi:'Kiểm tra hàng đợi cục bộ',en:'Local queue review',
    viSummary:'Dữ liệu đang chờ chỉ thuộc thiết bị này. Mở ứng dụng gốc để kiểm tra và gửi lại bằng quy trình hiện có.',
    enSummary:'Pending tasks belong to this browser only. Inspect and retry through the originating app.',
    viSteps:['Kiểm tra trạng thái mạng và phiên đăng nhập','So sánh bản ghi đang chờ với dữ liệu Cloud','Thử đồng bộ qua ứng dụng đã tạo bản ghi'],
    enSteps:['Verify connectivity and login','Compare pending changes against Cloud','Retry via originating application']
  },
  SOURCE_UNVERIFIED:{
    category:'availability',vi:'Kiểm tra kết nối và quyền',en:'Access / connection review',
    viSummary:'Nguồn không đọc được. Không được xem dữ liệu rỗng là kết quả đối soát thành công.',
    enSummary:'Source could not be read. Missing data must not be interpreted as a successful reconciliation.',
    viSteps:['Kiểm tra thông báo lỗi của nguồn','Xác minh quyền và phiên đăng nhập','Quét lại sau khi kết nối ổn định'],
    enSteps:['Inspect source error','Verify session and authorization','Rescan after restoring connectivity']
  },
  SOURCE_COVERAGE_PARTIAL:{
    category:'scope',vi:'Thu hẹp phạm vi quét',en:'Narrow scan scope',
    viSummary:'Số bản ghi lớn hơn giới hạn quét. Chọn một lớp để tránh kết luận sai do dữ liệu chưa đầy đủ.',
    enSummary:'Scan page limit reached. Use a narrower class scope before interpreting results.',
    viSteps:['Chọn tên lớp cụ thể','Quét lại toàn bộ nguồn trong phạm vi đó'],
    enSteps:['Choose a specific class','Rescan all sources within that scope']
  },
  SOURCE_NO_VISIBLE_ROWS:{
    category:'scope',vi:'Kiểm tra nguồn không có bản ghi nhìn thấy',en:'Check empty visible source',
    viSummary:'Không nhìn thấy bản ghi thuộc phạm vi quét; có thể chưa phát sinh dữ liệu hoặc quyền đang giới hạn.',
    enSummary:'No rows are visible in scope; source could be empty or restricted.',
    viSteps:['Xác nhận lớp có dữ liệu ở ứng dụng gốc','Kiểm tra quyền nhìn thấy nguồn','Không tự tạo bản sao'],
    enSteps:['Check originating application','Confirm source visibility','Do not create a replacement copy']
  }
};
const defaultDefinition={
  category:'identity',vi:'Xác minh định danh thủ công',en:'Manual identity verification',
  viSummary:'Có nguy cơ gộp nhầm hoặc làm mất liên kết hồ sơ. Phải xác minh thủ công với bản ghi gốc; không tự xóa hay hợp nhất.',
  enSummary:'Potential identity collision. Verify original records manually; never merge or delete automatically.',
  viSteps:['Kiểm tra mã định danh và nguồn gốc hồ sơ','Kiểm tra bản ghi điểm, lưu trữ và kết quả cũ','Đưa vào quy trình phê duyệt độc lập'],
  enSteps:['Verify identities and provenance','Inspect scores, archived records and historical results','Request independent approval']
};
export function createSyncReviewPlan(issue, report) {
  if(!issue?.code || !report?.finishedAt) return null;
  const def=definitions[issue.code] || defaultDefinition;
  const origin=sourceFor(issue), sources=Array.isArray(report.sources)?report.sources:[];
  const checked=origin ? sources.find(item=>item.id===origin) : null;
  const canonical=sources.find(item=>item.id==='canonical');
  const sourceVerified = !origin || checked?.status==='ok';
  const canonicalVerified = !['STUDENT_NOT_LINKED','ASSESSMENT_LINK_REVIEW','CANONICAL_NOT_VISIBLE'].includes(issue.code)
    || canonical?.status==='ok';
  const eligibleForManualReview=sourceVerified && canonicalVerified && !severe.has(issue.code);
  const blockers=[
    ...(!sourceVerified?[ 'Chưa xác minh được nguồn đích / Source not verified' ]:[]),
    ...(!canonicalVerified?[ 'Chưa xác minh nguồn danh sách chuẩn / Canonical source not verified' ]:[]),
    ...(severe.has(issue.code)?[ 'Rủi ro định danh: bắt buộc đối chiếu thủ công / Identity risk' ]:[]),
  ];
  const affectedCount = issue.code==='STUDENT_NOT_LINKED' ? 1 : null;
  return Object.freeze({
    id:issue.id,code:issue.code,severity:issue.severity,category:def.category,
    source:origin || 'multiple',year:txt(issue.year),className:txt(issue.className),
    viTitle:def.vi,enTitle:def.en,viSummary:def.viSummary,enSummary:def.enSummary,
    viSteps:[...def.viSteps],enSteps:[...def.enSteps],
    affectedCount,requiresIndependentApproval:true,
    eligibility:eligibleForManualReview?'reviewable':'blocked',blockers,
    scanAt:report.finishedAt,sourceRevision:txt(issue.evidence?.sourceRevision),
    canonicalRevision:txt(issue.evidence?.canonicalRevision),
    // Deliberately no mutations, record contents, server tokens, or unredacted student fields.
    executionEnabled:false,readOnly:true,requiresFreshScan:true,
  });
}
export function buildSyncReviewPlans(report) {
  if(!Array.isArray(report?.issues)) return [];
  return report.issues.map(issue=>createSyncReviewPlan(issue,report)).filter(Boolean);
}
export function serializeSyncReviewDocket(report,plans) {
  // Export only non-identifying metadata; report and in-memory evidence stay in the authenticated UI.
  return JSON.stringify({
    document:'Brian Sync Doctor — Review Docket',
    version:'1.1.0',readOnly:true,executionEnabled:false,
    schoolYear:txt(report?.schoolYear),scopeClass:txt(report?.className),
    scannedAt:txt(report?.finishedAt),completeness:txt(report?.completeness),
    plans:(Array.isArray(plans)?plans:[]).map(p=>({
      code:p.code,severity:p.severity,className:p.className,year:p.year,
      source:p.source,eligibility:p.eligibility,blockers:p.blockers,
      category:p.category,requiresIndependentApproval:true,
      executionEnabled:false
    })),
  },null,2);
}
