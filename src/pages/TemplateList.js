import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function TemplateList({ account, connectWallet, contract }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account && contract) {
      loadTemplates();
    }
  }, [account, contract]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      if (!contract) {
        setError("Contract not loaded. Please refresh the page.");
        setLoading(false);
        return;
      }

      // Get template IDs from smart contract
      const templateIds = await contract.getInstitutionTemplates(account);
      
      const templateData = [];
      for (const templateId of templateIds) {
        try {
          const template = await contract.getTemplate(templateId);
          templateData.push({
            id: template.id.toString(),
            institutionAddress: template.institutionAddress,
            templateName: template.templateName,
            institutionName: template.institutionName,
            institutionLogo: template.institutionLogo,
            primaryColor: template.primaryColor,
            secondaryColor: template.secondaryColor,
            includeSpecialization: template.includeSpecialization,
            includeGrades: template.includeGrades,
            isActive: template.isActive,
            createdAt: template.createdAt.toString(),
          });
        } catch (err) {
          console.error(`Error loading template ${templateId}:`, err);
        }
      }

      setTemplates(templateData);
    } catch (err) {
      console.error("Error loading templates:", err);
      setError("Failed to load templates. Make sure you're connected to the correct network.");
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const tx = await contract.deleteTemplate(templateId);
      await tx.wait();
      alert("Template deleted successfully!");
      loadTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Failed to delete template: " + (err.message || "Unknown error"));
    }
  };

  if (!account) {
    return (
      <div>
        <h1 className="page-title">Certificate Templates</h1>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            Please connect your wallet to manage templates.
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
      <div className="page-header">
        <h1 className="page-title">Certificate Templates</h1>
        <Link to="/templates/create" className="btn btn-primary">
          Create New Template
        </Link>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            No templates found. Create your first template to get started.
          </p>
          <Link to="/templates/create" className="btn btn-primary">
            Create Template
          </Link>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="card template-card">
              <div
                className="template-preview"
                style={{
                  background: `linear-gradient(135deg, ${template.primaryColor} 0%, ${template.secondaryColor} 100%)`,
                }}
              >
                <div className="template-preview-content">
                  <h3>{template.templateName}</h3>
                  <p>{template.institutionName}</p>
                </div>
              </div>
              <div className="template-info">
                <h3>{template.templateName}</h3>
                <p className="template-institution">{template.institutionName}</p>
                <div className="template-meta">
                  <span
                    className={`badge ${template.isActive ? "badge-success" : "badge-error"}`}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-muted">
                    {template.includeSpecialization && "Specialization "}
                    {template.includeGrades && "Grades "}
                  </span>
                </div>
                <div className="template-actions">
                  <Link
                    to={`/templates/${template.id}/edit`}
                    className="btn btn-secondary"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteTemplate(template.id)}
                    disabled={!template.isActive}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplateList;
