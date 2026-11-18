# AgentProof — deployment record

- Contract: **0xE14E3247ccb686e5C7d924308B4f576B8C90D3b1** (BNB Chain mainnet, chainId 56)
- Deployed: 2026-11-18 ~14:57 Dhaka, from Tanvir's Agentic Wallet
  0x0FeAAcAa1056C8E1def8Ea9c0a57F3A177e79065 (basewallet.ai)
- Method: CREATE2 via the deterministic deployment proxy
  0x4e59b44847b379578588920cA78FbF26c0B4956C (baw has no direct deploy command;
  the proxy call was previewed clean — no risks, no balance/authority changes —
  then executed under Tanvir's full-permission instruction for this event).
- Salt: 0xdf2b622a175cf15aa22d15c0ccbf7c327a4d7f70a0bf60828b4a5a516770a288
  (= keccak256("AgentProof-v1")); calldata in deploy/calldata.json.
- Tx: 0x2fc8449b26736a0f06029048bb7d7f9042a4857bf8a5bf87cb300b82fb93febc
  (orderId 26111800002062162668), receipt status 0x1, gasUsed 1,880,747
  (~0.000094 BNB at 0.05 gwei ≈ $0.08).
- Verified on-chain by Baby: runtime code 8,441 bytes at the predicted address
  (matches local build exactly); AGENT_ID() = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
  getAgentsCount() = 0; getProofsCount() = 0.
- BscScan: https://bscscan.com/address/0xE14E3247ccb686e5C7d924308B4f576B8C90D3b1
