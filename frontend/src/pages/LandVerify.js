import React, { useState } from "react";

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function LandVerify({ contract }) {
  const [landId, setLandId] = useState("");
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyLand = async (e) => {
    e.preventDefault();
    setError("");
    setLand(null);

    if (!landId) {
      setError("Please enter a land ID");
      return;
    }

    if (!contract) {
      setError("Contract not loaded. Please connect your wallet.");
      return;
    }

    setLoading(true);

    try {
      const id = parseInt(landId);
      const result = await contract.getLandDetails(id);

      setLand({
        id: id,
        owner: result.owner,
        area: result.area,
        location: result.location,
        city: result.city,
        state: result.state,
        country: result.country,
        ipfsHash: result.ipfsHash,
        registrationDate: new Date(
          result.registrationDate * 1000,
        ).toLocaleDateString(),
        isActive: result.isActive,
        isDisputed: result.isDisputed,
      });
    } catch (err) {
      console.error("Verification error:", err);
      setError("Land record not found or error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const openIPFSDocument = (hash) => {
    if (hash && hash.startsWith("Qm")) {
      window.open(`${IPFS_GATEWAY}${hash}`, "_blank");
    }
  };

  const getStatusBadge = () => {
    if (!land) return null;
    if (land.isDisputed) {
      return <span className="status-badge revoked">Disputed</span>;
    }
    if (!land.isActive) {
      return <span className="status-badge invalid">Inactive</span>;
    }
    return <span className="status-badge valid">Active</span>;
  };

  return (
    <div>
      <h1 className="page-title">Verify Land Record</h1>

      <div className="card">
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Enter the land ID to verify ownership and details on the blockchain.
        </p>

        <form onSubmit={verifyLand} className="verify-section">
          <div className="verify-input-group">
            <input
              type="number"
              className="form-input verify-input"
              placeholder="Enter Land ID"
              value={landId}
              onChange={(e) => setLandId(e.target.value)}
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

        {land && (
          <div
            className={`result-card ${!land.isActive || land.isDisputed ? "invalid" : ""}`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3>Land Details</h3>
              {getStatusBadge()}
            </div>

            <div className="result-item">
              <span className="result-label">Land ID:</span>
              <span className="result-value">{land.id}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Owner Address:</span>
              <span className="result-value" style={{ fontSize: "0.875rem" }}>
                {land.owner}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Area:</span>
              <span className="result-value">{land.area}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Location:</span>
              <span className="result-value">{land.location}</span>
            </div>
            <div className="result-item">
              <span className="result-label">City:</span>
              <span className="result-value">{land.city}</span>
            </div>
            <div className="result-item">
              <span className="result-label">State:</span>
              <span className="result-value">{land.state}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Country:</span>
              <span className="result-value">{land.country}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Registration Date:</span>
              <span className="result-value">{land.registrationDate}</span>
            </div>
            <div className="result-item">
              <span className="result-label">IPFS Hash:</span>
              <span
                className="result-value"
                style={{ fontSize: "0.875rem", wordBreak: "break-all" }}
              >
                {land.ipfsHash}
              </span>
            </div>

            {land.ipfsHash && land.ipfsHash.startsWith("Qm") && (
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() => openIPFSDocument(land.ipfsHash)}
              >
                View Title Deed
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LandVerify;
