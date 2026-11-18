const { expect } = require("chai");
const { ethers } = require("hardhat");

// The real Binance Agent ID contract address on BNB Chain mainnet.
// AgentProof has this address as a compile-time constant, so the tests copy
// MockAgentId's runtime bytecode onto it (hardhat_setCode) and then use the
// mock's mint() through that address to simulate Agent ID ownership.
const AGENT_ID_ADDRESS = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const DAY = 86400;

describe("AgentProof", function () {
  let agentProof;
  let agentId; // MockAgentId attached at the real Agent ID address
  let deployer, alice, bob, carol, dave, erin, stranger;
  let snapshotId;

  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async function mintId(account) {
    await agentId.mint(account.address);
  }

  async function registerAs(account, name) {
    await mintId(account);
    await agentProof.connect(account).register(name);
  }

  before(async function () {
    [deployer, alice, bob, carol, dave, erin, stranger] =
      await ethers.getSigners();

    const mockImpl = await ethers.deployContract("MockAgentId");
    const code = await ethers.provider.getCode(await mockImpl.getAddress());
    await ethers.provider.send("hardhat_setCode", [AGENT_ID_ADDRESS, code]);
    agentId = await ethers.getContractAt("MockAgentId", AGENT_ID_ADDRESS);

    agentProof = await ethers.deployContract("AgentProof");
  });

  // Every test runs against the pristine post-deployment state.
  beforeEach(async function () {
    snapshotId = await ethers.provider.send("evm_snapshot");
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Agent ID gating", function () {
    it("reverts register for a non-holder", async function () {
      await expect(agentProof.connect(stranger).register("Nope"))
        .to.be.revertedWith("AgentProof: Agent ID required");
    });

    it("reverts checkIn for a non-holder", async function () {
      await expect(agentProof.connect(stranger).checkIn())
        .to.be.revertedWith("AgentProof: Agent ID required");
    });

    it("reverts postProof for a non-holder", async function () {
      await expect(agentProof.connect(stranger).postProof("t", "u"))
        .to.be.revertedWith("AgentProof: Agent ID required");
    });

    it("reverts endorse for a non-holder", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).postProof("Work", "ipfs://proof");
      await expect(agentProof.connect(stranger).endorse(0))
        .to.be.revertedWith("AgentProof: Agent ID required");
    });

    it("reverts checkIn for a holder who never registered", async function () {
      await mintId(dave);
      await expect(agentProof.connect(dave).checkIn())
        .to.be.revertedWith("AgentProof: not registered");
    });

    it("reverts postProof for a holder who never registered", async function () {
      await mintId(dave);
      await expect(agentProof.connect(dave).postProof("t", "u"))
        .to.be.revertedWith("AgentProof: not registered");
    });

    it("reverts endorse for a holder who never registered", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).postProof("Work", "ipfs://proof");
      await mintId(dave);
      await expect(agentProof.connect(dave).endorse(0))
        .to.be.revertedWith("AgentProof: not registered");
    });
  });

  describe("register", function () {
    it("registers a holder once and stores the profile", async function () {
      await mintId(alice);
      await expect(agentProof.connect(alice).register("AliceAgent"))
        .to.emit(agentProof, "Registered")
        .withArgs(alice.address, "AliceAgent");

      const p = await agentProof.profiles(alice.address);
      expect(p.name).to.equal("AliceAgent");
      expect(p.exists).to.equal(true);
      expect(Number(p.registeredAt)).to.be.greaterThan(0);
      expect(Number(p.totalCheckIns)).to.equal(0);
      expect(Number(p.proofsPosted)).to.equal(0);
      expect(Number(p.endorsementsReceived)).to.equal(0);

      expect(await agentProof.getAgentsCount()).to.equal(1n);
      expect(await agentProof.agents(0)).to.equal(alice.address);
      expect(await agentProof.agentIndex(alice.address)).to.equal(1n);
      expect(await agentProof.agentIndex(stranger.address)).to.equal(0n);
    });

    it("reverts a second registration from the same address", async function () {
      await registerAs(alice, "AliceAgent");
      await expect(agentProof.connect(alice).register("AliceAgain"))
        .to.be.revertedWith("AgentProof: already registered");
    });

    it("reverts an empty name and a name over 64 bytes", async function () {
      await mintId(alice);
      await expect(agentProof.connect(alice).register(""))
        .to.be.revertedWith("AgentProof: name must be 1..64 bytes");
      await expect(agentProof.connect(alice).register("a".repeat(65)))
        .to.be.revertedWith("AgentProof: name must be 1..64 bytes");
    });

    it("accepts a name of exactly 64 bytes", async function () {
      await mintId(alice);
      await agentProof.connect(alice).register("a".repeat(64));
      const p = await agentProof.profiles(alice.address);
      expect(p.name).to.equal("a".repeat(64));
    });
  });

  describe("checkIn", function () {
    it("records the first check-in with streak 1", async function () {
      await registerAs(alice, "AliceAgent");
      await expect(agentProof.connect(alice).checkIn())
        .to.emit(agentProof, "CheckedIn")
        .withArgs(alice.address, 1);

      const p = await agentProof.profiles(alice.address);
      expect(Number(p.totalCheckIns)).to.equal(1);
      expect(Number(p.currentStreak)).to.equal(1);
    });

    it("reverts a second check-in on the same UTC day", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).checkIn();
      await expect(agentProof.connect(alice).checkIn())
        .to.be.revertedWith("AgentProof: already checked in today");
    });

    it("grows the streak on consecutive days", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).checkIn();
      await increaseTime(DAY);
      await expect(agentProof.connect(alice).checkIn())
        .to.emit(agentProof, "CheckedIn")
        .withArgs(alice.address, 2);

      const p = await agentProof.profiles(alice.address);
      expect(Number(p.totalCheckIns)).to.equal(2);
      expect(Number(p.currentStreak)).to.equal(2);
    });

    it("resets the streak to 1 after a gap day", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).checkIn(); // day 0, streak 1
      await increaseTime(DAY);
      await agentProof.connect(alice).checkIn(); // day 1, streak 2
      await increaseTime(2 * DAY);
      await expect(agentProof.connect(alice).checkIn()) // day 3, gap -> 1
        .to.emit(agentProof, "CheckedIn")
        .withArgs(alice.address, 1);

      const p = await agentProof.profiles(alice.address);
      expect(Number(p.totalCheckIns)).to.equal(3);
      expect(Number(p.currentStreak)).to.equal(1);
    });
  });

  describe("postProof", function () {
    it("stores the proof and counts it", async function () {
      await registerAs(alice, "AliceAgent");
      await expect(
        agentProof.connect(alice).postProof("Built a thing", "ipfs://proof0")
      )
        .to.emit(agentProof, "ProofPosted")
        .withArgs(0, alice.address, "Built a thing");

      expect(await agentProof.getProofsCount()).to.equal(1n);
      const proof = await agentProof.proofs(0);
      expect(proof.author).to.equal(alice.address);
      expect(proof.title).to.equal("Built a thing");
      expect(proof.uri).to.equal("ipfs://proof0");
      expect(Number(proof.endorsements)).to.equal(0);
      expect(proof.exists).to.equal(true);
      expect(Number(proof.createdAt)).to.be.greaterThan(0);

      const p = await agentProof.profiles(alice.address);
      expect(Number(p.proofsPosted)).to.equal(1);
    });

    it("enforces title and uri length limits", async function () {
      await registerAs(alice, "AliceAgent");
      await expect(agentProof.connect(alice).postProof("", "ipfs://x"))
        .to.be.revertedWith("AgentProof: title must be 1..120 bytes");
      await expect(
        agentProof.connect(alice).postProof("a".repeat(121), "ipfs://x")
      ).to.be.revertedWith("AgentProof: title must be 1..120 bytes");
      await expect(agentProof.connect(alice).postProof("ok", ""))
        .to.be.revertedWith("AgentProof: uri must be 1..200 bytes");
      await expect(
        agentProof.connect(alice).postProof("ok", "a".repeat(201))
      ).to.be.revertedWith("AgentProof: uri must be 1..200 bytes");
    });
  });

  describe("endorse", function () {
    beforeEach(async function () {
      await registerAs(alice, "AliceAgent");
      await registerAs(bob, "BobAgent");
      await registerAs(carol, "CarolAgent");
      await agentProof.connect(alice).postProof("Work", "ipfs://proof0");
    });

    it("lets another registered agent endorse once", async function () {
      await expect(agentProof.connect(bob).endorse(0))
        .to.emit(agentProof, "Endorsed")
        .withArgs(0, bob.address, alice.address);

      const proof = await agentProof.proofs(0);
      expect(Number(proof.endorsements)).to.equal(1);
      const p = await agentProof.profiles(alice.address);
      expect(Number(p.endorsementsReceived)).to.equal(1);
      expect(await agentProof.endorsedBy(0, bob.address)).to.equal(true);
    });

    it("reverts endorsing your own proof", async function () {
      await expect(agentProof.connect(alice).endorse(0))
        .to.be.revertedWith("AgentProof: cannot endorse own proof");
    });

    it("reverts a second endorsement of the same proof", async function () {
      await agentProof.connect(bob).endorse(0);
      await expect(agentProof.connect(bob).endorse(0))
        .to.be.revertedWith("AgentProof: already endorsed");
    });

    it("allows different agents to endorse the same proof", async function () {
      await agentProof.connect(bob).endorse(0);
      await agentProof.connect(carol).endorse(0);
      const proof = await agentProof.proofs(0);
      expect(Number(proof.endorsements)).to.equal(2);
      const p = await agentProof.profiles(alice.address);
      expect(Number(p.endorsementsReceived)).to.equal(2);
    });

    it("reverts endorsing a proof that does not exist", async function () {
      await expect(agentProof.connect(bob).endorse(99))
        .to.be.revertedWith("AgentProof: proof does not exist");
    });
  });

  describe("reputationOf", function () {
    it("is 0 for an address that never registered", async function () {
      expect(await agentProof.reputationOf(stranger.address)).to.equal(0n);
    });

    it("matches the formula: endorsements*10 + proofs*5 + checkIns*2 + streak", async function () {
      await registerAs(alice, "AliceAgent");
      await registerAs(bob, "BobAgent");
      await registerAs(carol, "CarolAgent");

      await agentProof.connect(alice).checkIn(); // totalCheckIns 1, streak 1
      await agentProof.connect(alice).postProof("P0", "ipfs://0");
      await agentProof.connect(alice).postProof("P1", "ipfs://1"); // proofs 2
      await agentProof.connect(bob).endorse(0);
      await agentProof.connect(carol).endorse(0);
      await agentProof.connect(bob).endorse(1); // endorsementsReceived 3

      // 3*10 + 2*5 + 1*2 + min(1, 30) = 43
      expect(await agentProof.reputationOf(alice.address)).to.equal(43n);

      await increaseTime(DAY);
      await agentProof.connect(alice).checkIn(); // totalCheckIns 2, streak 2
      // 3*10 + 2*5 + 2*2 + min(2, 30) = 46
      expect(await agentProof.reputationOf(alice.address)).to.equal(46n);
    });

    it("caps the streak bonus at 30", async function () {
      await registerAs(alice, "AliceAgent");
      for (let i = 0; i < 35; i++) {
        await agentProof.connect(alice).checkIn();
        if (i < 34) await increaseTime(DAY);
      }
      const p = await agentProof.profiles(alice.address);
      expect(Number(p.currentStreak)).to.equal(35);
      expect(Number(p.totalCheckIns)).to.equal(35);
      // 0*10 + 0*5 + 35*2 + min(35, 30) = 100
      expect(await agentProof.reputationOf(alice.address)).to.equal(100n);
    });
  });

  describe("pagination views", function () {
    it("getProfiles returns correct slices in registration order", async function () {
      const accounts = [alice, bob, carol, dave, erin];
      const names = ["AgentA", "AgentB", "AgentC", "AgentD", "AgentE"];
      for (let i = 0; i < accounts.length; i++) {
        await registerAs(accounts[i], names[i]);
      }
      expect(await agentProof.getAgentsCount()).to.equal(5n);

      let [addrs, profs] = await agentProof.getProfiles(0, 2);
      expect(addrs.length).to.equal(2);
      expect(addrs[0]).to.equal(alice.address);
      expect(addrs[1]).to.equal(bob.address);
      expect(profs[0].name).to.equal("AgentA");
      expect(profs[1].name).to.equal("AgentB");

      [addrs, profs] = await agentProof.getProfiles(2, 2);
      expect(addrs.length).to.equal(2);
      expect(addrs[0]).to.equal(carol.address);
      expect(addrs[1]).to.equal(dave.address);
      expect(profs[1].name).to.equal("AgentD");

      [addrs, profs] = await agentProof.getProfiles(4, 10);
      expect(addrs.length).to.equal(1);
      expect(addrs[0]).to.equal(erin.address);
      expect(profs[0].name).to.equal("AgentE");

      [addrs, profs] = await agentProof.getProfiles(5, 10);
      expect(addrs.length).to.equal(0);
      expect(profs.length).to.equal(0);
    });

    it("getProofs returns correct slices by index range", async function () {
      await registerAs(alice, "AliceAgent");
      await agentProof.connect(alice).postProof("P0", "ipfs://0");
      await agentProof.connect(alice).postProof("P1", "ipfs://1");
      await agentProof.connect(alice).postProof("P2", "ipfs://2");
      expect(await agentProof.getProofsCount()).to.equal(3n);

      let slice = await agentProof.getProofs(0, 2);
      expect(slice.length).to.equal(2);
      expect(slice[0].title).to.equal("P0");
      expect(slice[1].title).to.equal("P1");
      expect(slice[0].author).to.equal(alice.address);

      slice = await agentProof.getProofs(2, 2);
      expect(slice.length).to.equal(1);
      expect(slice[0].title).to.equal("P2");

      slice = await agentProof.getProofs(3, 1);
      expect(slice.length).to.equal(0);
    });
  });
});
