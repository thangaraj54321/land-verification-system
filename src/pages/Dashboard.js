import React, { useState, useEffect } from "react";

// Helper function to format remaining time
const formatRemainingTime = (seconds) => {
  if (!seconds || seconds === 0) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days} days, ${hours} hours`;
  if (hours > 0) return `${hours} hours, ${minutes} minutes`;
  return `${minutes} minutes`;
};

function Dashboard({
  account,
  connectWallet,
  certificateContract,
  landContract,
}) {
  const [certificates, setCertificates] = useState([]);
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("certificates");
  const [transferForm, setTransferForm] = useState({
    landId: "",
    newOwner: "",
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (account && certificateContract && landContract) {
      fetchUserData();
    }
  }, [account, certificateContract, landContract]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Get student certificates
      const certIds = await certificateContract.getStudentCertificates(account);
      const certs = [];
      for (const id of certIds) {
        try {
          const cert = await certificateContract.verifyCertificate(id);
          // Get expiration status
          let expirationStatus = {
            isExpired: false,
            expirationDate: null,
            remainingTime: 0,
          };
          try {
            expirationStatus = await certificateContract.getExpirationStatus(
              id,
            );
          } catch (e) {
            console.warn(
              "Expiration status not available for certificate:",
              id,
            );
          }

          certs.push({
            id: id.toString(),
            studentName: cert.studentName,
            institution: cert.institution,
            degree: cert.degree,
            issueDate: new Date(cert.issueDate * 1000).toLocaleDateString(),
            isRevoked: cert.isRevoked,
            ipfsHash: cert.ipfsHash,
            expirationDate: expirationStatus.expirationDate
              ? new Date(
                  expirationStatus.expirationDate * 1000,
                ).toLocaleDateString()
              : "Never",
            isExpired: expirationStatus.isExpired,
            remainingTime: expirationStatus.remainingTime
              ? formatRemainingTime(expirationStatus.remainingTime)
              : "N/A",
          });
        } catch (e) {
          console.error("Error fetching certificate:", e);
        }
      }
      setCertificates(certs);

      // Get owner lands
      const landIds = await landContract.getOwnerLands(account);
      const lands = [];
      for (const id of landIds) {
        try {
          const land = await landContract.getLandDetails(id);
          lands.push({
            id: id.toString(),
            area: land.area,
            location: land.location,
            city: land.city,
            state: land.state,
            registrationDate: new Date(
              land.registrationDate * 1000,
            ).toLocaleDateString(),
            isActive: land.isActive,
            isDisputed: land.isDisputed,
            ipfsHash: land.ipfsHash,
          });
        } catch (e) {
          console.error("Error fetching land:", e);
        }
      }
      setLands(lands);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const transferLand = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!transferForm.landId || !transferForm.newOwner) {
      setMessage({ type: "error", text: "Please fill all fields" });
      return;
    }

    setTransferLoading(true);
    try {
      const tx = await landContract.transferOwnership(
        parseInt(transferForm.landId),
        transferForm.newOwner,
      );

      setMessage({
        type: "success",
        text: "Transfer submitted! Waiting for confirmation...",
      });
      await tx.wait();

      setMessage({ type: "success", text: "Land transferred successfully!" });
      setTransferForm({ landId: "", newOwner: "" });
      fetchUserData();
    } catch (error) {
      console.error("Transfer error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to transfer land",
      });
    } finally {
      setTransferLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            Please connect your wallet to view your dashboard.
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
      <h1 className="page-title">My Dashboard</h1>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Connected Wallet:</strong> {account}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          className={`btn ${activeTab === "certificates" ? "btn-primary" : ""}`}
          onClick={() => setActiveTab("certificates")}
          style={{
            background: activeTab === "certificates" ? undefined : "#e5e7eb",
            color: activeTab === "certificates" ? "white" : "#374151",
          }}
        >
          My Certificates ({certificates.length})
        </button>
        <button
          className={`btn ${activeTab === "lands" ? "btn-primary" : ""}`}
          onClick={() => setActiveTab("lands")}
          style={{
            background: activeTab === "lands" ? undefined : "#e5e7eb",
            color: activeTab === "lands" ? "white" : "#374151",
          }}
        >
          My Lands ({lands.length})
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {activeTab === "certificates" && (
            <div>
              {certificates.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p style={{ color: "#6b7280" }}>No certificates found.</p>
                </div>
              ) : (
                <div className="grid">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h3>Certificate #{cert.id}</h3>
                        <span
                          className={`status-badge ${
                            cert.isRevoked
                              ? "revoked"
                              : cert.isExpired
                              ? "expired"
                              : "valid"
                          }`}
                        >
                          {cert.isRevoked
                            ? "Revoked"
                            : cert.isExpired
                            ? "Expired"
                            : "Valid"}
                        </span>
                      </div>
                      <div style={{ marginTop: "1rem", lineHeight: "1.8" }}>
                        <p>
                          <strong>Name:</strong> {cert.studentName}
                        </p>
                        <p>
                          <strong>Institution:</strong> {cert.institution}
                        </p>
                        <p>
                          <strong>Degree:</strong> {cert.degree}
                        </p>
                        <p>
                          <strong>Issue Date:</strong> {cert.issueDate}
                        </p>
                      </div>
                      {cert.ipfsHash && cert.ipfsHash.startsWith("Qm") && (
                        <a
                          href={`https://ipfs.io/ipfs/${cert.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{
                            display: "block",
                            marginTop: "1rem",
                            textAlign: "center",
                          }}
                        >
                          View Certificate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "lands" && (
            <div>
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h3 className="card-header">Transfer Land Ownership</h3>
                <form onSubmit={transferLand}>
                  <div className="grid grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Land ID</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Enter Land ID"
                        value={transferForm.landId}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            landId: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">New Owner Address</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="0x..."
                        value={transferForm.newOwner}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            newOwner: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={transferLoading}
                    style={{ marginTop: "1rem", width: "100%" }}
                  >
                    {transferLoading ? "Transferring..." : "Transfer Ownership"}
                  </button>
                </form>
                {message.text && (
                  <div
                    className={
                      message.type === "error"
                        ? "error-message"
                        : "success-message"
                    }
                    style={{ marginTop: "1rem" }}
                  >
                    {message.text}
                  </div>
                )}
              </div>

              {lands.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p style={{ color: "#6b7280" }}>No lands found.</p>
                </div>
              ) : (
                <div className="grid">
                  {lands.map((land) => (
                    <div key={land.id} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h3>Land #{land.id}</h3>
                        <span
                          className={`status-badge ${
                            land.isDisputed
                              ? "revoked"
                              : land.isActive
                              ? "valid"
                              : "invalid"
                          }`}
                        >
                          {land.isDisputed
                            ? "Disputed"
                            : land.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                      <div style={{ marginTop: "1rem", lineHeight: "1.8" }}>
                        <p>
                          <strong>Area:</strong> {land.area}
                        </p>
                        <p>
                          <strong>Location:</strong> {land.location},{" "}
                          {land.city}
                        </p>
                        <p>
                          <strong>State:</strong> {land.state}
                        </p>
                        <p>
                          <strong>Registration:</strong> {land.registrationDate}
                        </p>
                      </div>
                      {land.ipfsHash && land.ipfsHash.startsWith("Qm") && (
                        <a
                          href={`https://ipfs.io/ipfs/${land.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{
                            display: "block",
                            marginTop: "1rem",
                            textAlign: "center",
                          }}
                        >
                          View Title Deed
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
