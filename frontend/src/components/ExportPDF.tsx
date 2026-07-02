import type { ResumeResult } from '../types';

/**
 * Feature 4: Export Resume Analysis as PDF Report
 *
 * Generates a styled HTML document and uses the browser's print-to-PDF
 * functionality for a polished, downloadable report — no external dependencies.
 */
export function exportAnalysisPDF(result: ResumeResult) {
  const scoreColor =
    (result.overall_score ?? 0) >= 80
      ? '#4ade80'
      : (result.overall_score ?? 0) >= 60
      ? '#facc15'
      : '#f87171';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resume Analysis — ${result.name ?? 'Unknown'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 32px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #8b5cf6, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .date {
      font-size: 12px;
      color: #94a3b8;
    }

    .candidate-info {
      margin-bottom: 28px;
    }
    .candidate-name {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }
    .candidate-details {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    .score-section {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 32px;
      padding: 20px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .score-ring {
      position: relative;
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }
    .score-ring svg { transform: rotate(-90deg); }
    .score-number {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: ${scoreColor};
    }
    .verdict {
      flex: 1;
    }
    .verdict h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .verdict p {
      font-size: 13px;
      color: #475569;
      line-height: 1.7;
    }

    h2 {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    .section { margin-bottom: 28px; }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-tag {
      padding: 4px 10px;
      border-radius: 100px;
      background: #ede9fe;
      color: #6d28d9;
      font-size: 11px;
      font-weight: 500;
    }

    .section-feedback-card {
      padding: 14px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .sf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .sf-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .sf-score { font-size: 13px; font-weight: 700; }
    .sf-bar {
      height: 4px;
      border-radius: 2px;
      background: #e2e8f0;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .sf-bar-fill { height: 100%; border-radius: 2px; }
    .sf-items { font-size: 11px; color: #64748b; line-height: 1.8; }
    .sf-strength { color: #16a34a; }
    .sf-weakness { color: #d97706; }

    .suggestion-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
    }
    .suggestion-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ede9fe;
      color: #7c3aed;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .ats-tip {
      font-size: 12px;
      color: #0369a1;
      margin-bottom: 4px;
    }

    .missing-kw {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .kw-tag {
      padding: 4px 10px;
      border-radius: 100px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 11px;
      font-weight: 500;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }

    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <span class="brand-name">ResuFlow</span>
    </div>
    <span class="date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>

  <div class="candidate-info">
    <div class="candidate-name">${result.name ?? 'Resume Analysis Report'}</div>
    <div class="candidate-details">
      ${[result.email, result.phone, result.experience_years ? `${result.experience_years} years experience` : null]
        .filter(Boolean)
        .join(' · ')}
    </div>
  </div>

  ${
    result.overall_score != null
      ? `
  <div class="score-section">
    <div class="score-ring">
      <svg width="80" height="80">
        <circle cx="40" cy="40" r="34" stroke="#e2e8f0" stroke-width="5" fill="none"/>
        <circle cx="40" cy="40" r="34" stroke="${scoreColor}" stroke-width="5" fill="none"
          stroke-linecap="round"
          stroke-dasharray="${2 * Math.PI * 34}"
          stroke-dashoffset="${2 * Math.PI * 34 - (result.overall_score / 100) * 2 * Math.PI * 34}"/>
      </svg>
      <div class="score-number">${result.overall_score}</div>
    </div>
    <div class="verdict">
      <h3>Overall Verdict</h3>
      <p>${result.summary_verdict ?? 'No verdict available.'}</p>
    </div>
  </div>`
      : ''
  }

  ${
    result.summary
      ? `
  <div class="section">
    <h2>Professional Summary</h2>
    <p style="font-size:13px;color:#475569;">${result.summary}</p>
  </div>`
      : ''
  }

  ${
    result.skills && result.skills.length > 0
      ? `
  <div class="section">
    <h2>Skills</h2>
    <div class="skills-list">
      ${result.skills.map((s) => `<span class="skill-tag">${s}</span>`).join('')}
    </div>
  </div>`
      : ''
  }

  ${
    result.section_feedback && result.section_feedback.length > 0
      ? `
  <div class="section">
    <h2>Section Scores</h2>
    ${result.section_feedback
      .map(
        (sf) => `
    <div class="section-feedback-card">
      <div class="sf-header">
        <span class="sf-name">${sf.section}</span>
        <span class="sf-score" style="color:${sf.score >= 80 ? '#16a34a' : sf.score >= 60 ? '#d97706' : '#dc2626'}">${sf.score}/100</span>
      </div>
      <div class="sf-bar">
        <div class="sf-bar-fill" style="width:${sf.score}%;background:${sf.score >= 80 ? '#4ade80' : sf.score >= 60 ? '#facc15' : '#f87171'}"></div>
      </div>
      <div class="sf-items">
        ${sf.strengths.map((s) => `<div class="sf-strength">✓ ${s}</div>`).join('')}
        ${sf.weaknesses.map((w) => `<div class="sf-weakness">△ ${w}</div>`).join('')}
      </div>
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  ${
    result.suggestions && result.suggestions.length > 0
      ? `
  <div class="section">
    <h2>Suggestions</h2>
    ${result.suggestions
      .map(
        (s, i) => `
    <div class="suggestion-item">
      <span class="suggestion-num">${i + 1}</span>
      <span>${s}</span>
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  ${
    result.ats_tips && result.ats_tips.length > 0
      ? `
  <div class="section">
    <h2>ATS Tips</h2>
    ${result.ats_tips.map((t) => `<div class="ats-tip">💡 ${t}</div>`).join('')}
  </div>`
      : ''
  }

  ${
    result.keywords_missing && result.keywords_missing.length > 0
      ? `
  <div class="section">
    <h2>Missing Keywords</h2>
    <div class="missing-kw">
      ${result.keywords_missing.map((k) => `<span class="kw-tag">${k}</span>`).join('')}
    </div>
  </div>`
      : ''
  }

  ${
    result.work_experience && result.work_experience.length > 0
      ? `
  <div class="section">
    <h2>Work Experience</h2>
    ${result.work_experience
      .map(
        (we) => `
    <div class="section-feedback-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:13px;font-weight:600;color:#1e293b;">${we.title}</div>
          <div style="font-size:12px;color:#7c3aed;">${we.company}</div>
        </div>
        ${we.duration ? `<span style="font-size:11px;color:#94a3b8;">${we.duration}</span>` : ''}
      </div>
      ${
        we.highlights
          ? `<ul style="margin-top:6px;padding-left:14px;">
              ${we.highlights.map((h) => `<li style="font-size:11px;color:#64748b;margin-bottom:2px;">${h}</li>`).join('')}
            </ul>`
          : ''
      }
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <div class="footer">
    ResuFlow — AI-Powered Resume Analysis · Generated on ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

  // Open in new window and trigger print dialog
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for fonts to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 600);
  }
}

/**
 * Button component for exporting PDF — can be used anywhere a result is available
 */
export default function ExportPDFButton({ result }: { result: ResumeResult }) {
  return (
    <button
      onClick={() => exportAnalysisPDF(result)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800/60 transition-all border border-surface-700/40 hover:border-surface-600/60 cursor-pointer bg-transparent"
      title="Export as PDF"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
      Export PDF
    </button>
  );
}
