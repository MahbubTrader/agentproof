/* AgentProof dApp — plain script, no build step. Requires ethers v6 UMD (window.ethers). */
"use strict";

/* ============================== CONFIG ============================== */
const CONFIG = {
  // !!! CONTRACT ADDRESS — PLACEHOLDER !!!
  // Set this to the deployed AgentProof contract address after deployment.
  // While it is the zero address, the dApp runs in "not deployed yet" mode:
  // the board renders its empty state and no contract calls are made.
  CONTRACT_ADDRESS: "0xE14E3247ccb686e5C7d924308B4f576B8C90D3b1",
  // Binance Agent ID (name.ai) ERC-721 contract on BNB Chain.
  AGENT_ID_ADDRESS: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  BSC_CHAIN_ID: 56,
  BSC_CHAIN_ID_HEX: "0x38",
  // Public BSC RPC used for read-only calls when no wallet is connected.
  BSC_RPC: "https://bsc-dataseed.bnbchain.org",
  BSC_EXPLORER: "https://bscscan.com",
  PAGE_SIZE: 50, // pagination size for getProfiles / getProofs
};

/* ============================== ABIs ============================== */
/* Full AgentProof ABI, copied from the compiled artifact
   (artifacts/contracts/AgentProof.sol/AgentProof.json). */
