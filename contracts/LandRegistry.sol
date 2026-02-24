// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LandRegistry
 * @dev Smart contract for registering and managing land ownership on blockchain
 */
contract LandRegistry is Ownable, ReentrancyGuard {
    // Land Structure
    struct Land {
        uint256 landId;
        address owner;
        string area;
        string location;
        string city;
        string state;
        string country;
        string ipfsHash; // Title deed document
        uint256 registrationDate;
        bool isActive;
        bool isDisputed;
    }

    // Transaction History Structure
    struct Transaction {
        uint256 id;
        string transactionType; // "REGISTERED", "TRANSFERRED", "STATUS_CHANGED", "DISPUTED", "AUTHORIZED_REGISTRAR", "REVOKED_REGISTRAR"
        uint256 landId;
        address party;
        address relatedParty; // For transfers, the new owner
        string details;
        uint256 timestamp;
    }

    // State Variables
    mapping(uint256 => Land) public lands;
    mapping(address => uint256[]) public ownerLands;
    mapping(address => bool) public authorizedRegistrars;
    uint256 public nextLandId;

    // Transaction History
    mapping(uint256 => Transaction) public transactions;
    uint256 public nextTransactionId;

    // Events
    event LandRegistered(
        uint256 indexed landId,
        address indexed owner,
        string location
    );
    event OwnershipTransferred(
        uint256 indexed landId,
        address indexed previousOwner,
        address indexed newOwner
    );
    event LandStatusChanged(uint256 indexed landId, bool isActive);
    event LandDisputed(uint256 indexed landId);
    event RegistrarAuthorized(address indexed registrar);
    event RegistrarRevoked(address indexed registrar);

    // Modifiers
    modifier onlyAuthorizedRegistrar() {
        require(
            authorizedRegistrars[msg.sender] || msg.sender == owner(),
            "LandRegistry: Not authorized to register land"
        );
        _;
    }

    modifier onlyLandOwner(uint256 _landId) {
        require(
            lands[_landId].owner == msg.sender,
            "LandRegistry: Not the land owner"
        );
        _;
    }

    // Constructor
    constructor() {
        authorizedRegistrars[msg.sender] = true;
        nextLandId = 1;
        nextTransactionId = 1;
    }

    /**
     * @dev Authorize a new registrar (government authority)
     * @param _registrar Address to authorize
     */
    function authorizeRegistrar(address _registrar) external onlyOwner {
        require(
            _registrar != address(0),
            "LandRegistry: Invalid registrar address"
        );
        authorizedRegistrars[_registrar] = true;
        _recordTransaction(
            "AUTHORIZED_REGISTRAR",
            0,
            _registrar,
            msg.sender,
            "Registrar authorized to register land"
        );
        emit RegistrarAuthorized(_registrar);
    }

    /**
     * @dev Revoke a registrar's authorization
     * @param _registrar Address to revoke
     */
    function revokeRegistrar(address _registrar) external onlyOwner {
        require(
            _registrar != address(0),
            "LandRegistry: Invalid registrar address"
        );
        authorizedRegistrars[_registrar] = false;
        _recordTransaction(
            "REVOKED_REGISTRAR",
            0,
            _registrar,
            msg.sender,
            "Registrar authorization revoked"
        );
        emit RegistrarRevoked(_registrar);
    }

    /**
     * @dev Register a new land parcel
     * @param _owner Address of the land owner
     * @param _area Area of the land (e.g., "500 sq meters")
     * @param _location Physical location/address
     * @param _city City name
     * @param _state State name
     * @param _country Country name
     * @param _ipfsHash IPFS hash of title deed document
     */
    function registerLand(
        address _owner,
        string memory _area,
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _country,
        string memory _ipfsHash
    ) external onlyAuthorizedRegistrar nonReentrant {
        require(_owner != address(0), "LandRegistry: Invalid owner address");
        require(bytes(_area).length > 0, "LandRegistry: Area required");
        require(bytes(_location).length > 0, "LandRegistry: Location required");
        require(
            bytes(_ipfsHash).length > 0,
            "LandRegistry: IPFS hash required"
        );

        Land storage land = lands[nextLandId];
        land.landId = nextLandId;
        land.owner = _owner;
        land.area = _area;
        land.location = _location;
        land.city = _city;
        land.state = _state;
        land.country = _country;
        land.ipfsHash = _ipfsHash;
        land.registrationDate = block.timestamp;
        land.isActive = true;
        land.isDisputed = false;

        ownerLands[_owner].push(nextLandId);

        _recordTransaction(
            "REGISTERED",
            nextLandId,
            _owner,
            msg.sender,
            _location
        );

        emit LandRegistered(nextLandId, _owner, _location);

        nextLandId++;
    }

    /**
     * @dev Transfer land ownership to a new owner
     * @param _landId ID of the land to transfer
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(
        uint256 _landId,
        address _newOwner
    ) external onlyLandOwner(_landId) nonReentrant {
        require(
            _newOwner != address(0),
            "LandRegistry: Invalid new owner address"
        );
        require(lands[_landId].isActive, "LandRegistry: Land is not active");
        require(
            !lands[_landId].isDisputed,
            "LandRegistry: Land is under dispute"
        );

        address previousOwner = lands[_landId].owner;

        // Remove from previous owner's list
        _removeFromOwnerList(previousOwner, _landId);

        // Update ownership
        lands[_landId].owner = _newOwner;
        ownerLands[_newOwner].push(_landId);

        _recordTransaction(
            "TRANSFERRED",
            _landId,
            previousOwner,
            _newOwner,
            "Ownership transferred"
        );

        emit OwnershipTransferred(_landId, previousOwner, _newOwner);
    }

    /**
     * @dev Get complete land details
     * @param _landId ID of the land
     */
    function getLandDetails(
        uint256 _landId
    )
        external
        view
        returns (
            address owner,
            string memory area,
            string memory location,
            string memory city,
            string memory state,
            string memory country,
            string memory ipfsHash,
            uint256 registrationDate,
            bool isActive,
            bool isDisputed
        )
    {
        require(
            _landId > 0 && _landId < nextLandId,
            "LandRegistry: Land does not exist"
        );

        Land memory land = lands[_landId];
        return (
            land.owner,
            land.area,
            land.location,
            land.city,
            land.state,
            land.country,
            land.ipfsHash,
            land.registrationDate,
            land.isActive,
            land.isDisputed
        );
    }

    /**
     * @dev Set land active status (government only)
     * @param _landId ID of the land
     * @param _isActive Active status to set
     */
    function setLandStatus(
        uint256 _landId,
        bool _isActive
    ) external onlyAuthorizedRegistrar {
        require(
            _landId > 0 && _landId < nextLandId,
            "LandRegistry: Land does not exist"
        );
        lands[_landId].isActive = _isActive;
        string memory status = _isActive
            ? "Land activated"
            : "Land deactivated";
        _recordTransaction(
            "STATUS_CHANGED",
            _landId,
            msg.sender,
            lands[_landId].owner,
            status
        );
        emit LandStatusChanged(_landId, _isActive);
    }

    /**
     * @dev Mark land as disputed
     * @param _landId ID of the land
     */
    function disputeLand(uint256 _landId) external onlyAuthorizedRegistrar {
        require(
            _landId > 0 && _landId < nextLandId,
            "LandRegistry: Land does not exist"
        );
        lands[_landId].isDisputed = true;
        _recordTransaction(
            "DISPUTED",
            _landId,
            msg.sender,
            lands[_landId].owner,
            "Land marked as disputed"
        );
        emit LandDisputed(_landId);
    }

    /**
     * @dev Get all land IDs owned by an address
     * @param _owner Address to query
     * @return Array of land IDs
     */
    function getOwnerLands(
        address _owner
    ) external view returns (uint256[] memory) {
        return ownerLands[_owner];
    }

    /**
     * @dev Get total number of registered lands
     * @return Total land count
     */
    function getTotalLands() external view returns (uint256) {
        return nextLandId - 1;
    }

    /**
     * @dev Helper function to remove land from owner's list
     * @param _owner Address of the owner
     * @param _landId ID of the land to remove
     */
    function _removeFromOwnerList(address _owner, uint256 _landId) internal {
        uint256[] storage landList = ownerLands[_owner];
        for (uint256 i = 0; i < landList.length; i++) {
            if (landList[i] == _landId) {
                landList[i] = landList[landList.length - 1];
                landList.pop();
                break;
            }
        }
    }

    /**
     * @dev Record a transaction in the history
     * @param _type Type of transaction
     * @param _landId Related land ID
     * @param _party Primary party address
     * @param _relatedParty Related party address
     * @param _details Transaction details
     */
    function _recordTransaction(
        string memory _type,
        uint256 _landId,
        address _party,
        address _relatedParty,
        string memory _details
    ) internal {
        transactions[nextTransactionId] = Transaction(
            nextTransactionId,
            _type,
            _landId,
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
            uint256 landId,
            address party,
            address relatedParty,
            string memory details,
            uint256 timestamp
        )
    {
        require(
            _transactionId > 0 && _transactionId < nextTransactionId,
            "LandRegistry: Transaction does not exist"
        );
        Transaction memory tx = transactions[_transactionId];
        return (
            tx.id,
            tx.transactionType,
            tx.landId,
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
}
