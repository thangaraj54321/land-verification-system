// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CertificateRegistry
 * @dev Smart contract for issuing and managing educational certificates on blockchain
 */
contract CertificateRegistry is Ownable, ReentrancyGuard {
    // Certificate Structure
    struct Certificate {
        uint256 id;
        address studentAddress;
        string studentName;
        string institution;
        string degree;
        string specialization;
        uint256 issueDate;
        string ipfsHash;
        bool isRevoked;
        address issuer;
        uint256 templateId; // Template used for this certificate
    }

    // Certificate Template Structure
    struct CertificateTemplate {
        uint256 id;
        address institutionAddress;
        string templateName;
        string institutionName;
        string institutionLogo; // IPFS hash for logo
        string primaryColor; // Hex color for header/accent
        string secondaryColor; // Hex color for body
        string[] degreeTypes; // Available degree types
        bool includeSpecialization;
        bool includeGrades;
        bool isActive;
        uint256 createdAt;
    }

    // Transaction History Structure
    struct Transaction {
        uint256 id;
        string transactionType; // "ISSUED", "REVOKED", "AUTHORIZED", "REVOKED_ISSUER"
        uint256 certificateId;
        address party;
        address relatedParty; // For certificate operations, the student address
        string details;
        uint256 timestamp;
    }

    // State Variables
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public studentCertificates;
    mapping(address => bool) public authorizedIssuers;
    uint256 public nextCertificateId;

    // Template State Variables
    mapping(uint256 => CertificateTemplate) public templates;
    mapping(address => uint256[]) public institutionTemplateIds;
    uint256 public nextTemplateId;
    uint256 public constant MAX_TEMPLATES_PER_INSTITUTION = 10;

    // Transaction History
    mapping(uint256 => Transaction) public transactions;
    uint256 public nextTransactionId;

    // Events
    event CertificateIssued(
        uint256 indexed id,
        address indexed student,
        string studentName,
        string institution,
        string degree,
        uint256 templateId
    );
    event CertificateRevoked(uint256 indexed id);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    // Template Events
    event TemplateCreated(
        uint256 indexed templateId,
        address indexed institution,
        string templateName
    );
    event TemplateUpdated(
        uint256 indexed templateId,
        address indexed institution
    );
    event TemplateDeleted(
        uint256 indexed templateId,
        address indexed institution
    );

    // Modifiers
    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "CertificateRegistry: Not authorized to issue certificates"
        );
        _;
    }

    // Constructor
    constructor() {
        authorizedIssuers[msg.sender] = true;
        nextCertificateId = 1;
        nextTransactionId = 1;
        nextTemplateId = 1;
    }

    /**
     * @dev Authorize a new institution to issue certificates
     * @param _issuer Address of the institution to authorize
     */
    function authorizeIssuer(address _issuer) external onlyOwner {
        require(
            _issuer != address(0),
            "CertificateRegistry: Invalid issuer address"
        );
        authorizedIssuers[_issuer] = true;
        _recordTransaction(
            "AUTHORIZED_ISSUER",
            0,
            _issuer,
            msg.sender,
            "Issuer authorized to issue certificates"
        );
        emit IssuerAuthorized(_issuer);
    }

    /**
     * @dev Revoke an institution's authorization
     * @param _issuer Address of the institution to revoke
     */
    function revokeIssuer(address _issuer) external onlyOwner {
        require(
            _issuer != address(0),
            "CertificateRegistry: Invalid issuer address"
        );
        authorizedIssuers[_issuer] = false;
        _recordTransaction(
            "REVOKED_ISSUER",
            0,
            _issuer,
            msg.sender,
            "Issuer authorization revoked"
        );
        emit IssuerRevoked(_issuer);
    }

    /**
     * @dev Issue a new certificate
     * @param _studentAddress Ethereum address of the student
     * @param _studentName Full name of the student
     * @param _institution Name of the issuing institution
     * @param _degree Name of the degree/certificate
     * @param _specialization Specialization or stream
     * @param _ipfsHash IPFS hash of the certificate document
     * @param _templateId Template ID used (0 for no template)
     */
    function issueCertificate(
        address _studentAddress,
        string memory _studentName,
        string memory _institution,
        string memory _degree,
        string memory _specialization,
        string memory _ipfsHash,
        uint256 _templateId
    ) external onlyAuthorizedIssuer nonReentrant {
        require(
            _studentAddress != address(0),
            "CertificateRegistry: Invalid student address"
        );
        require(
            bytes(_studentName).length > 0,
            "CertificateRegistry: Student name required"
        );
        require(
            bytes(_institution).length > 0,
            "CertificateRegistry: Institution required"
        );
        require(
            bytes(_degree).length > 0,
            "CertificateRegistry: Degree required"
        );
        require(
            bytes(_ipfsHash).length > 0,
            "CertificateRegistry: IPFS hash required"
        );
        // Validate template if provided
        if (_templateId > 0) {
            require(
                _templateId < nextTemplateId,
                "CertificateRegistry: Template does not exist"
            );
            require(
                templates[_templateId].isActive,
                "CertificateRegistry: Template is inactive"
            );
        }

        Certificate storage cert = certificates[nextCertificateId];
        cert.id = nextCertificateId;
        cert.studentAddress = _studentAddress;
        cert.studentName = _studentName;
        cert.institution = _institution;
        cert.degree = _degree;
        cert.specialization = _specialization;
        cert.issueDate = block.timestamp;
        cert.ipfsHash = _ipfsHash;
        cert.isRevoked = false;
        cert.issuer = msg.sender;
        cert.templateId = _templateId;

        studentCertificates[_studentAddress].push(nextCertificateId);

        _recordTransaction(
            "ISSUED",
            nextCertificateId,
            msg.sender,
            _studentAddress,
            _degree
        );

        emit CertificateIssued(
            nextCertificateId,
            _studentAddress,
            _studentName,
            _institution,
            _degree,
            _templateId
        );

        nextCertificateId++;
    }

    /**
     * @dev Verify a certificate's details
     * @param _id Certificate ID to verify
     */
    function verifyCertificate(
        uint256 _id
    )
        external
        view
        returns (
            address studentAddress,
            string memory studentName,
            string memory institution,
            string memory degree,
            string memory specialization,
            uint256 issueDate,
            string memory ipfsHash,
            bool isRevoked,
            address issuer,
            uint256 templateId
        )
    {
        require(
            _id > 0 && _id < nextCertificateId,
            "CertificateRegistry: Certificate does not exist"
        );

        Certificate memory cert = certificates[_id];
        return (
            cert.studentAddress,
            cert.studentName,
            cert.institution,
            cert.degree,
            cert.specialization,
            cert.issueDate,
            cert.ipfsHash,
            cert.isRevoked,
            cert.issuer,
            cert.templateId
        );
    }

    /**
     * @dev Revoke a certificate
     * @param _id Certificate ID to revoke
     */
    function revokeCertificate(
        uint256 _id
    ) external onlyAuthorizedIssuer nonReentrant {
        require(
            _id > 0 && _id < nextCertificateId,
            "CertificateRegistry: Certificate does not exist"
        );
        require(
            !certificates[_id].isRevoked,
            "CertificateRegistry: Certificate already revoked"
        );

        certificates[_id].isRevoked = true;
        _recordTransaction(
            "REVOKED",
            _id,
            msg.sender,
            certificates[_id].studentAddress,
            "Certificate revoked"
        );
        emit CertificateRevoked(_id);
    }

    /**
     * @dev Get all certificate IDs for a student
     * @param _student Address of the student
     * @return Array of certificate IDs
     */
    function getStudentCertificates(
        address _student
    ) external view returns (uint256[] memory) {
        return studentCertificates[_student];
    }

    /**
     * @dev Get total number of certificates issued
     * @return Total certificate count
     */
    function getTotalCertificates() external view returns (uint256) {
        return nextCertificateId - 1;
    }

    /**
     * @dev Check if a certificate is valid (exists and not revoked)
     * @param _id Certificate ID to check
     * @return isValid Boolean indicating if certificate is valid
     */
    function isCertificateValid(
        uint256 _id
    ) external view returns (bool isValid) {
        if (_id > 0 && _id < nextCertificateId) {
            isValid = !certificates[_id].isRevoked;
        }
    }

    /**
     * @dev Record a transaction in the history
     * @param _type Type of transaction
     * @param _certificateId Related certificate ID
     * @param _party Primary party address
     * @param _relatedParty Related party address
     * @param _details Transaction details
     */
    function _recordTransaction(
        string memory _type,
        uint256 _certificateId,
        address _party,
        address _relatedParty,
        string memory _details
    ) internal {
        transactions[nextTransactionId] = Transaction(
            nextTransactionId,
            _type,
            _certificateId,
            _party,
            _relatedParty,
            _details,
            block.timestamp
        );
        nextTransactionId++;
    }

    /**
     * @dev Get transaction details
     * @param _transactionId ID of the transaction
     */
    function getTransaction(
        uint256 _transactionId
    )
        external
        view
        returns (
            uint256 id,
            string memory transactionType,
            uint256 certificateId,
            address party,
            address relatedParty,
            string memory details,
            uint256 timestamp
        )
    {
        require(
            _transactionId > 0 && _transactionId < nextTransactionId,
            "CertificateRegistry: Transaction does not exist"
        );
        Transaction memory tx = transactions[_transactionId];
        return (
            tx.id,
            tx.transactionType,
            tx.certificateId,
            tx.party,
            tx.relatedParty,
            tx.details,
            tx.timestamp
        );
    }

    /**
     * @dev Get total number of transactions
     * @return Total transaction count
     */
    function getTotalTransactions() external view returns (uint256) {
        return nextTransactionId - 1;
    }

    // =============================================
    // Template Management Functions
    // =============================================

    /**
     * @dev Create a new certificate template
     * @param _templateName Name of the template
     * @param _institutionName Institution name to display
     * @param _institutionLogo IPFS hash of institution logo
     * @param _primaryColor Hex color for primary elements
     * @param _secondaryColor Hex color for secondary elements
     * @param _degreeTypes Array of degree types available
     * @param _includeSpecialization Whether to include specialization field
     * @param _includeGrades Whether to include grades field
     */
    function createTemplate(
        string memory _templateName,
        string memory _institutionName,
        string memory _institutionLogo,
        string memory _primaryColor,
        string memory _secondaryColor,
        string[] memory _degreeTypes,
        bool _includeSpecialization,
        bool _includeGrades
    ) external onlyAuthorizedIssuer returns (uint256) {
        require(
            bytes(_templateName).length > 0,
            "CertificateRegistry: Template name required"
        );
        require(
            bytes(_institutionName).length > 0,
            "CertificateRegistry: Institution name required"
        );
        require(
            institutionTemplateIds[msg.sender].length <
                MAX_TEMPLATES_PER_INSTITUTION,
            "CertificateRegistry: Maximum templates limit reached"
        );

        CertificateTemplate storage template = templates[nextTemplateId];
        template.id = nextTemplateId;
        template.institutionAddress = msg.sender;
        template.templateName = _templateName;
        template.institutionName = _institutionName;
        template.institutionLogo = _institutionLogo;
        template.primaryColor = _primaryColor;
        template.secondaryColor = _secondaryColor;
        template.degreeTypes = _degreeTypes;
        template.includeSpecialization = _includeSpecialization;
        template.includeGrades = _includeGrades;
        template.isActive = true;
        template.createdAt = block.timestamp;

        institutionTemplateIds[msg.sender].push(nextTemplateId);

        emit TemplateCreated(nextTemplateId, msg.sender, _templateName);
        nextTemplateId++;

        return nextTemplateId - 1;
    }

    /**
     * @dev Update an existing template
     * @param _templateId ID of the template to update
     * @param _templateName New template name
     * @param _institutionName New institution name
     * @param _institutionLogo New logo IPFS hash
     * @param _primaryColor New primary color
     * @param _secondaryColor New secondary color
     * @param _degreeTypes New degree types array
     * @param _includeSpecialization New specialization flag
     * @param _includeGrades New grades flag
     */
    function updateTemplate(
        uint256 _templateId,
        string memory _templateName,
        string memory _institutionName,
        string memory _institutionLogo,
        string memory _primaryColor,
        string memory _secondaryColor,
        string[] memory _degreeTypes,
        bool _includeSpecialization,
        bool _includeGrades
    ) external {
        require(
            _templateId > 0 && _templateId < nextTemplateId,
            "CertificateRegistry: Template does not exist"
        );
        require(
            templates[_templateId].institutionAddress == msg.sender,
            "CertificateRegistry: Not the template owner"
        );
        require(
            templates[_templateId].isActive,
            "CertificateRegistry: Template is inactive"
        );

        CertificateTemplate storage template = templates[_templateId];
        template.templateName = _templateName;
        template.institutionName = _institutionName;
        template.institutionLogo = _institutionLogo;
        template.primaryColor = _primaryColor;
        template.secondaryColor = _secondaryColor;
        template.degreeTypes = _degreeTypes;
        template.includeSpecialization = _includeSpecialization;
        template.includeGrades = _includeGrades;

        emit TemplateUpdated(_templateId, msg.sender);
    }

    /**
     * @dev Delete (deactivate) a template
     * @param _templateId ID of the template to delete
     */
    function deleteTemplate(uint256 _templateId) external {
        require(
            _templateId > 0 && _templateId < nextTemplateId,
            "CertificateRegistry: Template does not exist"
        );
        require(
            templates[_templateId].institutionAddress == msg.sender,
            "CertificateRegistry: Not the template owner"
        );

        templates[_templateId].isActive = false;

        emit TemplateDeleted(_templateId, msg.sender);
    }

    /**
     * @dev Get all template IDs for an institution
     * @param _institution Address of the institution
     * @return Array of template IDs
     */
    function getInstitutionTemplates(
        address _institution
    ) external view returns (uint256[] memory) {
        return institutionTemplateIds[_institution];
    }

    /**
     * @dev Get template details
     * @param _templateId ID of the template
     */
    function getTemplate(
        uint256 _templateId
    )
        external
        view
        returns (
            uint256 id,
            address institutionAddress,
            string memory templateName,
            string memory institutionName,
            string memory institutionLogo,
            string memory primaryColor,
            string memory secondaryColor,
            bool includeSpecialization,
            bool includeGrades,
            bool isActive,
            uint256 createdAt
        )
    {
        require(
            _templateId > 0 && _templateId < nextTemplateId,
            "CertificateRegistry: Template does not exist"
        );

        CertificateTemplate memory template = templates[_templateId];
        return (
            template.id,
            template.institutionAddress,
            template.templateName,
            template.institutionName,
            template.institutionLogo,
            template.primaryColor,
            template.secondaryColor,
            template.includeSpecialization,
            template.includeGrades,
            template.isActive,
            template.createdAt
        );
    }

    /**
     * @dev Get degree types for a template
     * @param _templateId ID of the template
     * @return Array of degree types
     */
    function getTemplateDegreeTypes(
        uint256 _templateId
    ) external view returns (string[] memory) {
        require(
            _templateId > 0 && _templateId < nextTemplateId,
            "CertificateRegistry: Template does not exist"
        );
        return templates[_templateId].degreeTypes;
    }

    /**
     * @dev Get total number of templates
     * @return Total template count
     */
    function getTotalTemplates() external view returns (uint256) {
        return nextTemplateId - 1;
    }

    /**
     * @dev Issue a certificate using a template
     * @param _studentAddress Student wallet address
     * @param _studentName Student full name
     * @param _degree Degree/certificate name
     * @param _specialization Specialization (if enabled in template)
     * @param _ipfsHash IPFS hash of certificate document
     * @param _templateId ID of the template to use
     */
    function issueCertificateWithTemplate(
        address _studentAddress,
        string memory _studentName,
        string memory _degree,
        string memory _specialization,
        string memory _ipfsHash,
        uint256 _templateId
    ) external onlyAuthorizedIssuer nonReentrant {
        require(
            _templateId > 0 && _templateId < nextTemplateId,
            "CertificateRegistry: Template does not exist"
        );
        require(
            templates[_templateId].isActive,
            "CertificateRegistry: Template is inactive"
        );

        CertificateTemplate memory template = templates[_templateId];

        Certificate storage cert = certificates[nextCertificateId];
        cert.id = nextCertificateId;
        cert.studentAddress = _studentAddress;
        cert.studentName = _studentName;
        cert.institution = template.institutionName;
        cert.degree = _degree;
        cert.specialization = _specialization;
        cert.issueDate = block.timestamp;
        cert.ipfsHash = _ipfsHash;
        cert.isRevoked = false;
        cert.issuer = msg.sender;
        cert.templateId = _templateId;

        studentCertificates[_studentAddress].push(nextCertificateId);

        _recordTransaction(
            "ISSUED",
            nextCertificateId,
            msg.sender,
            _studentAddress,
            _degree
        );

        emit CertificateIssued(
            nextCertificateId,
            _studentAddress,
            _studentName,
            template.institutionName,
            _degree,
            _templateId
        );

        nextCertificateId++;
    }
}
