import React, { useState, useEffect } from "react";

const TransactionHistory = ({ certificateContract, landContract }) => {
  const [certificateTransactions, setCertificateTransactions] = useState([]);
  const [landTransactions, setLandTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "certificate", "land"
  const [error, setError] = useState("");

  useEffect(() => {
    if (certificateContract || landContract) {
      loadTransactions();
    }
  }, [certificateContract, landContract]);

  const loadTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const certTxs = [];
      const landTxs = [];

      // Load certificate transactions
      if (certificateContract) {
        try {
          const totalCertTxs = await certificateContract.getTotalTransactions();
          for (let i = 1; i <= totalCertTxs; i++) {
            const tx = await certificateContract.transactions(i);
            if (tx.id && tx.id.toNumber() > 0) {
              certTxs.push({
                id: tx.id.toNumber(),
                type: tx.transactionType,
                relatedId: tx.certificateId.toNumber(),
                party: tx.party,
                relatedParty: tx.relatedParty,
                details: tx.details,
                timestamp: tx.timestamp.toNumber(),
                category: "certificate",
              });
            }
          }
        } catch (err) {
          console.error("Error loading certificate transactions:", err);
        }
      }

      // Load land transactions
      if (landContract) {
        try {
          const totalLandTxs = await landContract.getTotalTransactions();
          for (let i = 1; i <= totalLandTxs; i++) {
            const tx = await landContract.transactions(i);
            if (tx.id && tx.id.toNumber() > 0) {
              landTxs.push({
                id: tx.id.toNumber(),
                type: tx.transactionType,
                relatedId: tx.landId.toNumber(),
                party: tx.party,
                relatedParty: tx.relatedParty,
                details: tx.details,
                timestamp: tx.timestamp.toNumber(),
                category: "land",
              });
            }
          }
        } catch (err) {
          console.error("Error loading land transactions:", err);
        }
      }

      // Sort by timestamp (newest first)
      certTxs.sort((a, b) => b.timestamp - a.timestamp);
      landTxs.sort((a, b) => b.timestamp - a.timestamp);

      setCertificateTransactions(certTxs);
      setLandTransactions(landTxs);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError(
        "Failed to load transactions. Make sure you're connected to the network.",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return (
      address.substring(0, 6) + "..." + address.substring(address.length - 4)
    );
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      ISSUED: { label: "Certificate Issued", color: "#10b981" },
      REVOKED: { label: "Certificate Revoked", color: "#ef4444" },
      AUTHORIZED_ISSUER: { label: "Issuer Authorized", color: "#3b82f6" },
      REVOKED_ISSUER: { label: "Issuer Revoked", color: "#f59e0b" },
      REGISTERED: { label: "Land Registered", color: "#10b981" },
      TRANSFERRED: { label: "Ownership Transferred", color: "#8b5cf6" },
      STATUS_CHANGED: { label: "Status Changed", color: "#f59e0b" },
      DISPUTED: { label: "Land Disputed", color: "#ef4444" },
      AUTHORIZED_REGISTRAR: { label: "Registrar Authorized", color: "#3b82f6" },
      REVOKED_REGISTRAR: { label: "Registrar Revoked", color: "#f59e0b" },
    };
    return labels[type] || { label: type, color: "#6b7280" };
  };

  const getFilteredTransactions = () => {
    if (filter === "certificate") return certificateTransactions;
    if (filter === "land") return landTransactions;
    return [...certificateTransactions, ...landTransactions].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  };

  const filteredTransactions = getFilteredTransactions();

  if (!certificateContract && !landContract) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="error-message">
            <h2>Wallet Not Connected</h2>
            <p>Please connect your wallet to view transaction history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1>Transaction History</h1>
          <p>
            View all certificate and land registry transactions on the
            blockchain
          </p>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Transactions (
            {certificateTransactions.length + landTransactions.length})
          </button>
          <button
            className={`filter-tab ${filter === "certificate" ? "active" : ""}`}
            onClick={() => setFilter("certificate")}
          >
            Certificates ({certificateTransactions.length})
          </button>
          <button
            className={`filter-tab ${filter === "land" ? "active" : ""}`}
            onClick={() => setFilter("land")}
          >
            Land ({landTransactions.length})
          </button>
          <button className="refresh-button" onClick={loadTransactions}>
            ↻ Refresh
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Transactions Found</h3>
            <p>There are no transactions to display yet.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {filteredTransactions.map((tx) => {
              const typeInfo = getTransactionTypeLabel(tx.type);
              return (
                <div
                  key={`${tx.category}-${tx.id}`}
                  className="transaction-card"
                >
                  <div className="transaction-header">
                    <span
                      className="transaction-type"
                      style={{ backgroundColor: typeInfo.color }}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="transaction-category">
                      {tx.category === "certificate"
                        ? "📜 Certificate"
                        : "🏞️ Land"}
                    </span>
                  </div>
                  <div className="transaction-body">
                    <div className="transaction-detail">
                      <span className="detail-label">Transaction ID:</span>
                      <span className="detail-value">#{tx.id}</span>
                    </div>
                    {tx.relatedId > 0 && (
                      <div className="transaction-detail">
                        <span className="detail-label">
                          {tx.category === "certificate"
                            ? "Certificate ID:"
                            : "Land ID:"}
                        </span>
                        <span className="detail-value">#{tx.relatedId}</span>
                      </div>
                    )}
                    <div className="transaction-detail">
                      <span className="detail-label">Party:</span>
                      <span className="detail-value address">
                        {shortenAddress(tx.party)}
                      </span>
                    </div>
                    {tx.relatedParty &&
                      tx.relatedParty !==
                        "0x0000000000000000000000000000000000000000" && (
                        <div className="transaction-detail">
                          <span className="detail-label">Related Party:</span>
                          <span className="detail-value address">
                            {shortenAddress(tx.relatedParty)}
                          </span>
                        </div>
                      )}
                    <div className="transaction-detail">
                      <span className="detail-label">Details:</span>
                      <span className="detail-value">{tx.details}</span>
                    </div>
                    <div className="transaction-detail">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">
                        {formatDate(tx.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .page-container {
          padding: 2rem;
          min-height: calc(100vh - 200px);
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .page-header p {
          color: #6b7280;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: #f3f4f6;
        }

        .filter-tab.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .refresh-button {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          margin-left: auto;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          background: #f3f4f6;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .transaction-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          transition: box-shadow 0.2s;
        }

        .transaction-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .transaction-type {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .transaction-category {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .transaction-body {
          display: grid;
          gap: 0.5rem;
        }

        .transaction-detail {
          display: flex;
          gap: 0.5rem;
        }

        .detail-label {
          font-weight: 500;
          color: #6b7280;
          min-width: 120px;
        }

        .detail-value {
          color: #1f2937;
        }

        .detail-value.address {
          font-family: monospace;
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading p {
          margin-top: 1rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default TransactionHistory;
