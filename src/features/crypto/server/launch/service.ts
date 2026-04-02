import { randomUUID } from "node:crypto";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import type {
  CryptoLaunchDraft,
  CryptoLaunchExecutionMode,
  CryptoLaunchNetwork,
  CryptoLaunchPrepared,
  CryptoLaunchResult,
} from "@/features/crypto/types";

const PUMP_IPFS_ENDPOINT = "https://pump.fun/api/ipfs";
const PREPARED_LAUNCH_TTL_MS = 5 * 60 * 1000;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

type NetworkPreset = {
  rpcUrl: string;
  explorerBaseUrl: string;
  explorerCluster: string | null;
};

type PreparedLaunchContext = {
  prepared: CryptoLaunchPrepared;
  draft: CryptoLaunchDraft;
  serializedTransaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

const preparedLaunches = new Map<string, PreparedLaunchContext>();

let cachedPumpSdk:
  | {
      createV2Instruction: (params: {
        mint: PublicKey;
        name: string;
        symbol: string;
        uri: string;
        creator: PublicKey;
        user: PublicKey;
        mayhemMode: boolean;
        cashback: boolean;
      }) => Promise<import("@solana/web3.js").TransactionInstruction>;
      extendAccountInstruction: (params: {
        account: PublicKey;
        user: PublicKey;
      }) => Promise<import("@solana/web3.js").TransactionInstruction>;
    }
  | null = null;

async function getPumpSdk() {
  if (!cachedPumpSdk) {
    const mod = await import("@pump-fun/pump-sdk");
    cachedPumpSdk = mod.PUMP_SDK;
  }
  return cachedPumpSdk;
}

function bondingCurvePda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
  )[0];
}

function getNetworkPreset(network: CryptoLaunchNetwork): NetworkPreset {
  if (network === "mainnet") {
    return {
      rpcUrl:
        process.env.HELIUS_MAINNET_RPC_URL ??
        process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
        "https://api.mainnet-beta.solana.com",
      explorerBaseUrl: "https://solscan.io",
      explorerCluster: null,
    };
  }
  return {
    rpcUrl:
      process.env.HELIUS_DEVNET_RPC_URL ??
      process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC_URL ??
      "https://api.devnet.solana.com",
    explorerBaseUrl: "https://solscan.io",
    explorerCluster: "devnet",
  };
}

function buildExplorerUrl(baseUrl: string, kind: "token" | "tx", value: string, cluster: string | null) {
  const path = kind === "token" ? `token/${value}` : `tx/${value}`;
  if (!cluster) return `${baseUrl}/${path}`;
  return `${baseUrl}/${path}?cluster=${cluster}`;
}

function dataUriToBlob(dataUri: string): { blob: Blob; mimeType: string } {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    throw new Error("Invalid token logo data URL.");
  }
  const mimeType = match[1]!;
  const base64 = match[2]!;
  const bytes = Buffer.from(base64, "base64");
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

function decodeBase58(value: string): Uint8Array {
  const bytes = [0];
  for (const char of value) {
    const charIndex = BASE58_ALPHABET.indexOf(char);
    if (charIndex < 0) {
      throw new Error("PUMPFUN_SERVER_SECRET_KEY is not a valid base58 string.");
    }
    let carry = charIndex;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index]! * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of value) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

