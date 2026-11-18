const hre = require("hardhat");
const fs = require("fs");
async function main() {
  const art = await hre.artifacts.readArtifact("AgentProof");
  const initCode = art.bytecode; // 0x-prefixed creation bytecode, no constructor args
  const PROXY = "0x4e59b44847b379578588920cA78FbF26c0B4956C"; // deterministic CREATE2 deployment proxy (present on BSC)
  const salt = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("AgentProof-v1"));
  const initCodeHash = hre.ethers.keccak256(initCode);
  const predicted = hre.ethers.getCreate2Address(PROXY, salt, initCodeHash);
  const calldata = salt + initCode.slice(2); // proxy expects: salt (32 bytes) ++ initCode
  fs.mkdirSync("deploy", { recursive: true });
  fs.writeFileSync("deploy/calldata.json", JSON.stringify({ proxy: PROXY, salt, predicted, calldata }, null, 2));
  console.log("salt:", salt);
  console.log("predicted contract address:", predicted);
  console.log("calldata bytes:", (calldata.length - 2) / 2);
}
main().catch((e) => { console.error(e); process.exit(1); });
