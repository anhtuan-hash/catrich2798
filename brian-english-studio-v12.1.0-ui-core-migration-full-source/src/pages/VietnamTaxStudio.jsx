import React, { useMemo, useState } from 'react';
import './VietnamTaxStudio.css';

const LEGACY_BRACKETS = [
  { min: 0, max: 5_000_000, rate: 0.05 },
  { min: 5_000_000, max: 10_000_000, rate: 0.10 },
  { min: 10_000_000, max: 18_000_000, rate: 0.15 },
  { min: 18_000_000, max: 32_000_000, rate: 0.20 },
  { min: 32_000_000, max: 52_000_000, rate: 0.25 },
  { min: 52_000_000, max: 80_000_000, rate: 0.30 },
  { min: 80_000_000, max: null, rate: 0.35 },
];

const CURRENT_BRACKETS = [
  { min: 0, max: 10_000_000, rate: 0.05 },
  { min: 10_000_000, max: 30_000_000, rate: 0.10 },
  { min: 30_000_000, max: 60_000_000, rate: 0.20 },
  { min: 60_000_000, max: 100_000_000, rate: 0.30 },
  { min: 100_000_000, max: null, rate: 0.35 },
];

const DEDUCTIONS = {
  current: { personal: 15_500_000, dependent: 6_200_000 },
  historical: { personal: 11_000_000, dependent: 4_400_000 },
};

const REGIONAL_MIN_WAGE_2026 = {
  I: 5_310_000,
  II: 4_730_000,
  III: 4_140_000,
  IV: 3_700_000,
};

const REFERENCE_SALARY_2026 = 2_530_000;
const EMPLOYEE_RATES = { social: 0.08, health: 0.015, unemployment: 0.01 };