async function uploadMetadata(draft: CryptoLaunchDraft): Promise<string> {
  const formData = new FormData();
  if (draft.logoUrl.startsWith("data:")) {
    const { blob, mimeType } = dataUriToBlob(draft.logoUrl);
    const ext = mimeType === "image/png" ? "png" : "jpg";
    formData.append("file", blob, `token-logo.${ext}`);
  } else if (draft.logoUrl) {
    const imageResponse = await fetch(draft.logoUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch the token logo from ${draft.logoUrl}.`);
    }
    formData.append("file", await imageResponse.blob(), "token-logo.png");
  }
  formData.append("name", draft.name);
  formData.append("symbol", draft.symbol);
  formData.append("description", draft.description);
  formData.append("showName", "true");
  if (draft.twitter) formData.append("twitter", draft.twitter);
  if (draft.telegram) formData.append("telegram", draft.telegram);
  if (draft.website) formData.append("website", draft.website);
  if (draft.discord) formData.append("discord", draft.discord);

  const response = await fetch(PUMP_IPFS_ENDPOINT, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    metadataUri?: string;
    message?: string;
  } | null;
  if (!response.ok || !payload?.metadataUri) {
    throw new Error(
      payload?.message?.trim() || `Pump.fun metadata upload failed with status ${response.status}.`,
    );
  }
  return payload.metadataUri;
}

function decodeServerSecret(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("PUMPFUN_SERVER_SECRET_KEY is not configured.");
  }
  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed) as number[]);
  }
  return decodeBase58(trimmed);
}

function getServerSigner(): Keypair {
  return Keypair.fromSecretKey(decodeServerSecret(process.env.PUMPFUN_SERVER_SECRET_KEY ?? ""));
}

function serializeTransaction(transaction: VersionedTransaction): string {
  return Buffer.from(transaction.serialize()).toString("base64");
}

function deserializeTransaction(serialized: string): VersionedTransaction {
  return VersionedTransaction.deserialize(Buffer.from(serialized, "base64"));
}

function pruneExpiredLaunches() {
  const now = Date.now();
  for (const [launchId, context] of preparedLaunches.entries()) {
    if (context.prepared.expiresAt <= now) {
      preparedLaunches.delete(launchId);
    }
  }
}

function resolveCreatorPublicKey(params: {
  draft: CryptoLaunchDraft;
  creatorPublicKey?: string;
}): PublicKey {
  if (params.draft.executionMode === "server_side") {
    return getServerSigner().publicKey;
  }
  return new PublicKey(params.creatorPublicKey!.trim());
}

function buildPreparedLaunch(params: {
  launchId: string;
  draft: CryptoLaunchDraft;
  creatorPublicKey: string;
  mintAddress: string;
  metadataUri: string;
  serializedTransaction: string;
  expiresAt: number;
}): CryptoLaunchPrepared {
  const preset = getNetworkPreset(params.draft.network);
  return {
    launchId: params.launchId,
    network: params.draft.network,
    executionMode: params.draft.executionMode,
    mintAddress: params.mintAddress,
    metadataUri: params.metadataUri,
    creatorPublicKey: params.creatorPublicKey,
    explorerBaseUrl: preset.explorerBaseUrl,
    explorerCluster: preset.explorerCluster,
    explorerTokenUrl: buildExplorerUrl(
      preset.explorerBaseUrl,
      "token",
      params.mintAddress,
      preset.explorerCluster,
    ),
    explorerTxUrl: null,
    expiresAt: params.expiresAt,
    serializedTransaction:
      params.draft.executionMode === "user_approved" ? params.serializedTransaction : null,
    status:
      params.draft.executionMode === "user_approved"
        ? "awaiting_signature"
        : "ready_for_server_submit",
  };
}

export async function prepareCryptoLaunch(params: {
  draft: CryptoLaunchDraft;
  creatorPublicKey?: string;
}): Promise<CryptoLaunchPrepared> {
  pruneExpiredLaunches();
  const creator = resolveCreatorPublicKey(params);
  const metadataUri = await uploadMetadata(params.draft);
  const connection = new Connection(getNetworkPreset(params.draft.network).rpcUrl, "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const mintKeypair = Keypair.generate();
  const sdk = await getPumpSdk();
  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: params.draft.computeUnitLimit,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: Math.max(0, Math.round(params.draft.priorityFeeSol * 1_000_000_000)),
    }),
    await sdk.createV2Instruction({
      mint: mintKeypair.publicKey,
      name: params.draft.name,
      symbol: params.draft.symbol,
      uri: metadataUri,
      creator,
      user: creator,
      mayhemMode: false,
      cashback: false,
    }),
    await sdk.extendAccountInstruction({
      account: bondingCurvePda(mintKeypair.publicKey),
      user: creator,
    }),
  ];

  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: creator,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(),
  );
  transaction.sign([mintKeypair]);

  const launchId = randomUUID();
  const expiresAt = Date.now() + PREPARED_LAUNCH_TTL_MS;
  const serializedTransaction = serializeTransaction(transaction);
  const prepared = buildPreparedLaunch({
    launchId,
    draft: params.draft,
    creatorPublicKey: creator.toBase58(),
    mintAddress: mintKeypair.publicKey.toBase58(),
    metadataUri,
    serializedTransaction,
    expiresAt,
  });

  preparedLaunches.set(launchId, {
    prepared,
    draft: params.draft,
    serializedTransaction,
    blockhash,
    lastValidBlockHeight,
  });

  return prepared;
}

export async function submitCryptoLaunch(params: {
  launchId: string;
  executionMode: CryptoLaunchExecutionMode;
  signedTransaction?: string;
}): Promise<CryptoLaunchResult> {
  pruneExpiredLaunches();
  const context = preparedLaunches.get(params.launchId);
  if (!context) {
    throw new Error("Prepared launch was not found or has expired. Please prepare it again.");
  }
  if (context.draft.executionMode !== params.executionMode) {
    throw new Error("Launch execution mode does not match the prepared request.");
  }

  const preset = getNetworkPreset(context.draft.network);
  const connection = new Connection(preset.rpcUrl, "confirmed");
  const transaction =
    params.executionMode === "server_side"
      ? deserializeTransaction(context.serializedTransaction)
      : deserializeTransaction(params.signedTransaction!.trim());

  if (params.executionMode === "server_side") {
    transaction.sign([getServerSigner()]);
  }

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: context.blockhash,
      lastValidBlockHeight: context.lastValidBlockHeight,
    },
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error(`Launch transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  const result: CryptoLaunchResult = {
    launchId: context.prepared.launchId,
    network: context.prepared.network,
    executionMode: context.prepared.executionMode,
    mintAddress: context.prepared.mintAddress,
    creatorPublicKey: context.prepared.creatorPublicKey,
    metadataUri: context.prepared.metadataUri,
    signature,
    explorerBaseUrl: context.prepared.explorerBaseUrl,
    explorerCluster: context.prepared.explorerCluster,
    explorerTokenUrl: context.prepared.explorerTokenUrl,
    explorerTxUrl: buildExplorerUrl(
      context.prepared.explorerBaseUrl,
      "tx",
      signature,
      context.prepared.explorerCluster,
    ),
    confirmed: true,
    submittedAt: new Date().toISOString(),
  };

  preparedLaunches.delete(params.launchId);
  return result;
}

export async function fetchJitoTipFloor() {
  const response = await fetch("https://bundles.jito.wtf/api/v1/bundles/tip_floor", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Unable to load the Jito tip floor (${response.status}).`);
  }
  const payload = (await response.json()) as Array<{
    landed_tips_50th_percentile?: number;
    landed_tips_75th_percentile?: number;
    landed_tips_95th_percentile?: number;
  }>;
  return payload[0] ?? null;
}
