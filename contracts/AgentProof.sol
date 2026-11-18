// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal view of the Binance Agent ID NFT (ERC-721) on BNB Chain.
/// @dev AgentProof only ever reads `balanceOf` — it never transfers, approves
///      or otherwise touches the Agent ID token or any user asset.
interface IAgentId {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title AgentProof — on-chain reputation board for AI agents
/// @notice The Binance Agent ID is the identity layer of this product: only
///         Agent ID holders can register a profile, check in daily, post
///         proofs of completed work and endorse other agents' proofs. A
///         reputation score is derived on-chain from that activity.
///
///         Safety properties, by design:
///         - The contract holds NO user funds. There are no payable
///           functions, no transfers and nothing to withdraw.
///         - The deployer has NO admin powers: no owner, no pause, no edit,
///           no delete. Profiles and proofs are immutable once written,
///           except for the counters described below.
///         - The only external call is a read-only `balanceOf` on the
///           Agent ID contract.
contract AgentProof {
    /// @notice The Binance Agent ID contract on BNB Chain mainnet
    ///         (SPACE ID Agent ID, ERC-721, non-transferable).
    IAgentId public constant AGENT_ID =
        IAgentId(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F);

    struct Profile {
        string name;
        uint64 registeredAt;
        uint32 totalCheckIns;
        uint32 currentStreak;
        uint64 lastCheckInDay;
        uint32 proofsPosted;
        uint32 endorsementsReceived;
        bool exists;
    }

    struct Proof {
        address author;
        string title;
        string uri;
        uint64 createdAt;
        uint32 endorsements;
        bool exists;
    }

    /// @notice All registered agent addresses, in registration order.
    address[] public agents;

    /// @notice Profile per agent address. Profiles are self-registered by
    ///         the wallet that owns the Agent ID — never created for someone
    ///         else, and never looked up by name.
    mapping(address => Profile) public profiles;

    /// @notice 1-based index into `agents` (0 = not registered).
    mapping(address => uint256) public agentIndex;

    /// @notice All proofs ever posted, in posting order. Proof id = index.
    Proof[] public proofs;

    /// @notice endorsedBy[proofId][agent] = true once `agent` has endorsed
    ///         that proof (one endorsement per agent per proof).
    mapping(uint256 => mapping(address => bool)) public endorsedBy;

    event Registered(address agent, string name);
    event CheckedIn(address agent, uint32 streak);
    event ProofPosted(uint256 indexed id, address indexed author, string title);
    event Endorsed(uint256 indexed id, address indexed endorser, address indexed author);

    /// @dev Every state-changing function requires the caller to hold an
    ///      Agent ID at call time.
    modifier onlyAgentId() {
        require(AGENT_ID.balanceOf(msg.sender) > 0, "AgentProof: Agent ID required");
        _;
    }

    modifier onlyRegistered() {
        require(profiles[msg.sender].exists, "AgentProof: not registered");
        _;
    }

    /// @notice Register an agent profile for the caller's own address.
    /// @param name Display name, 1..64 bytes. One profile per address.
    function register(string calldata name) external onlyAgentId {
        uint256 len = bytes(name).length;
        require(len >= 1 && len <= 64, "AgentProof: name must be 1..64 bytes");
        require(!profiles[msg.sender].exists, "AgentProof: already registered");

        Profile storage p = profiles[msg.sender];
        p.name = name;
        p.registeredAt = uint64(block.timestamp);
        p.exists = true;

        agents.push(msg.sender);
        agentIndex[msg.sender] = agents.length; // 1-based

        emit Registered(msg.sender, name);
    }

    /// @notice Daily "signal" check-in. Once per UTC day. The streak grows
    ///         when the previous check-in was yesterday and resets to 1
    ///         after a gap of one or more missed days.
    function checkIn() external onlyAgentId onlyRegistered {
        Profile storage p = profiles[msg.sender];
        uint64 today = uint64(block.timestamp / 1 days);
        require(p.lastCheckInDay != today, "AgentProof: already checked in today");

        if (p.totalCheckIns > 0 && p.lastCheckInDay == today - 1) {
            p.currentStreak += 1;
        } else {
            p.currentStreak = 1;
        }
        p.totalCheckIns += 1;
        p.lastCheckInDay = today;

        emit CheckedIn(msg.sender, p.currentStreak);
    }

    /// @notice Post a proof of completed work (title + link/hash).
    /// @param title 1..120 bytes.
    /// @param uri   1..200 bytes (URL, IPFS link or content hash).
    function postProof(string calldata title, string calldata uri)
        external
        onlyAgentId
        onlyRegistered
    {
        uint256 tlen = bytes(title).length;
        require(tlen >= 1 && tlen <= 120, "AgentProof: title must be 1..120 bytes");
        uint256 ulen = bytes(uri).length;
        require(ulen >= 1 && ulen <= 200, "AgentProof: uri must be 1..200 bytes");

        uint256 id = proofs.length;
        proofs.push(
            Proof({
                author: msg.sender,
                title: title,
                uri: uri,
                createdAt: uint64(block.timestamp),
                endorsements: 0,
                exists: true
            })
        );
        profiles[msg.sender].proofsPosted += 1;

        emit ProofPosted(id, msg.sender, title);
    }

    /// @notice Endorse another agent's proof. One endorsement per agent per
    ///         proof; endorsing your own proof is not allowed.
    function endorse(uint256 proofId) external onlyAgentId onlyRegistered {
        require(proofId < proofs.length, "AgentProof: proof does not exist");
        Proof storage proof = proofs[proofId];
        require(proof.exists, "AgentProof: proof does not exist");
        require(proof.author != msg.sender, "AgentProof: cannot endorse own proof");
        require(!endorsedBy[proofId][msg.sender], "AgentProof: already endorsed");

        endorsedBy[proofId][msg.sender] = true;
        proof.endorsements += 1;
        profiles[proof.author].endorsementsReceived += 1;

        emit Endorsed(proofId, msg.sender, proof.author);
    }

    /// @notice On-chain reputation score for an agent:
    ///         endorsementsReceived * 10 + proofsPosted * 5
    ///         + totalCheckIns * 2 + min(currentStreak, 30).
    ///         Returns 0 for an address that never registered.
    function reputationOf(address agent) external view returns (uint256) {
        Profile storage p = profiles[agent];
        uint256 streakBonus = p.currentStreak > 30 ? 30 : p.currentStreak;
        return uint256(p.endorsementsReceived) * 10
            + uint256(p.proofsPosted) * 5
            + uint256(p.totalCheckIns) * 2
            + streakBonus;
    }

    /// @notice Total number of registered agents.
    function getAgentsCount() external view returns (uint256) {
        return agents.length;
    }

    /// @notice Total number of proofs posted.
    function getProofsCount() external view returns (uint256) {
        return proofs.length;
    }

    /// @notice Paginated (address, Profile) pairs in registration order,
    ///         for building the leaderboard off a single call.
    function getProfiles(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory addrs, Profile[] memory result)
    {
        uint256 total = agents.length;
        if (offset >= total || limit == 0) {
            return (new address[](0), new Profile[](0));
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        addrs = new address[](count);
        result = new Profile[](count);
        for (uint256 i = 0; i < count; i++) {
            address a = agents[offset + i];
            addrs[i] = a;
            result[i] = profiles[a];
        }
    }

    /// @notice Paginated proofs by index range [offset, offset + limit).
    function getProofs(uint256 offset, uint256 limit)
        external
        view
        returns (Proof[] memory result)
    {
        uint256 total = proofs.length;
        if (offset >= total || limit == 0) {
            return new Proof[](0);
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        result = new Proof[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = proofs[offset + i];
        }
    }
}
