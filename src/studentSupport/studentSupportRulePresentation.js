function configOf(rule) {
  return rule?.config && typeof rule.config === 'object' ? rule.config : {};
}

export function describeRuleConfig(rule = {}, language = 'vi') {
  const vi = language === 'vi';
  const type = String(rule.rule_type || rule.ruleType || '').trim();
  const config = configOf(rule);
  if (type === 'attendance_count') {
    const status = String(config.status || '').toLowerCase();
    const statusLabel = status === 'absent' ? (vi ? 'vắng' : 'absence') : status === 'late' ? (vi ? 'đi trễ' : 'late') : status || (vi ? 'trạng thái' : 'status');
    return vi
      ? `Ít nhất ${Number(config.threshold || 1)} lần ${statusLabel} trong ${Number(config.days || 14)} ngày.`
      : `At least ${Number(config.threshold || 1)} ${statusLabel} records within ${Number(config.days || 14)} days.`;
  }
  if (type === 'grade_window_drop') {
    const size = Number(config.sampleSize || 3);
    const delta = Number(config.delta || 1);
    return vi
      ? `So sánh trung bình ${size} điểm gần nhất với ${size} điểm liền trước; kích hoạt khi giảm từ ${delta} điểm.`
      : `Compare the latest ${size} scores with the preceding ${size}; trigger when the average drops by at least ${delta}.`;
  }
  if (type === 'consecutive_scores_below') {
    return vi
      ? `${Number(config.count || config.sampleSize || 3)} điểm gần nhất đều dưới ${Number(config.threshold || 5)}.`
      : `The latest ${Number(config.count || config.sampleSize || 3)} scores are all below ${Number(config.threshold || 5)}.`;
  }
  if (type === 'observation_count') {
    return vi
      ? `Ít nhất ${Number(config.threshold || 1)} ghi nhận ${String(config.observationType || config.type || '').trim()} trong ${Number(config.days || 14)} ngày.`
      : `At least ${Number(config.threshold || 1)} ${String(config.observationType || config.type || '').trim()} observations within ${Number(config.days || 14)} days.`;
  }
  if (type === 'combined_all') {
    const count = Array.isArray(config.rules) ? config.rules.length : 0;
    return vi ? `Tất cả ${count} điều kiện thành phần phải đồng thời đúng.` : `All ${count} component conditions must be true.`;
  }
  return vi ? 'Quy tắc xác định.' : 'Deterministic rule.';
}
