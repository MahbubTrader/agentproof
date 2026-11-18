const hre = require("hardhat");
async function main() {
  const AP = await hre.ethers.getContractFactory("AgentProof");
  const ap = await AP.deploy();
  const arc = await ap.deploymentTransaction().wait();
  console.log("AgentProof deploy gas:", arc.gasUsed.toString());
  const code = await hre.ethers.provider.getCode(await ap.getAddress());
  console.log("AgentProof runtime bytes:", (code.length - 2) / 2);
  const art = await hre.artifacts.readArtifact("AgentProof");
  console.log("Creation bytecode bytes:", (art.bytecode.length - 2) / 2);
}
main().catch((e) => { console.error(e); process.exit(1); });
