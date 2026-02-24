# Certificate Templates Feature Plan

## Overview

Allow institutions to create, manage, and use customizable certificate templates when issuing digital certificates.

## Current System Analysis

- Certificates are issued with: student address, name, institution, degree, specialization, IPFS hash
- All fields are entered manually each time
- No template or 预定义 structure exists

## Feature Requirements

### 1. Template Data Model

```javascript
{
  templateId: uint256,
  institutionAddress: address,
  templateName: string,           // "Standard Degree", "Honorary Certificate"
  institutionName: string,        // Pre-filled institution name
  institutionLogo: string,         // IPFS hash for logo image
  primaryColor: string,            // Hex color for header/accent
  secondaryColor: string,          // Hex color for body
  degreeTypes: string[],          // ["Bachelor of Science", "Master of Arts", etc.]
  includeSpecialization: boolean, // Whether specialization field is used
  includeGrades: boolean,         // Whether to include GPA/grades
  includeIssueDate: boolean,      // Auto-populate issue date
  isActive: boolean,
  createdAt: uint256
}
```

### 2. Smart Contract Changes (CertificateRegistry.sol)

- Add `mapping(address => uint256[]) public institutionTemplateIds`
- Add `mapping(uint256 => CertificateTemplate) public templates`
- Add `uint256 public nextTemplateId`
- Add events: `TemplateCreated`, `TemplateUpdated`, `TemplateDeleted`
- Add functions:
  - `createTemplate(...)` - Create new template
  - `updateTemplate(...)` - Update existing template
  - `deleteTemplate(uint256 _templateId)` - Deactivate template
  - `getInstitutionTemplates(address _institution)` - Get all templates for an institution
  - `issueCertificateWithTemplate(...)` - Issue certificate using template

### 3. Backend API Endpoints

- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `GET /api/templates/:id` - Get template details
- `GET /api/templates/institution/:address` - Get all templates for institution
- `POST /api/templates/:id/generate` - Generate certificate PDF from template

### 4. Frontend Components

1. **TemplateList** (`/templates`) - View all templates
2. **TemplateEditor** (`/templates/create`, `/templates/:id/edit`) - Create/edit template
3. **TemplateSelector** - Dropdown in IssueCertificate page to select template
4. **TemplatePreview** - Preview how certificate will look

### 5. User Flows

#### Create Template Flow

1. Navigate to Templates page
2. Click "Create Template"
3. Fill in template details (name, colors, degree types)
4. Upload institution logo (stored in IPFS)
5. Save template (stored in smart contract)

#### Issue Certificate with Template Flow

1. Navigate to Issue Certificate page
2. Select template from dropdown
3. Template fields (institution name, colors) auto-populate
4. Fill student-specific fields
5. Upload certificate document
6. Issue certificate

## Implementation Priority

1. Smart contract modifications
2. Backend API for template management
3. Frontend template management pages
4. Integration with IssueCertificate page
5. Template preview functionality

## Technical Considerations

- Template data stored on-chain for transparency (colors, degree types)
- Logo images stored in IPFS
- Maximum 10 templates per institution (gas optimization)
- Template fields validated before creation

## Files to Modify

1. `contracts/CertificateRegistry.sol` - Add template logic
2. `backend/server.js` - Add template API routes
3. `frontend/src/App.js` - Add template routes
4. `frontend/src/pages/TemplateList.js` - New file
5. `frontend/src/pages/TemplateEditor.js` - New file
6. `frontend/src/pages/IssueCertificate.js` - Add template selection
