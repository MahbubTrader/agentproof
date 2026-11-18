// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice TEST-ONLY stub of the Binance Agent ID ERC-721 contract.
/// @dev This contract exists purely so the Hardhat test-suite can simulate
///      Agent ID ownership locally. It is NOT part of the product and must
///      never be deployed to mainnet — AgentProof points at the real Agent
///      ID contract (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F).
///
///      The test-suite copies this contract's runtime bytecode onto the real
///      Agent ID address with Hardhat's `hardhat_setCode`, then calls
///      `mint` through that address so `AgentProof`'s `balanceOf` checks
///      see the simulated balances.
contract MockAgentId {
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _owners;
    uint256 private _nextTokenId = 1;

    /// @notice Give `to` one (more) Agent ID. Permissionless on purpose —
    ///         this stub is only ever used on a local test network.
    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
}