const copy = {
  vi: {
    back: 'Quay lại',
    eyebrow: 'VIETNAM TAX STUDIO · 2026',
    title: 'Tính thuế TNCN và lương thực nhận',
    subtitle: 'Mô phỏng lương Gross → Net, bảo hiểm bắt buộc và so sánh biểu thuế 7 bậc với biểu thuế 5 bậc áp dụng từ 01/07/2026.',
    currentLaw: 'Biểu thuế hiện hành 2026',
    print: 'In báo cáo',
    csv: 'Xuất CSV',
    reset: 'Đặt lại',
    inputTitle: 'Thông tin thu nhập',
    gross: 'Tổng thu nhập Gross / tháng',
    dependents: 'Số người phụ thuộc',
    region: 'Vùng lương tối thiểu',
    insuranceMode: 'Mức lương đóng bảo hiểm',
    fullSalary: 'Theo toàn bộ lương',
    customSalary: 'Nhập mức khác',
    customPlaceholder: 'Nhập mức lương đóng bảo hiểm',
    deductionMode: 'Mức giảm trừ gia cảnh',
    currentDeduction: 'Mức 2026',
    historicalDeduction: 'Mức lịch sử',
    note: 'Công cụ chỉ mang tính tham khảo; chưa bao gồm mọi khoản miễn giảm, phụ cấp, thu nhập không chịu thuế hoặc trường hợp quyết toán đặc biệt.',
    newNet: 'Lương Net theo biểu 5 bậc',
    taxSaving: 'Thuế giảm so với biểu 7 bậc',
    insurance: 'Bảo hiểm người lao động',
    taxable: 'Thu nhập tính thuế',
    compareTitle: 'So sánh kết quả',
    legacy: 'Biểu 7 bậc',
    current: 'Biểu 5 bậc',
    grossLabel: 'Gross',
    insuranceLabel: 'Bảo hiểm',
    taxLabel: 'Thuế TNCN',
    netLabel: 'Thực nhận',
    detailTitle: 'Chi tiết tính toán',
    item: 'Khoản mục',
    difference: 'Chênh lệch',
    personalDeduction: 'Giảm trừ bản thân',
    dependentDeduction: 'Giảm trừ người phụ thuộc',
    beforeTax: 'Thu nhập sau bảo hiểm',
    bracketTitle: 'Thuế theo từng bậc',
    level: 'Bậc',
    amount: 'Phần thu nhập trong bậc',
    rate: 'Thuế suất',
    tax: 'Thuế',
    curveTitle: 'Mức giảm thuế theo thu nhập Gross',
    curveSub: 'Đường mô phỏng dùng cùng số người phụ thuộc và mức giảm trừ đang chọn.',
    references: 'Căn cứ và lưu ý',
    sourceLaw: 'Luật Thuế thu nhập cá nhân 109/2025/QH15',
    sourceWage: 'Nghị định 293/2025/NĐ-CP về lương tối thiểu vùng',
    sourceInsurance: 'Thông tin mức tham chiếu BHXH từ 01/07/2026',
    originalCredit: 'Tích hợp và phát triển từ dự án mã nguồn mở Vietnam Tax Calculator của Viet Vu Danh.',
    monthly: '/ tháng',
    noTax: 'Không phát sinh thuế',
    saved: 'Tiết kiệm',
  },
  en: {
    back: 'Back',
    eyebrow: 'VIETNAM TAX STUDIO · 2026',
    title: 'Personal income tax and net salary calculator',
    subtitle: 'Estimate Gross → Net salary, mandatory insurance and compare the former 7-bracket scale with the 5-bracket scale effective 1 July 2026.',
    currentLaw: 'Current 2026 tax scale',
    print: 'Print report',
    csv: 'Export CSV',
    reset: 'Reset',
    inputTitle: 'Income details',
    gross: 'Monthly gross income',
    dependents: 'Dependents',
    region: 'Regional minimum wage',
    insuranceMode: 'Insurance salary base',
    fullSalary: 'Use full salary',
    customSalary: 'Custom base',
    customPlaceholder: 'Enter insurance salary base',
    deductionMode: 'Family deductions',
    currentDeduction: '2026 values',
    historicalDeduction: 'Historical values',
    note: 'For reference only. It does not cover every exemption, allowance, non-taxable income item or special finalisation case.',
    newNet: 'Net salary under 5 brackets',
    taxSaving: 'Tax reduction vs 7 brackets',
    insurance: 'Employee insurance',
    taxable: 'Taxable income',
    compareTitle: 'Result comparison',
    legacy: '7 brackets',
    current: '5 brackets',
    grossLabel: 'Gross',
    insuranceLabel: 'Insurance',
    taxLabel: 'PIT',
    netLabel: 'Net income',
    detailTitle: 'Calculation details',
    item: 'Item',
    difference: 'Difference',
    personalDeduction: 'Personal deduction',
    dependentDeduction: 'Dependent deduction',
    beforeTax: 'Income after insurance',
    bracketTitle: 'Tax by bracket',
    level: 'Level',
    amount: 'Income in bracket',
    rate: 'Rate',
    tax: 'Tax',
    curveTitle: 'Tax reduction across gross income',
    curveSub: 'The curve uses the same dependents and deduction setting selected above.',
    references: 'Legal references and notes',
    sourceLaw: 'Personal Income Tax Law 109/2025/QH15',
    sourceWage: 'Decree 293/2025/ND-CP on regional minimum wages',
    sourceInsurance: 'Social-insurance reference salary from 1 July 2026',
    originalCredit: 'Integrated and adapted from Viet Vu Danh’s open-source Vietnam Tax Calculator project.',
    monthly: '/ month',
    noTax: 'No tax due',
    saved: 'Saved',
  },
};

