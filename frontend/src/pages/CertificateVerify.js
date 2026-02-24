import React, { useState } from "react";
import axios from "axios";

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function CertificateVerify({ contract }) {
  const [certificateId, setCertificateId] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyCertificate = async (e) => {
    e.preventDefault();
    setError("");
    setCertificate(null);

    if (!certificateId) {
      setError("Please enter a certificate ID");
      return;
    }

    if (!contract) {
      setError("Contract not loaded. Please connect your wallet.");
      return;
    }

    setLoading(true);

    try {
      const id = parseInt(certificateId);
      const result = await contract.verifyCertificate(id);

      setCertificate({
        id: id,
        studentAddress: result.studentAddress,
        studentName: result.studentName,
        institution: result.institution,
        degree: result.degree,
        specialization: result.specialization,
        issueDate: new Date(result.issueDate * 1000).toLocaleDateString(),
        ipfsHash: result.ipfsHash,
        isRevoked: result.isRevoked,
        issuer: result.issuer,
      });
    } catch (err) {
      console.error("Verification error:", err);
      setError("Certificate not found or error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const openIPFSDocument = (hash) => {
    if (hash && hash.startsWith("Qm")) {
      window.open(`${IPFS_GATEWAY}${hash}`, "_blank");
    }
  };

  return (
    <div>
      <h1 className="page-title">Verify Certificate</h1>

      <div className="card">
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Enter the certificate ID to verify its authenticity on the blockchain.
        </p>

        <form onSubmit={verifyCertificate} className="verify-section">
          <div className="verify-input-group">
            <input
              type="number"
              className="form-input verify-input"
              placeholder="Enter Certificate ID"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              min="1"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>

        {error && <div className="error-message">{error}</div>}

        {certificate && (
          <div
            className={`result-card ${certificate.isRevoked ? "invalid" : ""}`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3>Certificate Details</h3>
              <span
                className={`status-badge ${certificate.isRevoked ? "revoked" : "valid"}`}
              >
                {certificate.isRevoked ? "Revoked" : "Valid"}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">Certificate ID:</span>
              <span className="result-value">{certificate.id}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Student Name:</span>
              <span className="result-value">{certificate.studentName}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Student Address:</span>
              <span className="result-value">{certificate.studentAddress}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Institution:</span>
              <span className="result-value">{certificate.institution}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Degree:</span>
              <span className="result-value">{certificate.degree}</span>
            </div>
            {certificate.specialization && (
              <div className="result-item">
                <span className="result-label">Specialization:</span>
                <span className="result-value">
                  {certificate.specialization}
                </span>
              </div>
            )}
            <div className="result-item">
              <span className="result-label">Issue Date:</span>
              <span className="result-value">{certificate.issueDate}</span>
            </div>
            <div className="result-item">
              <span className="result-label">IPFS Hash:</span>
              <span
                className="result-value"
                style={{ fontSize: "0.875rem", wordBreak: "break-all" }}
              >
                {certificate.ipfsHash}
              </span>
            </div>

            {certificate.ipfsHash && certificate.ipfsHash.startsWith("Qm") && (
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() => openIPFSDocument(certificate.ipfsHash)}
              >
                View Document
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CertificateVerify;
