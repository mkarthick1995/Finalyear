/**
 * RenalCare AI - Final summary report generator.
 * Builds a self-contained, print-friendly HTML report from the dashboard
 * summary payload. Used both for direct .html download and Print/Save-as-PDF.
 */

const STATUS_LABEL = {
  good: "Good",
  attention: "Needs attention",
  critical: "Critical",
  info: "Info",
};

const STATUS_COLOR = {
  good: "#059669",
  attention: "#d97706",
  critical: "#dc2626",
  info: "#2563eb",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTag(status) {
  const c = STATUS_COLOR[status] || "#64748b";
  return `<span style="background:${c}1a;color:${c};border:1px solid ${c}66;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700;letter-spacing:.03em">${STATUS_LABEL[status] || status}</span>`;
}

function scoreBar(label, score, color) {
  const w = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score));
  return `
    <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
      <div style="width:130px;font-size:11px;color:#475569">${label}</div>
      <div style="flex:1;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="width:${w}%;height:100%;background:${color || "#2563eb"};border-radius:999px"></div>
      </div>
      <div style="width:36px;font-size:11px;font-weight:700;color:#0f172a;text-align:right">${score === null ? "—" : Math.round(score)}</div>
    </div>`;
}

function sectionHtml(section) {
  const metrics = (section.metrics || [])
    .map(
      (m) => `
      <div style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">${m.label}</div>
        <div style="font-size:14px;font-weight:700;color:#0f172a">${m.value}</div>
      </div>`
    )
    .join("");

  return `
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:12px 0;break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="font-size:16px;font-weight:800;color:#0f172a;margin:0">${section.title}</h3>
        ${statusTag(section.status)}
      </div>
      ${scoreBar("Section score", section.score, STATUS_COLOR[section.status])}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0">${metrics}</div>
      <p style="font-size:13px;line-height:1.6;color:#334155;margin:8px 0 0">${section.conclusion}</p>
    </div>`;
}

function waterChart(history) {
  if (!history || !history.days) return "";
  const max = Math.max(...history.ml, history.goal_ml, 1);
  const bars = history.days
    .map((d, i) => {
      const v = history.ml[i] || 0;
      const h = Math.round((v / max) * 120);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
          <div style="font-size:10px;color:#334155;font-weight:600">${v}ml</div>
          <div style="width:20px;height:${h}px;background:${v >= history.goal_ml ? "#059669" : "#3b82f6"};border-radius:4px 4px 0 0"></div>
          <div style="font-size:10px;color:#64748b">${d}</div>
        </div>`;
    })
    .join("");
  return `
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:12px 0;break-inside:avoid">
      <h3 style="font-size:16px;font-weight:800;color:#0f172a;margin:0 0 12px">Hydration - last 7 days</h3>
      <div style="display:flex;align-items:flex-end;gap:8px">${bars}</div>
      <p style="font-size:11px;color:#64748b;margin-top:8px">Daily goal: ${history.goal_ml} ml. Green bars reached the goal.</p>
    </div>`;
}

function dataTable(title, headers, rows) {
  if (!rows || rows.length === 0) return "";
  const head = headers.map((h) => `<th style="text-align:left;padding:8px 10px;font-size:11px;color:#475569;border-bottom:2px solid #e2e8f0">${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="padding:7px 10px;font-size:12px;color:#0f172a;border-bottom:1px solid #f1f5f9">${c}</td>`).join("")}</tr>`
    )
    .join("");
  return `
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:12px 0;break-inside:avoid">
      <h3 style="font-size:16px;font-weight:800;color:#0f172a;margin:0 0 8px">${title}</h3>
      <table style="width:100%;border-collapse:collapse">${head}${body}</table>
    </div>`;
}

export function buildReportHtml(summary, patient) {
  const { sections = [], overall = {}, water_history } = summary || {};
  const sectByKey = Object.fromEntries(sections.map((s) => [s.key, s]));

  const scans = sectByKey.scan?.latest_scan
    ? [
        [
          "Latest AI scan",
          sectByKey.scan.latest_scan.prediction,
          `${(sectByKey.scan.latest_scan.confidence * 100).toFixed(1)}%`,
          sectByKey.scan.latest_scan.stone_size_mm
            ? `${sectByKey.scan.latest_scan.stone_size_mm} mm`
            : "Not measurable",
          shortDate(sectByKey.scan.latest_scan.created_at),
        ],
      ]
    : [];

  const medicines = (sectByKey.diet?.medicines || []).map((m) => [
    m.name,
    m.dose || "—",
    m.frequency || "—",
  ]);

  const meals = (sectByKey.diet?.meals_today || []).map((m) => [
    m.meal_type,
    (m.food_items || []).map((f) => f.name).join(", ") || "—",
    m.oxalate_level,
    `${m.sodium_mg} mg`,
  ]);

  const upcoming = (sectByKey.appointments?.upcoming || []).map((a) => [
    a.title,
    shortDate(a.appointment_date),
    a.appointment_type,
    a.doctor_type || "—",
  ]);

  const goals = (sectByKey.goals?.goals || []).map((g) => [
    g.category,
    g.goal,
    g.target || "—",
  ]);

  const highlights = (overall.highlights || [])
    .map(
      (h) =>
        `<li style="margin:4px 0;font-size:13px;color:${h.level === "critical" ? "#dc2626" : h.level === "attention" ? "#b45309" : "#047857"}">• ${h.text}</li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>RenalCare AI - Patient Report</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 32px; }
  h1, h2, h3 { font-family: inherit; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:16px">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer">Save as PDF / Print</button>
  </div>

  <div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:16px">
    <h1 style="margin:0;font-size:24px">RenalCare AI — Patient Summary Report</h1>
    <p style="margin:4px 0 0;color:#475569;font-size:13px">
      Patient: <strong>${summary?.patient?.name || patient?.name || "—"}</strong> &nbsp;·&nbsp;
      Generated: ${fmtDate(summary?.generated_at)}
    </p>
  </div>

  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:20px;margin:16px 0;break-inside:avoid">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h2 style="margin:0;font-size:18px;color:#1e3a8a">Overall conclusion</h2>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:900;color:#1e3a8a">${overall.score === null || overall.score === undefined ? "—" : Math.round(overall.score)}<span style="font-size:14px">/100</span></div>
        ${statusTag(overall.status)}
      </div>
    </div>
    <p style="font-size:14px;line-height:1.6;color:#1e293b;margin:8px 0">${overall.conclusion || ""}</p>
    <ul style="margin:8px 0 0;padding-left:4px;list-style:none">${highlights}</ul>
  </div>

  <h2 style="font-size:18px;margin:20px 0 4px">Per-section outcomes</h2>
  ${sections.map(sectionHtml).join("")}

  ${waterChart(water_history)}
  ${dataTable("Latest AI scan record", ["Item", "Result", "Confidence", "Est. size", "Date"], scans)}
  ${dataTable("Active medicines", ["Medicine", "Dose", "Frequency"], medicines)}
  ${dataTable("Meals logged today", ["Meal", "Items", "Oxalate level", "Sodium"], meals)}
  ${dataTable("Upcoming appointments", ["Title", "Date", "Type", "Doctor"], upcoming)}
  ${dataTable("Today's health goals", ["Category", "Goal", "Target"], goals)}

  <p style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">
    ${summary?.disclaimer || ""}
  </p>
</body>
</html>`;
}

export function downloadReport(summary, patient) {
  const html = buildReportHtml(summary, patient);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `renalcare-report-${date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printReport(summary, patient) {
  const html = buildReportHtml(summary, patient);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    window.alert("Please allow pop-ups to print the report.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}