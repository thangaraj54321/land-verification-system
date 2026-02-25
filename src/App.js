// Components
import Landing from "./pages/Landing";
import CertificateVerify from "./pages/CertificateVerify";
import LandVerify from "./pages/LandVerify";
import IssueCertificate from "./pages/IssueCertificate";
import RegisterLand from "./pages/RegisterLand";
import Dashboard from "./pages/Dashboard";
import TransactionHistory from "./pages/TransactionHistory";
import TemplateList from "./pages/TemplateList";
import TemplateEditor from "./pages/TemplateEditor";

// Contract ABIs and Addresses
import CertificateRegistryABI from "./contracts/CertificateRegistry.json";
import LandRegistryABI from "./contracts/LandRegistry.json";

// Ethers - use Web3Provider for ethers v5 compatibility
import { ethers } from "ethers";

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Contract addresses - loaded from backend API or use defaults
let CERTIFICATE_REGISTRY_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
let LAND_REGISTRY_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

// Fetch contract addresses from backend
const fetchContractAddresses = async () => {
  try {
    const response = await fetch(`${API_URL}/api/contracts`);
    const data = await response.json();
    if (data.success && data.data) {
      if (data.data.certificateRegistry) {
        CERTIFICATE_REGISTRY_ADDRESS = data.data.certificateRegistry;
      }
      if (data.data.landRegistry) {
        LAND_REGISTRY_ADDRESS = data.data.landRegistry;
      }
      console.log("Contract addresses loaded from backend:", {
        certificateRegistry: CERTIFICATE_REGISTRY_ADDRESS,
        landRegistry: LAND_REGISTRY_ADDRESS,
      });
    }
  } catch (error) {
    console.log("Using default contract addresses:", error.message);
  }
};

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [certificateContract, setCertificateContract] = useState(null);
  const [landContract, setLandContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initWeb3();
  }, []);

  const initWeb3 = async () => {
    try {
      // First fetch contract addresses from backend
      await fetchContractAddresses();
      
      if (window.ethereum) {
        // Use Web3Provider for ethers v5
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        await ethersProvider.send("eth_requestAccounts", []);
        const signer = await ethersProvider.getSigner();
        const account = await signer.getAddress();

        const certContract = new ethers.Contract(
          CERTIFICATE_REGISTRY_ADDRESS,
          CertificateRegistryABI.abi,
          signer
        );

        const landContract = new ethers.Contract(
          LAND_REGISTRY_ADDRESS,
          LandRegistryABI.abi,
          signer
        );

        setProvider(ethersProvider);
        setSigner(signer);
        setAccount(account);
        setCertificateContract(certContract);
        setLandContract(landContract);
      }
    } catch (error) {
      console.error("Web3 initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      await ethersProvider.send("eth_requestAccounts", []);
      const signer = await ethersProvider.getSigner();
      const account = await signer.getAddress();

      const certContract = new ethers.Contract(
        CERTIFICATE_REGISTRY_ADDRESS,
        CertificateRegistryABI.abi,
        signer
      );

      const landContract = new ethers.Contract(
        LAND_REGISTRY_ADDRESS,
        LandRegistryABI.abi,
        signer
      );

      setProvider(ethersProvider);
      setSigner(signer);
      setAccount(account);
      setCertificateContract(certContract);
      setLandContract(landContract);
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading" style={{ height: "100vh" }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Header
          account={account}
          connectWallet={connectWallet}
          shortenAddress={shortenAddress}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/verify-certificate"
              element={<CertificateVerify contract={certificateContract} />}
            />
            <Route
              path="/verify-land"
              element={<LandVerify contract={landContract} />}
            />
            <Route
              path="/issue-certificate"
              element={
                <IssueCertificate
                  contract={certificateContract}
                  account={account}
                  connectWallet={connectWallet}
                />
              }
            />
            <Route
              path="/register-land"
              element={
                <RegisterLand
                  contract={landContract}
                  account={account}
                  connectWallet={connectWallet}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  account={account}
                  connectWallet={connectWallet}
                  certificateContract={certificateContract}
                  landContract={landContract}
                />
              }
            />
            <Route
              path="/transaction-history"
              element={
                <TransactionHistory
                  certificateContract={certificateContract}
                  landContract={landContract}
                />
              }
            />
            <Route
              path="/templates"
              element={
                <TemplateList
                  account={account}
                  connectWallet={connectWallet}
                  contract={certificateContract}
                />
              }
            />
            <Route
              path="/templates/create"
              element={
                <TemplateEditor
                  account={account}
                  connectWallet={connectWallet}
                  contract={certificateContract}
                />
              }
            />
            <Route
              path="/templates/:id/edit"
              element={
                <TemplateEditor
                  account={account}
                  connectWallet={connectWallet}
                  contract={certificateContract}
                />
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

function Header({ account, connectWallet, shortenAddress }) {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span>🔗</span>
          <span>Decentralized Verification</span>
        </div>
        <nav className="nav">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/verify-certificate"
            className={`nav-link ${location.pathname === "/verify-certificate" ? "active" : ""}`}
          >
            Verify Certificate
          </Link>
          <Link
            to="/verify-land"
            className={`nav-link ${location.pathname === "/verify-land" ? "active" : ""}`}
          >
            Verify Land
          </Link>
          {account && (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
              >
                Dashboard
              </Link>
              <Link
                to="/transaction-history"
                className={`nav-link ${location.pathname === "/transaction-history" ? "active" : ""}`}
              >
                Transactions
              </Link>
              <Link
                to="/issue-certificate"
                className={`nav-link ${location.pathname === "/issue-certificate" ? "active" : ""}`}
              >
                Issue Cert
              </Link>
              <Link
                to="/register-land"
                className={`nav-link ${location.pathname === "/register-land" ? "active" : ""}`}
              >
                Register Land
              </Link>
              <Link
                to="/templates"
                className={`nav-link ${location.pathname.startsWith("/templates") ? "active" : ""}`}
              >
                Templates
              </Link>
            </>
          )}
        </nav>
        <button
          className={`wallet-button ${account ? "connected" : ""}`}
          onClick={connectWallet}
        >
          {account ? shortenAddress(account) : "Connect Wallet"}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>Decentralized Certificate and Land Verification System</p>
      <p style={{ fontSize: "0.875rem", marginTop: "0.5rem", opacity: 0.8 }}>
        Built with Ethereum, React, and IPFS
      </p>
    </footer>
  );
}

export default App;