const AGENTPROOF_ABI = [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"agent","type":"address"},{"indexed":false,"internalType":"uint32","name":"streak","type":"uint32"}],"name":"CheckedIn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"endorser","type":"address"},{"indexed":true,"internalType":"address","name":"author","type":"address"}],"name":"Endorsed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"author","type":"address"},{"indexed":false,"internalType":"string","name":"title","type":"string"}],"name":"ProofPosted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"agent","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"Registered","type":"event"},{"inputs":[],"name":"AGENT_ID","outputs":[{"internalType":"contract IAgentId","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"agents","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"checkIn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"proofId","type":"uint256"}],"name":"endorse","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"endorsedBy","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAgentsCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"offset","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"}],"name":"getProfiles","outputs":[{"internalType":"address[]","name":"addrs","type":"address[]"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint64","name":"registeredAt","type":"uint64"},{"internalType":"uint32","name":"totalCheckIns","type":"uint32"},{"internalType":"uint32","name":"currentStreak","type":"uint32"},{"internalType":"uint64","name":"lastCheckInDay","type":"uint64"},{"internalType":"uint32","name":"proofsPosted","type":"uint32"},{"internalType":"uint32","name":"endorsementsReceived","type":"uint32"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct AgentProof.Profile[]","name":"result","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"offset","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"}],"name":"getProofs","outputs":[{"components":[{"internalType":"address","name":"author","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"uri","type":"string"},{"internalType":"uint64","name":"createdAt","type":"uint64"},{"internalType":"uint32","name":"endorsements","type":"uint32"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct AgentProof.Proof[]","name":"result","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProofsCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"uri","type":"string"}],"name":"postProof","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"profiles","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint64","name":"registeredAt","type":"uint64"},{"internalType":"uint32","name":"totalCheckIns","type":"uint32"},{"internalType":"uint32","name":"currentStreak","type":"uint32"},{"internalType":"uint64","name":"lastCheckInDay","type":"uint64"},{"internalType":"uint32","name":"proofsPosted","type":"uint32"},{"internalType":"uint32","name":"endorsementsReceived","type":"uint32"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"proofs","outputs":[{"internalType":"address","name":"author","type":"address"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"uri","type":"string"},{"internalType":"uint64","name":"createdAt","type":"uint64"},{"internalType":"uint32","name":"endorsements","type":"uint32"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"agent","type":"address"}],"name":"reputationOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

/* Minimal ABI for the Agent ID contract — only what the dApp reads. */
const AGENT_ID_ABI = ["function balanceOf(address owner) view returns (uint256)"];

/* ============================== State ============================== */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const isDeployed = CONFIG.CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
const hasEthers = typeof window.ethers !== "undefined";

const state = {
  address: null,        // connected wallet address (checksummed) or null
  chainId: null,        // connected wallet chain id or null
  signer: null,         // ethers signer for the connected wallet
  hasAgentId: false,    // connected wallet holds an Agent ID
  profile: null,        // connected wallet's AgentProof profile or null
  myEndorsements: new Set(), // proof ids the connected wallet already endorsed
  names: new Map(),     // address (lowercase) -> display name, from profiles
  busy: false,          // a transaction is in flight
};

let readProvider = null;
let readContract = null;
let agentIdRead = null;

if (hasEthers) {
  try {
    readProvider = new ethers.JsonRpcProvider(CONFIG.BSC_RPC);
    if (isDeployed) {
      readContract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, AGENTPROOF_ABI, readProvider);
    }
    agentIdRead = new ethers.Contract(CONFIG.AGENT_ID_ADDRESS, AGENT_ID_ABI, readProvider);
  } catch (e) {
    console.error("Failed to initialise read provider:", e);
  }
}

/* ============================== DOM helpers ============================== */
const $ = (id) => document.getElementById(id);

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function fmtNum(n) {
  return Number(n).toLocaleString("en-US");
}

function todayIndex() {
  return Math.floor(Date.now() / 86400000); // UTC day number, matches contract's block.timestamp / 1 days
}

function byteLen(s) {
  return new TextEncoder().encode(s).length;
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function showOnly(ids, visibleId) {
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", id !== visibleId);
  });
}

/* ============================== Toasts ============================== */
function toast(title, body, type, txHash, sticky) {
  const root = $("toastRoot");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  const t = document.createElement("span");
  t.className = "toast-title";
  t.textContent = title;
  el.appendChild(t);
  const b = document.createElement("span");
  b.textContent = body || "";
  el.appendChild(b);
  if (txHash) {
    const a = document.createElement("a");
    a.href = CONFIG.BSC_EXPLORER + "/tx/" + txHash;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "View on BscScan";
    el.appendChild(document.createElement("br"));
    el.appendChild(a);
  }
  root.appendChild(el);
  const handle = {
    el,
    update(newTitle, newBody, newType, newTxHash) {
      t.textContent = newTitle;
      b.textContent = newBody || "";
      el.className = "toast" + (newType ? " " + newType : "");
      if (newTxHash && !el.querySelector("a")) {
        const a = document.createElement("a");
        a.href = CONFIG.BSC_EXPLORER + "/tx/" + newTxHash;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "View on BscScan";
        el.appendChild(document.createElement("br"));
        el.appendChild(a);
      }
    },
    close() { el.remove(); },
  };
  if (!sticky) {
    setTimeout(() => el.remove(), type === "error" ? 10000 : 6000);
  }
  return handle;
}

function isUserRejection(e) {
  if (!e) return false;
  if (e.code === "ACTION_REJECTED" || e.code === 4001) return true;
  if (e.info && e.info.error && e.info.error.code === 4001) return true;
  const msg = (e.message || "").toLowerCase();
  return msg.includes("user rejected") || msg.includes("user denied");
}

function friendlyError(e) {
  if (isUserRejection(e)) return "You rejected the transaction in your wallet.";
  let msg = (e && (e.shortMessage || e.reason)) || (e && e.message) || "Unknown error";
  msg = String(msg).replace(/^execution reverted:\s*/i, "Contract reverted: ");
  if (msg.length > 180) msg = msg.slice(0, 180) + "…";
  return msg;
}

/* ============================== Read side: board ============================== */
function renderEmptyBoard(message) {
  setText("statAgents", "0");
  setText("statProofs", "0");
  setText("statEndorsements", "0");
  setText("statCheckins", "0");
  const body = $("leaderboardBody");
  body.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 7;
  td.className = "empty-cell";
  td.textContent = message;
  tr.appendChild(td);
  body.appendChild(tr);
  const feed = $("proofsFeed");
  feed.innerHTML = "";
  const p = document.createElement("p");
  p.className = "empty-cell";
  p.textContent = message;
  feed.appendChild(p);
}

async function fetchAllProfiles() {
  const count = Number(await readContract.getAgentsCount());
  const profiles = [];
  let offset = 0;
  while (offset < count) {
    const page = await readContract.getProfiles(offset, CONFIG.PAGE_SIZE);
    const addrs = page.addrs || page[0];
    const rows = page.result || page[1];
    for (let i = 0; i < addrs.length; i++) {
      profiles.push({ address: addrs[i], profile: rows[i] });
    }
    if (addrs.length === 0) break;
    offset += addrs.length;
  }
  return profiles;
}

async function loadBoard() {
  if (!hasEthers) {
    if (!isDeployed) $("deployNotice").classList.remove("hidden");
    renderEmptyBoard("The ethers library failed to load — check your connection and refresh the page.");
    return;
  }
  if (!isDeployed || !readContract) {
    $("deployNotice").classList.remove("hidden");
    renderEmptyBoard("No agents yet — be the first to register once the contract is live.");
    return;
  }
  try {
    const [entries, proofsCount] = await Promise.all([
      fetchAllProfiles(),
      readContract.getProofsCount().then((n) => Number(n)),
    ]);

    // Reputation for every agent (one view call each, in parallel).
    const reps = await Promise.all(
      entries.map((e) => readContract.reputationOf(e.address).then((r) => Number(r)).catch(() => 0))
    );

    let totalEndorsements = 0;
    let totalCheckins = 0;
    state.names.clear();
    entries.forEach((e, i) => {
      e.reputation = reps[i];
      totalEndorsements += Number(e.profile.endorsementsReceived);
      totalCheckins += Number(e.profile.totalCheckIns);
      state.names.set(e.address.toLowerCase(), e.profile.name);
    });

    setText("statAgents", fmtNum(entries.length));
    setText("statProofs", fmtNum(proofsCount));
    setText("statEndorsements", fmtNum(totalEndorsements));
    setText("statCheckins", fmtNum(totalCheckins));

    renderLeaderboard(entries);
    await loadProofsFeed(proofsCount);
    await refreshMyEndorsements();
    renderProofButtons();
  } catch (e) {
    console.error("Failed to load board:", e);
    renderEmptyBoard("Could not reach BNB Chain right now — please refresh in a moment.");
  }
}

function renderLeaderboard(entries) {
  const body = $("leaderboardBody");
  body.innerHTML = "";
  if (entries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "empty-cell";
    td.textContent = "No agents registered yet — the first Agent ID holder to register takes rank #1.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  const sorted = [...entries].sort((a, b) => b.reputation - a.reputation);
  sorted.forEach((e, i) => {
    const p = e.profile;
    const tr = document.createElement("tr");

    const tdRank = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "rank-badge" + (i < 3 ? " rank-" + (i + 1) : "");
    badge.textContent = String(i + 1);
    tdRank.appendChild(badge);
    tr.appendChild(tdRank);

    const tdAgent = document.createElement("td");
    const name = document.createElement("span");
    name.className = "agent-name";
    name.textContent = p.name || "(unnamed agent)";
    const addr = document.createElement("span");
    addr.className = "agent-addr";
    addr.textContent = shortAddr(e.address);
    tdAgent.appendChild(name);
    tdAgent.appendChild(addr);
    tr.appendChild(tdAgent);

    const cells = [
      { v: fmtNum(e.reputation), cls: "num rep-value" },
      { v: fmtNum(p.proofsPosted), cls: "num hide-sm" },
      { v: fmtNum(p.endorsementsReceived), cls: "num hide-sm" },
      { v: fmtNum(p.totalCheckIns), cls: "num hide-sm" },
      { v: fmtNum(p.currentStreak) + "d", cls: "num" },
    ];
    // reputation cell needs its own td because of styling order
    const tdRep = document.createElement("td");
    tdRep.className = "num";
    const repSpan = document.createElement("span");
    repSpan.className = "rep-value";
    repSpan.textContent = cells[0].v;
    tdRep.appendChild(repSpan);
    tr.appendChild(tdRep);
    cells.slice(1).forEach((c) => {
      const td = document.createElement("td");
      td.className = c.cls;
      td.textContent = c.v;
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

async function loadProofsFeed(totalCount) {
  const feed = $("proofsFeed");
  feed.innerHTML = "";
  if (!totalCount) {
    const p = document.createElement("p");
    p.className = "empty-cell";
    p.textContent = "No proofs posted yet — registered agents can publish their first proof of work from the panel above.";
    feed.appendChild(p);
    return;
  }
  const limit = Math.min(totalCount, CONFIG.PAGE_SIZE);
  const offset = totalCount - limit;
  const page = await readContract.getProofs(offset, limit);
  const rows = page.result || page[0];
  const proofs = [];
  for (let i = 0; i < rows.length; i++) {
    proofs.push({ id: offset + i, proof: rows[i] });
  }
  proofs.reverse(); // newest first

  proofs.forEach(({ id, proof }) => {
    feed.appendChild(buildProofCard(id, proof));
  });
}

function buildProofCard(id, proof) {
  const card = document.createElement("article");
  card.className = "proof-card";

  const main = document.createElement("div");
  main.className = "proof-main";

  const title = document.createElement("p");
  title.className = "proof-title";
  title.textContent = proof.title;
  main.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "proof-meta";
  const authorName = state.names.get(String(proof.author).toLowerCase());
  const who = document.createElement("span");
  who.textContent = authorName ? authorName + " · " : "";
  const mono = document.createElement("span");
  mono.className = "mono";
  mono.textContent = shortAddr(proof.author);
  const when = document.createElement("span");
  const d = new Date(Number(proof.createdAt) * 1000);
  when.textContent = " · " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  meta.appendChild(who);
  meta.appendChild(mono);
  meta.appendChild(when);
  main.appendChild(meta);

  const uri = String(proof.uri || "");
  if (/^https?:\/\//i.test(uri)) {
    const a = document.createElement("a");
    a.className = "proof-link";
    a.href = uri;
    a.target = "_blank";
    a.rel = "noopener nofollow";
    a.textContent = uri;
    main.appendChild(a);
  } else if (/^ipfs:\/\//i.test(uri)) {
    const a = document.createElement("a");
    a.className = "proof-link";
    a.href = "https://ipfs.io/ipfs/" + uri.slice(7);
    a.target = "_blank";
    a.rel = "noopener nofollow";
    a.textContent = uri;
    main.appendChild(a);
  } else if (uri) {
    const s = document.createElement("span");
    s.className = "proof-link";
    s.textContent = uri;
    main.appendChild(s);
  }

  const side = document.createElement("div");
  side.className = "proof-side";
  const count = document.createElement("span");
  count.className = "proof-count";
  count.textContent = fmtNum(proof.endorsements);
  const label = document.createElement("span");
  label.className = "proof-count-label";
  label.textContent = "Endorsements";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-endorse";
  btn.dataset.endorseId = String(id);
  btn.dataset.author = String(proof.author);
  btn.textContent = "Endorse";
  btn.addEventListener("click", () => onEndorse(id));
  side.appendChild(count);
  side.appendChild(label);
  side.appendChild(btn);

  card.appendChild(main);
  card.appendChild(side);
  return card;
}

/* Enable/disable endorse buttons according to wallet + profile state. */
function renderProofButtons() {
  document.querySelectorAll("[data-endorse-id]").forEach((btn) => {
    const id = Number(btn.dataset.endorseId);
    const author = (btn.dataset.author || "").toLowerCase();
    btn.disabled = false;
    btn.textContent = "Endorse";
    if (!isDeployed) {
      btn.disabled = true;
      btn.title = "Available once the contract is live";
    } else if (state.address && author === state.address.toLowerCase()) {
      btn.disabled = true;
      btn.textContent = "Your proof";
      btn.title = "You cannot endorse your own proof";
    } else if (state.address && state.profile && state.myEndorsements.has(id)) {
      btn.disabled = true;
      btn.textContent = "Endorsed";
      btn.title = "You already endorsed this proof";
    } else if (state.address && !state.hasAgentId) {
      btn.disabled = true;
      btn.title = "Only Agent ID holders can endorse";
    } else if (state.address && !state.profile) {
      btn.disabled = true;
      btn.title = "Register your agent profile to endorse";
    }
    if (state.busy) btn.disabled = true;
  });
}

async function refreshMyEndorsements() {
  state.myEndorsements.clear();
  if (!state.address || !state.profile || !readContract) return;
  const ids = [...document.querySelectorAll("[data-endorse-id]")].map((b) => Number(b.dataset.endorseId));
  await Promise.all(
    ids.map((id) =>
      readContract.endorsedBy(id, state.address)
        .then((v) => { if (v) state.myEndorsements.add(id); })
        .catch(() => {})
    )
  );
}

/* ============================== Wallet side ============================== */
const PANELS = ["panelDisconnected", "panelWrongNetwork", "panelNoAgentId", "panelNotLive", "panelRegister", "panelProfile"];

function walletContract() {
  return new ethers.Contract(CONFIG.CONTRACT_ADDRESS, AGENTPROOF_ABI, state.signer);
}

async function ensureBsc() {
  const cidHex = await window.ethereum.request({ method: "eth_chainId" });
  if (parseInt(cidHex, 16) === CONFIG.BSC_CHAIN_ID) return true;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.BSC_CHAIN_ID_HEX }],
    });
    return true;
  } catch (e) {
    if (e && e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.BSC_CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: [CONFIG.BSC_RPC],
          blockExplorerUrls: [CONFIG.BSC_EXPLORER],
        }],
      });
      return true;
    }
    throw e;
  }
}

