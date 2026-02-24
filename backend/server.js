require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { create } = require("ipfs-http-client");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images and PDF documents are allowed"));
  },
});

// IPFS Client Configuration
let ipfs;

async function initIPFS() {
  try {
    if (process.env.INFURA_PROJECT_ID && process.env.INFURA_PROJECT_SECRET) {
      // Use Infura IPFS
      ipfs = create({
        host: "ipfs.infura.io",
        port: 5001,
        protocol: "https",
        headers: {
          authorization: `Basic ${Buffer.from(
            `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`,
          ).toString("base64")}`,
        },
      });
      console.log("Connected to Infura IPFS");
    } else if (process.env.IPFS_API_URL) {
      // Use custom IPFS node
      ipfs = create(process.env.IPFS_API_URL);
      console.log("Connected to custom IPFS node");
    } else {
      // Use local IPFS node
      ipfs = create("http://localhost:5001");
      console.log("Connected to local IPFS node");
    }
  } catch (error) {
    console.error("Failed to initialize IPFS:", error.message);
    console.log("Note: IPFS upload will not work without proper configuration");
  }
}

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    ipfs: ipfs ? "connected" : "not configured",
  });
});

// Get contract addresses
app.get("/api/contracts", (req, res) => {
  try {
    const configPath = path.join(__dirname, "..", "config", "contract-addresses.json");
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(configData);
      res.json({
        success: true,
        data: {
          certificateRegistry: config.certificateRegistry,
          landRegistry: config.landRegistry,
          network: config.network,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          certificateRegistry: process.env.CERTIFICATE_REGISTRY_ADDRESS || "",
          landRegistry: process.env.LAND_REGISTRY_ADDRESS || "",
          network: "localhost",
        },
      });
    }
  } catch (error) {
    console.error("Error reading contract addresses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve contract addresses",
    });
  }
});

// Upload file to IPFS
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    if (!ipfs) {
      // If IPFS is not configured, return mock hash for testing
      return res.json({
        success: true,
        data: {
          ipfsHash: "Qm" + Math.random().toString(36).substring(2, 15),
          pinSize: req.file.size,
          timestamp: new Date().toISOString(),
          localPath: req.file.path,
          note: "Mock hash - IPFS not configured",
        },
        message: "File uploaded locally (IPFS not configured)",
      });
    }

    // Read file and upload to IPFS
    const fileBuffer = fs.readFileSync(req.file.path);
    const result = await ipfs.add({
      path: req.file.originalname,
      content: fileBuffer,
    });

    // Pin the file to ensure persistence
    await ipfs.pin.add(result.cid);

    // Clean up local file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        ipfsHash: result.cid.toString(),
        pinSize: result.size,
        timestamp: new Date().toISOString(),
      },
      message: "File uploaded successfully to IPFS",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get file from IPFS
app.get("/api/file/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    if (!ipfs) {
      return res.status(500).json({
        success: false,
        error: "IPFS not configured",
      });
    }

    const stream = ipfs.cat(hash);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    res.send(buffer);
  } catch (error) {
    console.error("File retrieval error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================
// Certificate Template Management API
// Note: These are server-side helpers.
// Actual template storage/retrieval happens on-chain via smart contracts.
// =============================================

// In-memory storage for template metadata (for faster retrieval)
// In production, consider using a database
const templateCache = new Map();

// Store template metadata
app.post("/api/templates", async (req, res) => {
  try {
    const {
      templateId,
      institutionAddress,
      templateName,
      institutionName,
      institutionLogo,
      primaryColor,
      secondaryColor,
      degreeTypes,
      includeSpecialization,
      includeGrades,
    } = req.body;

    if (!templateName || !institutionName) {
      return res.status(400).json({
        success: false,
        error: "Template name and institution name are required",
      });
    }

    const templateData = {
      templateId: templateId || Date.now(),
      institutionAddress,
      templateName,
      institutionName,
      institutionLogo: institutionLogo || "",
      primaryColor: primaryColor || "#1a365d",
      secondaryColor: secondaryColor || "#ffffff",
      degreeTypes: degreeTypes || [],
      includeSpecialization: includeSpecialization || false,
      includeGrades: includeGrades || false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    templateCache.set(templateData.templateId, templateData);

    res.json({
      success: true,
      data: templateData,
      message: "Template metadata stored",
    });
  } catch (error) {
    console.error("Template creation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get template by ID
app.get("/api/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (templateCache.has(templateId)) {
      return res.json({
        success: true,
        data: templateCache.get(templateId),
      });
    }

    res.status(404).json({
      success: false,
      error: "Template not found",
    });
  } catch (error) {
    console.error("Template retrieval error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all templates for an institution
app.get("/api/templates/institution/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const templates = [];

    for (const [id, template] of templateCache.entries()) {
      if (
        template.institutionAddress &&
        template.institutionAddress.toLowerCase() === address.toLowerCase()
      ) {
        templates.push(template);
      }
    }

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Template retrieval error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all templates
app.get("/api/templates", async (req, res) => {
  try {
    const templates = Array.from(templateCache.values());

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Template retrieval error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete template (mark as inactive)
app.delete("/api/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (!templateCache.has(templateId)) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const template = templateCache.get(templateId);
    template.isActive = false;
    template.deletedAt = new Date().toISOString();
    templateCache.set(templateId, template);

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Template deletion error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initIPFS();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Decentralized Verification System - Backend API           ║
╠════════════════════════════════════════════════════════════╣
║  Health Check:    GET  /api/health                        ║
║  Upload File:     POST /api/upload                         ║
║  Get File:        GET  /api/file/:hash                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
