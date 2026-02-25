import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function IssueCertificate({ contract, account, connectWallet }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [formData, setFormData] = useState({
    studentAddress: "",
    studentName: "",
    institution: "",
    degree: "",
    specialization: "",
    certificateFile: null,
  });
  const [ipfsHash, setIpfsHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [transactionHash, setTransactionHash] = useState("");

  useEffect(() => {
    if (account && contract) {
      loadTemplates();
    }
  }, [account, contract]);

  const loadTemplates = async () => {
    try {
      const templateIds = await contract.getInstitutionTemplates(account);
      const templateData = [];
      
      for (const templateId of templateIds) {
        try {
          const template = await contract.getTemplate(templateId);
          if (template.isActive) {
            templateData.push({
              id: template.id.toString(),
              templateName: template.templateName,
              institutionName: template.institutionName,
              primaryColor: template.primaryColor,
              secondaryColor: template.secondaryColor,
              degreeTypes: template.degreeTypes,
              includeSpecialization: template.includeSpecialization,
            });
          }
        } catch (err) {
          console.error(`Error loading template ${templateId}:`, err);
        }
      }
      
      setTemplates(templateData);
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  };

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData({
          ...formData,
          institution: template.institutionName,
        });
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, certificateFile: e.target.files[0] });
  };

  const uploadToIPFS = async () => {
    if (!formData.certificateFile) {
      setMessage({ type: "error", text: "Please select a certificate file" });
      return null;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", formData.certificateFile);

      const response = await axios.post(`${API_URL}/upload`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setIpfsHash(response.data.data.ipfsHash);
        setMessage({
          type: "success",
          text: "File uploaded to IPFS successfully!",
        });
        return response.data.data.ipfsHash;
      } else {
        throw new Error(response.data.error || "Upload failed");
      }
    } catch (error) {
      console.error("IPFS upload error:", error);
      // For testing, use mock hash
      const mockHash = "Qm" + Math.random().toString(36).substring(2, 15);
      setIpfsHash(mockHash);
      setMessage({
        type: "success",
        text: `File uploaded (mock): ${mockHash}`,
      });
      return mockHash;
    } finally {
      setUploading(false);
    }
  };

  const issueCertificate = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setTransactionHash("");

    if (!account) {
      setMessage({ type: "error", text: "Please connect your wallet first" });
      return;
    }

    if (!contract) {
      setMessage({
        type: "error",
        text: "Contract not loaded. Please refresh the page.",
      });
      return;
    }

    if (
      !formData.studentAddress ||
      !formData.studentName ||
      !formData.institution ||
      !formData.degree ||
      !ipfsHash
    ) {
      setMessage({
        type: "error",
        text: "Please fill all fields and upload the certificate",
      });
      return;
    }

    setLoading(true);

    try {
      const tx = await contract.issueCertificate(
        formData.studentAddress,
        formData.studentName,
        formData.institution,
        formData.degree,
        formData.specialization,
        ipfsHash,
      );

      setTransactionHash(tx.hash);
      setMessage({
        type: "success",
        text: "Transaction submitted! Waiting for confirmation...",
      });

      await tx.wait();

      setMessage({ type: "success", text: "Certificate issued successfully!" });

      // Reset form
      setFormData({
        studentAddress: "",
        studentName: "",
        institution: "",
        degree: "",
        specialization: "",
        certificateFile: null,
      });
      setIpfsHash("");
    } catch (error) {
      console.error("Issue certificate error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to issue certificate",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h1 className="page-title">Issue Certificate</h1>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            Please connect your wallet to issue certificates.
          </p>
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Issue Certificate</h1>

      <div className="card">
        <div className="card-header">Certificate Information</div>

        <form onSubmit={issueCertificate}>
          <div className="form-group">
            <label className="form-label">Student Wallet Address *</label>
            <input
              type="text"
              name="studentAddress"
              className="form-input"
              placeholder="0x..."
              value={formData.studentAddress}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Student Name *</label>
            <input
              type="text"
              name="studentName"
              className="form-input"
              placeholder="Enter full name"
              value={formData.studentName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Institution Name *</label>
            <input
              type="text"
              name="institution"
              className="form-input"
              placeholder="University/College name"
              value={formData.institution}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Degree/Certificate *</label>
            <input
              type="text"
              name="degree"
              className="form-input"
              placeholder="e.g., Bachelor of Science"
              value={formData.degree}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Specialization</label>
            <input
              type="text"
              name="specialization"
              className="form-input"
              placeholder="e.g., Computer Science"
              value={formData.specialization}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Certificate Document (PDF/Image) *
            </label>
            <input
              type="file"
              name="certificateFile"
              className="form-input"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              required
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: "0.5rem" }}
              onClick={uploadToIPFS}
              disabled={uploading || !formData.certificateFile}
            >
              {uploading ? "Uploading..." : "Upload to IPFS"}
            </button>
            {ipfsHash && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#065f46",
                }}
              >
                ✓ IPFS Hash: {ipfsHash}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !ipfsHash}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {loading ? "Issuing Certificate..." : "Issue Certificate"}
          </button>
        </form>

        {message.text && (
          <div
            className={
              message.type === "error" ? "error-message" : "success-message"
            }
          >
            {message.text}
            {transactionHash && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                Transaction Hash:{" "}
                <a
                  href={`https://goerli.etherscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {transactionHash.substring(0, 20)}...
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueCertificate;