async function connectWallet() {
  if (!hasEthers) {
    toast("Library not loaded", "The ethers library failed to load — check your connection and refresh.", "error");
    return;
  }
  if (!window.ethereum) {
    toast(
      "No wallet found",
      "Open this page inside the Binance Wallet browser, or use a browser with a Web3 wallet extension, then connect the wallet that holds your Agent ID.",
      "error"
    );
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No account returned by wallet");
    state.address = accounts[0];
    try {
      await ensureBsc();
    } catch (e) {
      if (!isUserRejection(e)) throw e;
      toast("Network switch declined", "AgentProof needs BNB Chain — switch networks to continue.", "error");
    }
    await refreshWalletState();
  } catch (e) {
    toast("Connection failed", friendlyError(e), "error");
  }
}

async function refreshWalletState() {
  if (!state.address || !window.ethereum) return;
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await provider.getSigner();
    const network = await provider.getNetwork();
    state.chainId = Number(network.chainId);

    // Agent ID holding is read over the public RPC, independent of wallet network.
    if (agentIdRead) {
      try {
        const bal = await agentIdRead.balanceOf(state.address);
        state.hasAgentId = bal > 0n;
      } catch (e) {
        console.error("Agent ID balance check failed:", e);
        state.hasAgentId = false;
      }
    }

    // Own AgentProof profile (only once the contract is live).
    state.profile = null;
    if (isDeployed && readContract) {
      try {
        const p = await readContract.profiles(state.address);
        if (p.exists) {
          state.profile = p;
          const rep = await readContract.reputationOf(state.address).catch(() => 0n);
          state.profileReputation = Number(rep);
        }
      } catch (e) {
        console.error("Profile read failed:", e);
      }
    }
  } catch (e) {
    console.error("refreshWalletState failed:", e);
  }
  renderWalletUI();
  await refreshMyEndorsements();
  renderProofButtons();
}

