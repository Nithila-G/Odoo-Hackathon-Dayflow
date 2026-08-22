import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Dayflow HRMS - Demo Video Script & Action Guide</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    .header-banner {
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header-banner h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-banner p {
      margin: 0;
      font-size: 13px;
      color: #e0e7ff;
      font-weight: 500;
    }
    .prep-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #4f46e5;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .prep-box h2 {
      margin: 0 0 10px 0;
      font-size: 15px;
      color: #1e1b4b;
      font-weight: 700;
    }
    .prep-box ul {
      margin: 0;
      padding-left: 20px;
    }
    .prep-box li {
      margin-bottom: 4px;
      font-size: 13px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background-color: #4338ca;
      color: #ffffff;
      text-align: left;
      padding: 12px 14px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .time-badge {
      display: inline-block;
      background-color: #e0e7ff;
      color: #3730a3;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    .action-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .script-text {
      font-style: italic;
      color: #1e293b;
      background-color: #f1f5f9;
      padding: 8px 10px;
      border-radius: 6px;
      border-left: 3px solid #6366f1;
      font-size: 12px;
    }
    .tips-section {
      margin-top: 24px;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 18px;
    }
    .tips-section h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #166534;
      font-weight: 700;
    }
    .tips-section p {
      margin: 0;
      font-size: 12.5px;
      color: #15803d;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
  </style>
</head>
<body>

  <div class="header-banner">
    <h1>Dayflow HRMS — 90-Second Demo Video Guide</h1>
    <p>Step-by-Step Screen Recording Actions & Voiceover Script for Odoo Hackathon Presentation</p>
  </div>

  <div class="prep-box">
    <h2>📋 Preparation Checklist Before Recording</h2>
    <ul>
      <li>Open browser tab at: <strong>http://localhost:5173/signup</strong></li>
      <li>Have a company logo image ready on your computer (e.g. Starbucks or custom logo).</li>
      <li>Ensure backend server and Vite client are active in background.</li>
      <li>Set display resolution to 1080p for crisp visual output.</li>
    </ul>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Time</th>
        <th style="width: 43%;">Screen Action (What You Do)</th>
        <th style="width: 43%;">Voiceover Script (What You Say)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="time-badge">0:00 – 0:15</span></td>
        <td>
          <div class="action-title">1. Company Sign Up & Logo Upload</div>
          • Display <strong>Sign Up Page</strong> with HD background video.<br>
          • Type Company Name: <strong>Starbucks Inc</strong>.<br>
          • Click blue <strong>Upload Logo button [📤]</strong> and select image.<br>
          • Click <strong>Eye icon (👁)</strong> to show password toggle.<br>
          • Click <strong>Sign Up</strong>.
        </td>
        <td>
          <div class="script-text">
            "Welcome to Dayflow HRMS, a modern, full-stack Human Resource Management System. We start by onboarding a new company with live logo uploads, secure credentials, and dynamic eye password toggles."
          </div>
        </td>
      </tr>

      <tr>
        <td><span class="time-badge">0:15 – 0:35</span></td>
        <td>
          <div class="action-title">2. Employee Directory & Check IN</div>
          • Land on <strong>Employees Directory</strong> page.<br>
          • Show employee cards with photos, roles, and status dots (🟢 Present, ✈️ Leave, 🟡 Absent).<br>
          • Click <strong>Check IN →</strong> button in header bar.<br>
          • Highlight indicator turning <strong>🟢 Green</strong> instantly.
        </td>
        <td>
          <div class="script-text">
            "Upon logging in, we land on the Employee Directory showing rich cards with profile pictures, departments, and live status indicators. Watch how clicking 'Check IN' instantly updates our status dot to green."
          </div>
        </td>
      </tr>

      <tr>
        <td><span class="time-badge">0:35 – 0:55</span></td>
        <td>
          <div class="action-title">3. Profile Personalization & Resume</div>
          • Click an employee card to open <strong>Profile Page</strong>.<br>
          • Click pencil icon <strong>[✏️]</strong> on About / My Job section.<br>
          • Click <strong>+ Add Skill</strong> (e.g. <em>React.js</em>) and <strong>+ Add Certification</strong>.<br>
          • Hover avatar circle to edit profile picture.
        </td>
        <td>
          <div class="script-text">
            "Clicking any employee card opens their profile in form view. Employees can personalize their avatar, edit background details, and interactively add or remove skills and certifications."
          </div>
        </td>
      </tr>

      <tr>
        <td><span class="time-badge">0:55 – 0:75</span></td>
        <td>
          <div class="action-title">4. Automatic Salary Calculator</div>
          • Click <strong>Salary Info Tab</strong>.<br>
          • Show <strong>Month Wage: ₹50,000</strong>.<br>
          • Highlight auto-calculated breakdown:<br>
            &bull; Basic (50%): <strong>₹25,000</strong> | HRA (50%): <strong>₹12,500</strong><br>
            &bull; Standard Allowance: <strong>₹4,167.50</strong><br>
            &bull; PF Employee & Employer (12%): <strong>₹3,000</strong><br>
            &bull; Professional Tax: <strong>₹200</strong>
        </td>
        <td>
          <div class="script-text">
            "Under the Salary Info tab, Dayflow features an automatic salary structure breakdown. For a monthly wage of ₹50,000, components like Basic, HRA, PF, Standard Allowance, and Professional Tax are calculated dynamically in real-time."
          </div>
        </td>
      </tr>

      <tr>
        <td><span class="time-badge">0:75 – 0:90</span></td>
        <td>
          <div class="action-title">5. Attendance & Time Off Approval</div>
          • Click <strong>Time Off</strong> in header navigation.<br>
          • Click <strong>+ New Request</strong>, select <em>Sick Leave</em>, attach medical file, and submit.<br>
          • Resize browser window to demonstrate mobile drawer menu.
        </td>
        <td>
          <div class="script-text">
            "Finally, employees can track month-wise attendance and request leave with document attachments, while HR admins approve or reject requests seamlessly. Dayflow is 100% responsive and ready for mobile!"
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="tips-section">
    <h3>💡 Recording Recommendations</h3>
    <p>Use OBS Studio, Windows Game Bar (Win + Alt + R), or Loom to record in 1080p. Keep mouse cursor movements smooth and speak at a clear, enthusiastic pace.</p>
  </div>

  <div class="footer">
    Dayflow HRMS • Odoo Hackathon Presentation Script Document
  </div>

</body>
</html>
`;

const htmlPath = path.resolve('Dayflow_Demo_Video_Script.html');
const pdfPath = path.resolve('Dayflow_Demo_Video_Script.pdf');

fs.writeFileSync(htmlPath, htmlContent);
console.log('HTML written to:', htmlPath);

const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

let pdfCreated = false;
for (const browserPath of edgePaths) {
  if (fs.existsSync(browserPath)) {
    try {
      const cmd = `"${browserPath}" --headless --print-to-pdf="${pdfPath}" --no-pdf-header-footer "${htmlPath}"`;
      execSync(cmd);
      console.log('PDF successfully generated at:', pdfPath);
      pdfCreated = true;
      break;
    } catch (err) {
      console.error('Failed with:', browserPath, err.message);
    }
  }
}

if (!pdfCreated) {
  console.log('No headless browser found for PDF generation.');
}
