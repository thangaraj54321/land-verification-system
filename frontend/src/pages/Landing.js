import React from "react";
import { Link } from "react-router-dom";

function Landing() {
  return (
    <div>
      <section className="landing-hero">
        <h1>Decentralized Verification System</h1>
        <p>
          A secure, transparent, and tamper-proof platform for verifying
          educational certificates and land ownership records using blockchain
          technology.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link to="/verify-certificate" className="btn btn-primary">
            Verify Certificate
          </Link>
          <Link to="/verify-land" className="btn btn-secondary">
            Verify Land
          </Link>
        </div>
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
          Our Features
        </h2>
        <div className="grid grid-3">
          <div className="card feature-card">
            <div className="feature-icon">📜</div>
            <h3>Certificate Verification</h3>
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Instantly verify educational certificates issued by authorized
              institutions. No more fake degrees.
            </p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">🏞️</div>
            <h3>Land Registry</h3>
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Register and transfer land ownership securely on the blockchain.
              Complete transparency.
            </p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Decentralized Security</h3>
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              Built on Ethereum blockchain with IPFS storage. Your data is
              immutable and secure.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
          How It Works
        </h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>For Certificates</h3>
            <ol
              style={{
                marginLeft: "1.5rem",
                marginTop: "1rem",
                lineHeight: "2",
              }}
            >
              <li>Institution issues a digital certificate</li>
              <li>Document is stored on IPFS</li>
              <li>Hash is recorded on Ethereum blockchain</li>
              <li>Anyone can verify instantly</li>
            </ol>
          </div>
          <div className="card">
            <h3>For Land Records</h3>
            <ol
              style={{
                marginLeft: "1.5rem",
                marginTop: "1rem",
                lineHeight: "2",
              }}
            >
              <li>Government registers land parcel</li>
              <li>Title deed stored on IPFS</li>
              <li>Ownership recorded on blockchain</li>
              <li>Transfer ownership securely</li>
            </ol>
          </div>
        </div>
      </section>

      <section style={{ marginTop: "3rem", textAlign: "center" }}>
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h3>Get Started</h3>
          <p style={{ color: "#6b7280", margin: "1rem 0" }}>
            Connect your MetaMask wallet to start issuing certificates or
            registering land parcels.
          </p>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Make sure you have MetaMask installed and connected to a testnet.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Landing;