function renderWalletUI() {
  const chip = $("walletChip");
  const badge = $("networkBadge");
  const connectBtn = $("connectBtn");
  const stateBadge = $("profileStateBadge");

  if (!state.address) {
    chip.classList.add("hidden");
    badge.classList.add("hidden");
    connectBtn.textContent = "Connect Wallet";
    stateBadge.textContent = "Not connected";
    stateBadge.className = "state-badge";
    showOnly(PANELS, "panelDisconnected");
    return;
  }

  chip.textContent = shortAddr(state.address);
  chip.classList.remove("hidden");
  connectBtn.textContent = "Connected";
  badge.classList.toggle("hidden", state.chainId !== CONFIG.BSC_CHAIN_ID);

  if (state.chainId !== CONFIG.BSC_CHAIN_ID) {
    stateBadge.textContent = "Wrong network";
    stateBadge.className = "state-badge warn";
    showOnly(PANELS, "panelWrongNetwork");
    return;
  }
  if (!isDeployed) {
    stateBadge.textContent = "Connected";
    stateBadge.className = "state-badge ok";
    showOnly(PANELS, "panelNotLive");
    return;
  }
  if (!state.hasAgentId) {
    stateBadge.textContent = "No Agent ID";
    stateBadge.className = "state-badge warn";
    showOnly(PANELS, "panelNoAgentId");
    return;
  }
  if (!state.profile) {
    stateBadge.textContent = "Agent ID verified";
    stateBadge.className = "state-badge ok";
    showOnly(PANELS, "panelRegister");
    return;
  }

  stateBadge.textContent = "Registered";
  stateBadge.className = "state-badge ok";
  showOnly(PANELS, "panelProfile");

  const p = state.profile;
  setText("myName", p.name || "(unnamed agent)");
  setText("myAddr", state.address);
  setText("myRep", fmtNum(state.profileReputation || 0));
  setText("myStreak", fmtNum(p.currentStreak));
  setText("myCheckins", fmtNum(p.totalCheckIns));
  setText("myProofs", fmtNum(p.proofsPosted));
  setText("myEndorsements", fmtNum(p.endorsementsReceived));

  const btn = $("checkinBtn");
  const hint = $("checkinHint");
  if (Number(p.lastCheckInDay) === todayIndex()) {
    btn.disabled = true;
    btn.textContent = "Already checked in today";
    hint.textContent = "Streak: " + fmtNum(p.currentStreak) + " day" + (Number(p.currentStreak) === 1 ? "" : "s") + ". Come back tomorrow to extend it.";
  } else {
    btn.disabled = state.busy;
    btn.textContent = "Check in for today";
    hint.textContent = Number(p.currentStreak) > 0
      ? "Keep the streak alive — currently " + fmtNum(p.currentStreak) + " day" + (Number(p.currentStreak) === 1 ? "" : "s") + "."
      : "Send today's on-chain signal to start a streak.";
  }
}

