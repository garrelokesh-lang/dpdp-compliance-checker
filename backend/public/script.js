document.getElementById("scanBtn").addEventListener("click", async function () {

  const url = document.getElementById("urlInput").value.trim();

  if (!url) {
    alert("Please enter a valid URL");
    return;
  }

  try {
    const response = await fetch("/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error("Scan request failed");
    }

    const result = await response.json();

    // Show result card
    const resultCard = document.getElementById("resultCard");
    resultCard.style.display = "block";

    // Display score
    document.getElementById("score").innerText = result.score;

    // Display risk level
    const riskElement = document.getElementById("risk");
    riskElement.innerText = result.riskLevel;

    // Risk color logic
    if (result.riskLevel === "High") {
      riskElement.style.color = "red";
    } else if (result.riskLevel === "Medium") {
      riskElement.style.color = "orange";
    } else {
      riskElement.style.color = "green";
    }

    // Display issues
    const issuesList = document.getElementById("issues");
    issuesList.innerHTML = "";

    if (result.issues.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No major compliance issues detected.";
      issuesList.appendChild(li);
    } else {
      result.issues.forEach(issue => {
        const li = document.createElement("li");
        li.textContent = issue;
        issuesList.appendChild(li);
      });
    }

    // Download PDF button
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.style.display = "inline-block";

    downloadBtn.onclick = function () {
      window.location.href = `/download/${result._id}`;
    };

  } catch (error) {
    console.error("Error during scan:", error);
    alert("Scan failed. Some websites may block automated requests.");
  }

});

async function loadHistory() {
  try {
    const response = await fetch("/history");
    const data = await response.json();

    const container = document.getElementById("historyContainer");
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p>No scan history found.</p>";
      return;
    }

    data.forEach(scan => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "10px";
      div.style.marginBottom = "10px";

      div.innerHTML = `
        <strong>Website:</strong> ${scan.url}<br>
        <strong>Score:</strong> ${scan.score}<br>
        <strong>Risk:</strong> ${scan.riskLevel}<br>
        <strong>Date:</strong> ${new Date(scan.createdAt).toLocaleString()}<br>
        <button onclick="downloadReport('${scan._id}')">Download PDF</button>
      `;

      container.appendChild(div);
    });

  } catch (error) {
    alert("Error loading history");
  }
}

function downloadReport(id) {
  window.location.href = `/download/${id}`;
}