function parseMoney(value) {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function money(value, compact = false) {
  const amount = Number(value || 0);
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function formatInput(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function calculateInsurance(salaryBase, region) {
  const socialHealthCap = 20 * REFERENCE_SALARY_2026;
  const unemploymentCap = 20 * REGIONAL_MIN_WAGE_2026[region];
  const socialBase = Math.min(salaryBase, socialHealthCap);
  const unemploymentBase = Math.min(salaryBase, unemploymentCap);
  const social = socialBase * EMPLOYEE_RATES.social;
  const health = socialBase * EMPLOYEE_RATES.health;
  const unemployment = unemploymentBase * EMPLOYEE_RATES.unemployment;
  return {
    salaryBase,
    socialBase,
    unemploymentBase,
    social,
    health,
    unemployment,
    total: social + health + unemployment,
  };
}

function calculateProgressiveTax(taxableIncome, brackets) {
  let total = 0;
  const breakdown = [];
  for (let index = 0; index < brackets.length; index += 1) {
    const bracket = brackets[index];
    const upper = bracket.max ?? Number.POSITIVE_INFINITY;
    const amountInBracket = Math.max(0, Math.min(taxableIncome, upper) - bracket.min);
    if (amountInBracket <= 0) continue;
    const tax = amountInBracket * bracket.rate;
    total += tax;
    breakdown.push({ level: index + 1, amount: amountInBracket, rate: bracket.rate, tax });
  }
  return { total, breakdown };
}

function calculateScenario({ gross, dependents, insuranceSalary, region, deductions, brackets }) {
  const effectiveInsuranceSalary = Math.min(Math.max(0, insuranceSalary), Math.max(0, gross));
  const insurance = calculateInsurance(effectiveInsuranceSalary, region);
  const incomeAfterInsurance = Math.max(0, gross - insurance.total);
  const totalDependentDeduction = dependents * deductions.dependent;
  const taxableIncome = Math.max(0, incomeAfterInsurance - deductions.personal - totalDependentDeduction);
  const taxResult = calculateProgressiveTax(taxableIncome, brackets);
  return {
    gross,
    insurance,
    incomeAfterInsurance,
    personalDeduction: deductions.personal,
    dependentDeduction: totalDependentDeduction,
    taxableIncome,
    tax: taxResult.total,
    net: gross - insurance.total - taxResult.total,
    breakdown: taxResult.breakdown,
  };
}

function MiniComparisonBars({ legacy, current, labels }) {
  const maxValue = Math.max(legacy, current, 1);
  const currentWidth = Math.max(3, (current / maxValue) * 100);
  const legacyWidth = Math.max(3, (legacy / maxValue) * 100);
  return (
    <div className="tax-studio-bar-set">
      <div className="tax-studio-bar-row">
        <span>{labels.legacy}</span>
        <div><i className="legacy" style={{ width: `${legacyWidth}%` }} /></div>
        <strong>{money(legacy)}</strong>
      </div>
      <div className="tax-studio-bar-row">
        <span>{labels.current}</span>
        <div><i className="current" style={{ width: `${currentWidth}%` }} /></div>
        <strong>{money(current)}</strong>
      </div>
    </div>
  );
}

function SavingsCurve({ points }) {
  const width = 720;
  const height = 250;
  const pad = 34;
  const maxY = Math.max(...points.map((item) => item.saving), 1);
  const maxX = Math.max(...points.map((item) => item.gross), 1);
  const mapX = (value) => pad + (value / maxX) * (width - pad * 2);
  const mapY = (value) => height - pad - (value / maxY) * (height - pad * 2);
  const path = points.map((item, index) => `${index ? 'L' : 'M'} ${mapX(item.gross)} ${mapY(item.saving)}`).join(' ');
  const area = `${path} L ${mapX(points.at(-1)?.gross || 0)} ${height - pad} L ${mapX(points[0]?.gross || 0)} ${height - pad} Z`;
  return (
    <div className="tax-studio-curve-wrap" role="img" aria-label="Tax savings curve">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="taxSavingArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tax-green)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--tax-green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={pad} x2={width - pad} y1={pad + (height - pad * 2) * ratio} y2={pad + (height - pad * 2) * ratio} className="tax-studio-grid-line" />
        ))}
        <path d={area} fill="url(#taxSavingArea)" />
        <path d={path} className="tax-studio-curve-line" />
        {points.filter((_, index) => index % 4 === 0 || index === points.length - 1).map((item) => (
          <circle key={item.gross} cx={mapX(item.gross)} cy={mapY(item.saving)} r="4" className="tax-studio-curve-dot" />
        ))}
        <text x={pad} y={height - 8} className="tax-studio-axis-label">10 tr</text>
        <text x={width - pad} y={height - 8} textAnchor="end" className="tax-studio-axis-label">200 tr Gross</text>
        <text x={pad} y={18} className="tax-studio-axis-label">{money(maxY, true)}</text>
      </svg>
    </div>
  );
}