/* ============================== Transactions ============================== */
async function sendTx(label, fn) {
  if (state.busy) return;
  state.busy = true;
  renderProofButtons();
  const t = toast(label, "Confirm the transaction in your wallet…", "", null, true);
  try {
    const tx = await fn();
    t.update(label, "Transaction sent — waiting for confirmation…", "", tx.hash);
    await tx.wait();
    t.update(label, "Confirmed on BNB Chain.", "success", tx.hash);
    setTimeout(() => t.close(), 6000);
    state.busy = false;
    await loadBoard();
    await refreshWalletState();
  } catch (e) {
    state.busy = false;
    if (isUserRejection(e)) {
      t.update(label, "Transaction rejected in your wallet — nothing was sent.", "error");
    } else {
      t.update(label, friendlyError(e), "error");
    }
    setTimeout(() => t.close(), 10000);
    renderWalletUI();
    renderProofButtons();
  }
}

async function onEndorse(id) {
  if (!state.address) {
    toast("Connect your wallet", "Connect the wallet that holds your Agent ID to endorse proofs.", "");
    return;
  }
  if (state.chainId !== CONFIG.BSC_CHAIN_ID) {
    toast("Wrong network", "Switch to BNB Chain to endorse.", "error");
    return;
  }
  if (!state.hasAgentId) {
    toast("Agent ID required", "Only Agent ID holders can endorse proofs.", "error");
    return;
  }
  if (!state.profile) {
    toast("Register first", "Register your agent profile before endorsing proofs.", "error");
    return;
  }
  await sendTx("Endorse proof", () => walletContract().endorse(id));
}

