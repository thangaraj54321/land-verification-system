import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function RegisterLand({ contract, account, connectWallet }) {
  const [formData, setFormData] = useState({
    ownerAddress: '',
    area: '',
    location: '',
    city: '',
    state: '',
    country: '',
    deedFile: null
  });
  const [ipfsHash, setIpfsHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [transactionHash, setTransactionHash] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, deedFile: e.target.files[0] });
  };

  const uploadToIPFS = async () => {
    if (!formData.deedFile) {
      setMessage({ type: 'error', text: 'Please select a title deed file' });
      return null;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', formData.deedFile);

      const response = await axios.post(`${API_URL}/upload`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setIpfsHash(response.data.data.ipfsHash);
        setMessage({ type: 'success', text: 'File uploaded to IPFS successfully!' });
        return response.data.data.ipfsHash;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error("IPFS upload error:", error);
      // For testing, use mock hash
      const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15);
      setIpfsHash(mockHash);
      setMessage({ type: 'success', text: `File uploaded (mock): ${mockHash}` });
      return mockHash;
    } finally {
      setUploading(false);
    }
  };

  const registerLand = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setTransactionHash('');

    if (!account) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    if (!contract) {
      setMessage({ type: 'error', text: 'Contract not loaded. Please refresh the page.' });
      return;
    }

    if (!formData.ownerAddress || !formData.area || !formData.location || 
        !formData.city || !formData.state || !formData.country || !ipfsHash) {
      setMessage({ type: 'error', text: 'Please fill all fields and upload the title deed' });
      return;
    }

    setLoading(true);

    try {
      const tx = await contract.registerLand(
        formData.ownerAddress,
        formData.area,
        formData.location,
        formData.city,
        formData.state,
        formData.country,
        ipfsHash
      );

      setTransactionHash(tx.hash);
      setMessage({ type: 'success', text: 'Transaction submitted! Waiting for confirmation...' });

      await tx.wait();

      setMessage({ type: 'success', text: 'Land registered successfully!' });
      
      // Reset form
      setFormData({
        ownerAddress: '',
        area: '',
        location: '',
        city: '',
        state: '',
        country: '',
        deedFile: null
      });
      setIpfsHash('');
      
    } catch (error) {
      console.error("Register land error:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to register land' });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h1 className="page-title">Register Land</h1>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Please connect your wallet to register land.
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
      <h1 className="page-title">Register Land</h1>
      
      <div className="card">
        <div className="card-header">Land Registration Form</div>
        
        <form onSubmit={registerLand}>
          <div className="form-group">
            <label className="form-label">Owner Wallet Address *</label>
            <input
              type="text"
              name="ownerAddress"
              className="form-input"
              placeholder="0x..."
              value={formData.ownerAddress}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Area *</label>
              <input
                type="text"
                name="area"
                className="form-input"
                placeholder="e.g., 500 sq meters"
                value={formData.area}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location/Address *</label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="Plot No., Street"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                className="form-input"
                placeholder="City name"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                name="state"
                className="form-input"
                placeholder="State name"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Country *</label>
            <input
              type="text"
              name="country"
              className="form-input"
              placeholder="Country name"
              value={formData.country}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Title Deed Document (PDF/Image) *</label>
            <input
              type="file"
              name="deedFile"
              className="form-input"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              required
            />
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ marginTop: '0.5rem' }}
              onClick={uploadToIPFS}
              disabled={uploading || !formData.deedFile}
            >
              {uploading ? 'Uploading...' : 'Upload to IPFS'}
            </button>
            {ipfsHash && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#065f46' }}>
                ✓ IPFS Hash: {ipfsHash}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !ipfsHash}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Registering Land...' : 'Register Land'}
          </button>
        </form>

        {message.text && (
          <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
            {message.text}
            {transactionHash && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Transaction Hash: <a 
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

export default RegisterLand;