export default function VietnamTaxStudio({ language = 'vi' }) {
  const t = copy[language] || copy.vi;
  const [grossText, setGrossText] = useState('50.000.000');
  const [dependents, setDependents] = useState(0);
  const [region, setRegion] = useState('I');
  const [insuranceMode, setInsuranceMode] = useState('gross');
  const [insuranceText, setInsuranceText] = useState('20.000.000');
  const [deductionMode, setDeductionMode] = useState('current');

  const gross = parseMoney(grossText);
  const customInsurance = parseMoney(insuranceText);
  const insuranceSalary = insuranceMode === 'gross' ? gross : customInsurance;
  const deductions = DEDUCTIONS[deductionMode];

  const results = useMemo(() => {
    const args = { gross, dependents, insuranceSalary, region, deductions };
    const legacy = calculateScenario({ ...args, brackets: LEGACY_BRACKETS });
    const current = calculateScenario({ ...args, brackets: CURRENT_BRACKETS });
    return { legacy, current, saving: Math.max(0, legacy.tax - current.tax) };
  }, [gross, dependents, insuranceSalary, region, deductions]);

  const curvePoints = useMemo(() => {
    return Array.from({ length: 20 }, (_, index) => 10_000_000 + index * 10_000_000).map((sampleGross) => {
      const sampleInsuranceSalary = insuranceMode === 'gross' ? sampleGross : customInsurance;
      const args = { gross: sampleGross, dependents, insuranceSalary: sampleInsuranceSalary, region, deductions };
      const legacy = calculateScenario({ ...args, brackets: LEGACY_BRACKETS });
      const current = calculateScenario({ ...args, brackets: CURRENT_BRACKETS });
      return { gross: sampleGross, saving: Math.max(0, legacy.tax - current.tax) };
    });
  }, [dependents, insuranceMode, customInsurance, region, deductions]);

  const rows = [
    [t.grossLabel, results.legacy.gross, results.current.gross],
    [t.insuranceLabel, results.legacy.insurance.total, results.current.insurance.total],
    [t.beforeTax, results.legacy.incomeAfterInsurance, results.current.incomeAfterInsurance],
    [t.personalDeduction, results.legacy.personalDeduction, results.current.personalDeduction],
    [t.dependentDeduction, results.legacy.dependentDeduction, results.current.dependentDeduction],
    [t.taxable, results.legacy.taxableIncome, results.current.taxableIncome],
    [t.taxLabel, results.legacy.tax, results.current.tax],
    [t.netLabel, results.legacy.net, results.current.net],
  ];

  const reset = () => {
    setGrossText('50.000.000');
    setDependents(0);
    setRegion('I');
    setInsuranceMode('gross');
    setInsuranceText('20.000.000');
    setDeductionMode('current');
  };

  const exportCsv = () => {
    const csvRows = [
      ['Khoản mục', 'Biểu 7 bậc', 'Biểu 5 bậc', 'Chênh lệch'],
      ...rows.map(([label, legacy, current]) => [label, Math.round(legacy), Math.round(current), Math.round(current - legacy)]),
    ];
    const csv = `\uFEFF${csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Vietnam_Tax_Studio_2026.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMoneyInput = (setter) => (event) => {
    setter(formatInput(parseMoney(event.target.value)));
  };

  return (
    <div className="tax-studio-page">
      <div className="tax-studio-rail">
        <button className="tax-studio-back" type="button" onClick={() => window.history.back()}>← {t.back}</button>

        <section className="tax-studio-hero">
          <div className="tax-studio-hero-copy">
            <span className="tax-studio-eyebrow">{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            <div className="tax-studio-badges">
              <span>✓ {t.currentLaw}</span>
              <span>5 bậc · 15,5 / 6,2 triệu</span>
              <span>BHXH tham chiếu 2,53 triệu</span>
            </div>
          </div>
          <div className="tax-studio-hero-art" aria-hidden="true">
            <div className="tax-studio-receipt">
              <span>GROSS</span><strong>{money(gross, true)}</strong>
              <i />
              <span>NET</span><strong>{money(results.current.net, true)}</strong>
              <em>{t.saved}: {money(results.saving, true)}</em>
            </div>
            <div className="tax-studio-coins"><b>₫</b><b>₫</b><b>₫</b></div>
          </div>
          <div className="tax-studio-hero-actions">
            <button type="button" onClick={() => window.print()}>▣ {t.print}</button>
            <button type="button" onClick={exportCsv}>⇩ {t.csv}</button>
            <button type="button" onClick={reset}>↻ {t.reset}</button>
          </div>
        </section>

        <section className="tax-studio-main-grid">
          <aside className="tax-studio-input-card">
            <div className="tax-studio-card-heading">
              <span>01</span>
              <div><small>INPUT</small><h2>{t.inputTitle}</h2></div>
            </div>

            <label className="tax-studio-field">
              <span>{t.gross}</span>
              <div className="tax-studio-money-input">
                <input value={grossText} onChange={handleMoneyInput(setGrossText)} inputMode="numeric" />
                <b>VND</b>
              </div>
            </label>

            <div className="tax-studio-field">
              <span>{t.dependents}</span>
              <div className="tax-studio-counter">
                <button type="button" onClick={() => setDependents(Math.max(0, dependents - 1))}>−</button>
                <input type="number" min="0" value={dependents} onChange={(event) => setDependents(Math.max(0, Number(event.target.value) || 0))} />
                <button type="button" onClick={() => setDependents(dependents + 1)}>+</button>
              </div>
            </div>

            <div className="tax-studio-field">
              <span>{t.region}</span>
              <div className="tax-studio-region-grid">
                {Object.entries(REGIONAL_MIN_WAGE_2026).map(([key, value]) => (
                  <button key={key} type="button" className={region === key ? 'active' : ''} onClick={() => setRegion(key)}>
                    <strong>Vùng {key}</strong><small>{money(value, true)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="tax-studio-field">
              <span>{t.insuranceMode}</span>
              <div className="tax-studio-segmented">
                <button type="button" className={insuranceMode === 'gross' ? 'active' : ''} onClick={() => setInsuranceMode('gross')}>{t.fullSalary}</button>
                <button type="button" className={insuranceMode === 'custom' ? 'active' : ''} onClick={() => setInsuranceMode('custom')}>{t.customSalary}</button>
              </div>
              {insuranceMode === 'custom' ? (
                <div className="tax-studio-money-input compact">
                  <input value={insuranceText} onChange={handleMoneyInput(setInsuranceText)} inputMode="numeric" placeholder={t.customPlaceholder} />
                  <b>VND</b>
                </div>
              ) : null}
              <small className="tax-studio-help">BHXH/BHYT trần: {money(20 * REFERENCE_SALARY_2026)} · BHTN trần vùng {region}: {money(20 * REGIONAL_MIN_WAGE_2026[region])}</small>
            </div>

            <div className="tax-studio-field">
              <span>{t.deductionMode}</span>
              <div className="tax-studio-segmented">
                <button type="button" className={deductionMode === 'current' ? 'active' : ''} onClick={() => setDeductionMode('current')}>{t.currentDeduction}</button>
                <button type="button" className={deductionMode === 'historical' ? 'active' : ''} onClick={() => setDeductionMode('historical')}>{t.historicalDeduction}</button>
              </div>
              <small className="tax-studio-help">{money(deductions.personal)} + {money(deductions.dependent)} × {dependents}</small>
            </div>

            <div className="tax-studio-warning">⚠ {t.note}</div>
          </aside>

          <div className="tax-studio-results-column">
            <div className="tax-studio-stat-grid">
              <article><span>NET</span><strong>{money(results.current.net)}</strong><small>{t.newNet}</small></article>
              <article className="positive"><span>− TAX</span><strong>{money(results.saving)}</strong><small>{t.taxSaving}</small></article>
              <article><span>BH</span><strong>{money(results.current.insurance.total)}</strong><small>{t.insurance}</small></article>
              <article><span>TNTT</span><strong>{money(results.current.taxableIncome)}</strong><small>{t.taxable}</small></article>
            </div>

            <section className="tax-studio-panel tax-studio-compare-panel">
              <div className="tax-studio-panel-title"><div><small>02 · COMPARE</small><h2>{t.compareTitle}</h2></div><span>{results.saving > 0 ? `↓ ${money(results.saving)}` : t.noTax}</span></div>
              <div className="tax-studio-compare-grid">
                <div><h3>{t.taxLabel}</h3><MiniComparisonBars legacy={results.legacy.tax} current={results.current.tax} labels={t} /></div>
                <div><h3>{t.netLabel}</h3><MiniComparisonBars legacy={results.legacy.net} current={results.current.net} labels={t} /></div>
              </div>
            </section>

            <section className="tax-studio-panel">
              <div className="tax-studio-panel-title"><div><small>03 · BREAKDOWN</small><h2>{t.detailTitle}</h2></div></div>
              <div className="tax-studio-table-wrap">
                <table>
                  <thead><tr><th>{t.item}</th><th>{t.legacy}</th><th>{t.current}</th><th>{t.difference}</th></tr></thead>
                  <tbody>
                    {rows.map(([label, legacy, current]) => (
                      <tr key={label} className={label === t.netLabel ? 'highlight' : ''}>
                        <th>{label}</th><td>{money(legacy)}</td><td>{money(current)}</td><td className={current - legacy >= 0 ? 'positive-cell' : 'negative-cell'}>{current - legacy >= 0 ? '+' : ''}{money(current - legacy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>

        <section className="tax-studio-lower-grid">
          <section className="tax-studio-panel">
            <div className="tax-studio-panel-title"><div><small>04 · TREND</small><h2>{t.curveTitle}</h2><p>{t.curveSub}</p></div></div>
            <SavingsCurve points={curvePoints} />
          </section>

          <section className="tax-studio-panel">
            <div className="tax-studio-panel-title"><div><small>05 · BRACKETS</small><h2>{t.bracketTitle}</h2></div></div>
            <div className="tax-studio-bracket-columns">
              {[
                { label: t.legacy, result: results.legacy, brackets: LEGACY_BRACKETS, tone: 'legacy' },
                { label: t.current, result: results.current, brackets: CURRENT_BRACKETS, tone: 'current' },
              ].map((group) => (
                <div key={group.label} className={`tax-studio-bracket-card ${group.tone}`}>
                  <h3>{group.label}</h3>
                  <div className="tax-studio-table-wrap compact-table">
                    <table>
                      <thead><tr><th>{t.level}</th><th>{t.amount}</th><th>{t.rate}</th><th>{t.tax}</th></tr></thead>
                      <tbody>
                        {group.result.breakdown.length ? group.result.breakdown.map((item) => (
                          <tr key={item.level}><td>{item.level}</td><td>{money(item.amount)}</td><td>{Math.round(item.rate * 100)}%</td><td>{money(item.tax)}</td></tr>
                        )) : <tr><td colSpan="4">{t.noTax}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="tax-studio-reference-panel">
          <div><small>06 · SOURCES</small><h2>{t.references}</h2><p>{t.originalCredit}</p></div>
          <div className="tax-studio-source-links">
            <a href="https://vbpl.moj.gov.vn/TW/Pages/vbpq-van-ban-goc.aspx?ItemID=187045&Keyword=" target="_blank" rel="noreferrer">↗ {t.sourceLaw}</a>
            <a href="https://vanban.chinhphu.vn/?docid=215832&pageid=27160" target="_blank" rel="noreferrer">↗ {t.sourceWage}</a>
            <a href="https://baohiemxahoi.gov.vn/tintuc/Pages/hoat-dong-he-thong-bao-hiem-xa-hoi.aspx?CateID=52&ItemID=26780" target="_blank" rel="noreferrer">↗ {t.sourceInsurance}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
