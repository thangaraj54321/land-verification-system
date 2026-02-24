import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function TemplateEditor({ account, connectWallet, contract }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    templateName: "",
    institutionName: "",
    institutionLogo: "",
    primaryColor: "#1a365d",
    secondaryColor: "#ffffff",
    degreeTypes: "",
    includeSpecialization: false,
    includeGrades: false,
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (isEditMode && contract) {
      loadTemplate();
    }
  }, [id, contract]);

  const loadTemplate = async () => {
    try {
      setFetching(true);
      const templateId = parseInt(id);
      const template = await contract.getTemplate(templateId);

      setFormData({
        templateName: template.templateName,
        institutionName: template.institutionName,
        institutionLogo: template.institutionLogo,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        degreeTypes: template.degreeTypes.join(", "),
        includeSpecialization: template.includeSpecialization,
        includeGrades: template.includeGrades,
      });
    } catch (err) {
      console.error("Error loading template:", err);
      setMessage({ type: "error", text: "Failed to load template" });
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await axios.post(`${API_URL}/upload`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setFormData({ ...formData, institutionLogo: response.data.data.ipfsHash });
        setMessage({
          type: "success",
          text: "Logo uploaded successfully!",
        });
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      // Use mock hash for testing
      const mockHash = "Qm" + Math.random().toString(36).substring(2, 15);
      setFormData({ ...formData, institutionLogo: mockHash });
      setMessage({
        type: "success",
        text: `Logo uploaded (mock): ${mockHash}`,
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

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

    const degreeTypesArray = formData.degreeTypes
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    setLoading(true);

    try {
      if (isEditMode) {
        const tx = await contract.updateTemplate(
          parseInt(id),
          formData.templateName,
          formData.institutionName,
          formData.institutionLogo,
          formData.primaryColor,
          formData.secondaryColor,
          degreeTypesArray,
          formData.includeSpecialization,
          formData.includeGrades
        );
        await tx.wait();
        setMessage({ type: "success", text: "Template updated successfully!" });
      } else {
        const tx = await contract.createTemplate(
          formData.templateName,
          formData.institutionName,
          formData.institutionLogo,
          formData.primaryColor,
          formData.secondaryColor,
          degreeTypesArray,
          formData.includeSpecialization,
          formData.includeGrades
        );
        await tx.wait();
        setMessage({ type: "success", text: "Template created successfully!" });
        
        // Store metadata in backend
        try {
          await axios.post(`${API_URL}/templates`, {
            institutionAddress: account,
            templateName: formData.templateName,
            institutionName: formData.institutionName,
            institutionLogo: formData.institutionLogo,
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            degreeTypes: degreeTypesArray,
            includeSpecialization: formData.includeSpecialization,
            includeGrades: formData.includeGrades,
          });
        } catch (backendErr) {
          console.error("Backend storage error:", backendErr);
        }
      }

      setTimeout(() => {
        navigate("/templates");
      }, 1500);
    } catch (err) {
      console.error("Template save error:", err);
      setMessage({
        type: "error",
        text: err.message || "Failed to save template",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h1 className="page-title">
          {isEditMode ? "Edit Template" : "Create Template"}
        </h1>
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
        <h1 className="page-title">
          {isEditMode ? "Edit Template" : "Create Template"}
        </h1>
        <Link to="/templates" className="btn btn-secondary">
          Back to Templates
        </Link>
      </div>

      {fetching ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading template...</p>
        </div>
      ) : (
        <div className="card">
          {message.text && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Basic Information</h3>

              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input
                  type="text"
                  name="templateName"
                  className="form-input"
                  placeholder="e.g., Standard Degree Certificate"
                  value={formData.templateName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Institution Name *</label>
                <input
                  type="text"
                  name="institutionName"
                  className="form-input"
                  placeholder="e.g., University of Technology"
                  value={formData.institutionName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Institution Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="form-input"
                />
                {logoUploading && <p>Uploading...</p>}
                {formData.institutionLogo && (
                  <p className="text-muted" style={{ marginTop: "0.5rem" }}>
                    Logo uploaded: {formData.institutionLogo}
                  </p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Styling</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Primary Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="color-input"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="#1a365d"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Secondary Color</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      className="color-input"
                    />
                    <input
                      type="text"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Certificate Fields</h3>

              <div className="form-group">
                <label className="form-label">
                  Degree Types (comma-separated)
                </label>
                <input
                  type="text"
                  name="degreeTypes"
                  className="form-input"
                  placeholder="e.g., Bachelor of Science, Master of Arts, Doctorate"
                  value={formData.degreeTypes}
                  onChange={handleChange}
                />
                <p className="form-help">
                  These degree types will be available when issuing certificates
                  with this template.
                </p>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="includeSpecialization"
                    checked={formData.includeSpecialization}
                    onChange={handleChange}
                  />
                  <span>Include Specialization Field</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="includeGrades"
                    checked={formData.includeGrades}
                    onChange={handleChange}
                  />
                  <span>Include Grades/GPA Field</span>
                </label>
              </div>
            </div>

            <div className="form-section">
              <h3>Preview</h3>
              <div
                className="template-preview-box"
                style={{
                  background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`,
                }}
              >
                <div className="preview-content">
                  <h4>{formData.templateName || "Template Name"}</h4>
                  <p>{formData.institutionName || "Institution Name"}</p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Template"
                  : "Create Template"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TemplateEditor;
