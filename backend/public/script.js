async function scanWebsite() {
  const url = document.getElementById("url").value.trim();

  if (!url) {
    alert("Please enter a website URL");
    return;
  }

  try {
    const res = await fetch("/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    // DPDP Mapping Logic
    const dpdp = [
      {
        rule: "Notice / Privacy Policy",
        status: data.checks.includes("Privacy Policy Found") ? "✅" : "❌"
      },
      {
        rule: "Consent",
        status: data.checks.includes("Consent Mechanism Present") ? "✅" : "❌"
      },
      {
        rule: "Security",
        status: data.checks.includes("HTTPS Enabled") ? "✅" : "❌"
      },
      {
        rule: "Grievance Redressal",
        status: data.checks.includes("Grievance Officer Details Found") ? "✅" : "❌"
      },
      {
        rule: "Retention Policy",
        status: data.checks.includes("Data Retention Policy Found") ? "✅" : "❌"
      }
    ];

    let html = `
      <div class="result-box">

        <h2>Scan Result</h2>

        <div class="top-cards">
          <div class="card">
            <h3>Score</h3>
            <p>${data.score}/100</p>
          </div>

          <div class="card">
            <h3>Risk</h3>
            <p>${data.riskLevel}</p>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width:${data.score}%;">
            ${data.score}%
          </div>
        </div>

        <p><strong>Website:</strong> ${data.url}</p>
        <p><strong>Summary:</strong> ${data.summary}</p>

        <h3>Checks Passed</h3>
<ul>
  ${data.checks.map(item => {
    let points = "";

    if (item.includes("HTTPS")) points = "+15";
    else if (item.includes("Privacy")) points = "+20";
    else if (item.includes("Terms")) points = "+10";
    else if (item.includes("Cookie")) points = "+10";
    else if (item.includes("Consent")) points = "+15";
    else if (item.includes("Contact")) points = "+5";
    else if (item.includes("Retention")) points = "+10";
    else if (item.includes("Grievance")) points = "+10";
    else if (item.includes("Security Policy")) points = "+5";

    return `<li class="pass">✅ ${item} <strong>(${points})</strong></li>`;
  }).join("")}
</ul>

        <h3>Issues Found</h3>
        <ul>
          ${data.issues.map(item => `<li class="fail">❌ ${item}</li>`).join("")}
        </ul>

        <h3>Recommendations</h3>
        <ul>
          ${data.recommendations.map(item => `<li class="warn">💡 ${item}</li>`).join("")}
        </ul>

        <h3>DPDP Compliance Mapping</h3>
        <table class="mapping-table">
          <tr>
            <th>DPDP Rule</th>
            <th>Status</th>
          </tr>
          ${dpdp.map(row => `
            <tr>
              <td>${row.rule}</td>
              <td>${row.status}</td>
            </tr>
          `).join("")}
        </table>

        <br>

        <a href="/download/${data._id}" target="_blank">
          <button>Download PDF</button>
        </a>

      </div>
    `;

    document.getElementById("result").innerHTML = html;

  } catch (err) {
    console.error(err);
    alert("Error scanning website");
  }
}

/* ===========================
   Scan History
=========================== */
async function loadHistory() {
  const res = await fetch("/history");
  const data = await res.json();

  let html = "<h2>Scan History</h2>";

  data.forEach(item => {
    html += `
      <div style="padding:10px;border-bottom:1px solid #ccc;">
        <strong>${item.url}</strong><br>
        Score: ${item.score}/100 |
        Risk: ${item.riskLevel}
      </div>
    `;
  });

  document.getElementById("result").innerHTML = html;
}
async function loadDashboard() {
  const res = await fetch("/stats");
  const data = await res.json();

  document.getElementById("result").innerHTML = `
    <div class="result-box">
      <h2>Dashboard</h2>

      <div class="top-cards">
        <div class="card">
          <h3>Total Scans</h3>
          <p>${data.total}</p>
        </div>

        <div class="card">
          <h3>Average Score</h3>
          <p>${data.averageScore}</p>
        </div>
      </div>

      <div class="top-cards">
        <div class="card">
          <h3>Low Risk</h3>
          <p>${data.lowRisk}</p>
        </div>

        <div class="card">
          <h3>Medium Risk</h3>
          <p>${data.mediumRisk}</p>
        </div>

        <div class="card">
          <h3>High Risk</h3>
          <p>${data.highRisk}</p>
        </div>
      </div>
    </div>
  `;
}
async function compareWebsites() {
  const url1 = document.getElementById("url1").value.trim();
  const url2 = document.getElementById("url2").value.trim();

  if (!url1 || !url2) {
    alert("Enter both URLs");
    return;
  }

  const r1 = await fetch("/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url: url1 })
  });

  const r2 = await fetch("/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url: url2 })
  });

  const a = await r1.json();
  const b = await r2.json();

  document.getElementById("result").innerHTML = `
    <div class="result-box">
      <h2>Website Comparison</h2>

      <table class="mapping-table">
        <tr>
          <th>Website</th>
          <th>Score</th>
          <th>Risk</th>
        </tr>

        <tr>
          <td>${a.url}</td>
          <td>${a.score}</td>
          <td>${a.riskLevel}</td>
        </tr>

        <tr>
          <td>${b.url}</td>
          <td>${b.score}</td>
          <td>${b.riskLevel}</td>
        </tr>
      </table>
    </div>
  `;
}