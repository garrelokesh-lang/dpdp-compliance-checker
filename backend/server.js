const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===========================
   MongoDB Connection
=========================== */
mongoose.connect("mongodb://127.0.0.1:27017/dpdp")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

/* ===========================
   Schema
=========================== */
const scanSchema = new mongoose.Schema({
  url: String,
  score: Number,
  riskLevel: String,
  issues: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Scan = mongoose.model("Scan", scanSchema);

/* ===========================
   Scan Route (Upgraded)
=========================== */
app.post("/scan", async (req, res) => {
  try {
    const { url } = req.body;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const pageText = html.toLowerCase();

    let score = 0;
    let issues = [];
    let checks = [];
    let recommendations = [];

    /* ===========================
       1. HTTPS Check
    ============================ */
    if (url.startsWith("https://")) {
      score += 15;
      checks.push("HTTPS Enabled");
    } else {
      issues.push("Website is not using HTTPS");
      recommendations.push("Enable SSL certificate and use HTTPS.");
    }

    /* ===========================
       2. Privacy Policy
    ============================ */
    const hasPrivacy =
      $("a:contains('Privacy')").length > 0 ||
      pageText.includes("privacy policy");

    if (hasPrivacy) {
      score += 20;
      checks.push("Privacy Policy Found");
    } else {
      issues.push("Privacy Policy not found");
      recommendations.push("Add a Privacy Policy page.");
    }

    /* ===========================
       3. Terms & Conditions
    ============================ */
    const hasTerms =
      $("a:contains('Terms')").length > 0 ||
      pageText.includes("terms and conditions");

    if (hasTerms) {
      score += 10;
      checks.push("Terms & Conditions Found");
    } else {
      issues.push("Terms & Conditions missing");
      recommendations.push("Add Terms & Conditions page.");
    }

    /* ===========================
       4. Cookie Policy / Banner
    ============================ */
    if (pageText.includes("cookie")) {
      score += 10;
      checks.push("Cookie Policy Mentioned");
    } else {
      issues.push("Cookie banner/policy missing");
      recommendations.push("Add cookie consent banner.");
    }

    /* ===========================
       5. Consent Mechanism
    ============================ */
    if (
      pageText.includes("consent") ||
      pageText.includes("agree")
    ) {
      score += 15;
      checks.push("Consent Mechanism Present");
    } else {
      issues.push("User consent mechanism missing");
      recommendations.push("Add consent checkbox before forms.");
    }

    /* ===========================
       6. Contact Information
    ============================ */
    const hasContact =
      $("a:contains('Contact')").length > 0 ||
      pageText.includes("contact us");

    if (hasContact) {
      score += 5;
      checks.push("Contact Information Found");
    } else {
      issues.push("Contact information missing");
      recommendations.push("Add Contact Us page.");
    }

    /* ===========================
       7. Data Retention Policy
    ============================ */
    if (pageText.includes("retention")) {
      score += 10;
      checks.push("Data Retention Policy Found");
    } else {
      issues.push("Data retention policy missing");
      recommendations.push("Mention how long user data is stored.");
    }

    /* ===========================
       8. Grievance Officer
    ============================ */
    if (pageText.includes("grievance")) {
      score += 10;
      checks.push("Grievance Officer Details Found");
    } else {
      issues.push("Grievance officer details missing");
      recommendations.push("Provide grievance officer contact details.");
    }

    /* ===========================
       9. Security Header
    ============================ */
    if (response.headers["content-security-policy"]) {
      score += 5;
      checks.push("Content Security Policy Header Present");
    } else {
      issues.push("No Content Security Policy header");
      recommendations.push("Add Content-Security-Policy header.");
    }

    /* ===========================
       Risk Level
    ============================ */
    let riskLevel = "Low";
    if (score < 75) riskLevel = "Medium";
    if (score < 50) riskLevel = "High";

    /* ===========================
       AI Summary
    ============================ */
    const summary = `This website scored ${score}/100 with ${riskLevel} risk. Major issues: ${
      issues.length ? issues.join(", ") : "No major issues found"
    }.`;

    /* ===========================
       Save to MongoDB
    ============================ */
    const savedScan = await Scan.create({
      url,
      score,
      riskLevel,
      issues
    });

    /* ===========================
       Response
    ============================ */
    res.json({
      _id: savedScan._id,
      url,
      score,
      riskLevel,
      issues,
      checks,
      recommendations,
      summary
    });

  } catch (error) {
    console.error("Scan Error:", error.message);

    res.status(500).json({
      error: "Scan failed. Website may block automated requests."
    });
  }
});

/* ===========================
   Get Scan History
=========================== */
app.get("/history", async (req, res) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/* ===========================
   Dashboard Stats
=========================== */
app.get("/stats", async (req, res) => {
  try {
    const scans = await Scan.find();

    const total = scans.length;

    const averageScore = total
      ? Math.round(scans.reduce((sum, s) => sum + s.score, 0) / total)
      : 0;

    const highRisk = scans.filter(s => s.riskLevel === "High").length;
    const mediumRisk = scans.filter(s => s.riskLevel === "Medium").length;
    const lowRisk = scans.filter(s => s.riskLevel === "Low").length;

    res.json({
      total,
      averageScore,
      highRisk,
      mediumRisk,
      lowRisk
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

/* ===========================
   Professional PDF Route
=========================== */
app.get("/download/:id", async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).send("Scan not found");

    const doc = new PDFDocument({ margin: 60 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=dpdp-report-${scan._id}.pdf`
    );

    doc.pipe(res);

    /* ===========================
       TITLE
    ============================ */
    doc
      .fontSize(24)
      .fillColor("#1e3c72")
      .text("DPDP Act 2023 Compliance Report", { align: "center" });

    doc.moveDown(2);

    /* ===========================
       WEBSITE DETAILS
    ============================ */
    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Website: ${scan.url}`)
      .text(`Scan Date: ${new Date(scan.createdAt).toLocaleString()}`);

    doc.moveDown(2);

    /* ===========================
       COMPLIANCE SCORE SECTION
    ============================ */
    doc.fontSize(16).fillColor("black").text("Compliance Score");

    doc.moveDown(0.5);

    const barX = 60;
    const barY = doc.y;
    const barWidth = 470;
    const barHeight = 20;

    // Background bar
    doc
      .rect(barX, barY, barWidth, barHeight)
      .fillColor("#e0e0e0")
      .fill();

    // Determine color
    let barColor = "#2ecc71"; // green
    if (scan.score < 70) barColor = "#f39c12"; // orange
    if (scan.score < 40) barColor = "#e74c3c"; // red

    const scoreWidth = (scan.score / 100) * barWidth;

    // Score bar
    doc
      .rect(barX, barY, scoreWidth, barHeight)
      .fillColor(barColor)
      .fill();

    doc.moveDown(2);

    doc
      .fontSize(14)
      .fillColor("black")
      .text(`Score: ${scan.score}/100`);

    doc.moveDown(1.5);

    /* ===========================
       RISK LEVEL
    ============================ */
    doc.fontSize(16).text("Risk Level");

    doc
      .moveDown(0.5)
      .fontSize(14)
      .fillColor(barColor)
      .text(scan.riskLevel);

    doc.moveDown(2);

    /* ===========================
       ISSUES SECTION
    ============================ */
    doc.fontSize(16).fillColor("black").text("Compliance Issues");

    doc.moveDown();

    if (scan.issues.length === 0) {
      doc
        .fontSize(12)
        .text("No major compliance issues detected.");
    } else {
      scan.issues.forEach((issue, index) => {
        doc
          .fontSize(12)
          .text(`${index + 1}. ${issue}`);
      });
    }

    doc.moveDown(4);

    /* ===========================
       FOOTER
    ============================ */
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "Generated by DPDP Act 2023 Compliance Checker System",
        { align: "center" }
      );

    doc.end();

  } catch (error) {
    console.error("PDF Error:", error.message);
    res.status(500).send("Error generating PDF");
  }
});

/* ===========================
   Start Server
=========================== */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});