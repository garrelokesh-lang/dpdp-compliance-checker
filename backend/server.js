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
mongoose.connect("mongodb://mongo:27017/dpdp_checker")
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
   Scan Route
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
    });

    const $ = cheerio.load(response.data);

    let score = 100;
    let issues = [];

    if ($("a:contains('Privacy')").length === 0) {
      score -= 20;
      issues.push("Privacy Policy not found");
    }

    if ($("a:contains('Terms')").length === 0) {
      score -= 20;
      issues.push("Terms & Conditions not found");
    }

    if (!response.headers["content-security-policy"]) {
      score -= 20;
      issues.push("No Content Security Policy header");
    }

    let riskLevel = "Low";
    if (score < 70) riskLevel = "Medium";
    if (score < 40) riskLevel = "High";

    const savedScan = await Scan.create({
      url,
      score,
      riskLevel,
      issues
    });

    res.json(savedScan);

  } catch (error) {
    console.error("Scan Error:", error.message);
    res.status(500).json({ error: "Scan failed. Website may block automated requests." });
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