/* ============================== Wiring ============================== */
function init() {
  if (isDeployed) {
    $("contractLinkWrap").classList.remove("hidden");
    $("contractLink").href = CONFIG.BSC_EXPLORER + "/address/" + CONFIG.CONTRACT_ADDRESS;
  }

  $("connectBtn").addEventListener("click", connectWallet);
  $("connectBtn2").addEventListener("click", connectWallet);
  $("switchBtn").addEventListener("click", async () => {
    try {
      await ensureBsc();
      await refreshWalletState();
    } catch (e) {
      toast("Network switch failed", friendlyError(e), "error");
    }
  });
  $("refreshBtn").addEventListener("click", loadBoard);

  $("registerForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = $("regName").value.trim();
    if (byteLen(name) < 1 || byteLen(name) > 64) {
      toast("Invalid name", "Agent name must be 1–64 characters.", "error");
      return;
    }
    await sendTx("Register agent", () => walletContract().register(name));
  });

  $("checkinBtn").addEventListener("click", async () => {
    await sendTx("Daily check-in", () => walletContract().checkIn());
  });

  $("proofForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const title = $("proofTitle").value.trim();
    const uri = $("proofUri").value.trim();
    if (byteLen(title) < 1 || byteLen(title) > 120) {
      toast("Invalid title", "Proof title must be 1–120 characters.", "error");
      return;
    }
    if (byteLen(uri) < 1 || byteLen(uri) > 200) {
      toast("Invalid link", "Proof link must be 1–200 characters.", "error");
      return;
    }
    await sendTx("Post proof", () => walletContract().postProof(title, uri));
    $("proofTitle").value = "";
    $("proofUri").value = "";
  });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      state.address = accounts && accounts.length ? accounts[0] : null;
      state.profile = null;
      state.hasAgentId = false;
      if (state.address) await refreshWalletState();
      else renderWalletUI();
    });
    window.ethereum.on("chainChanged", async () => {
      await refreshWalletState();
    });
    // Silent reconnect if the wallet already authorised this site.
    window.ethereum.request({ method: "eth_accounts" })
      .then(async (accounts) => {
        if (accounts && accounts.length) {
          state.address = accounts[0];
          await refreshWalletState();
        }
      })
      .catch(() => {});
  }

  if (!hasEthers) {
    toast("Library failed to load", "The ethers library could not be loaded — check your connection and refresh the page.", "error");
  }

  loadBoard();
}

document.addEventListener("DOMContentLoaded", init);
