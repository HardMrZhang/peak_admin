import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const RPC_URL = 'https://solana-mainnet.g.alchemy.com/v2/_bpe84QwRZ3v_M06Go7WhKA2z6mOR4hy'
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
const PEAK_PROGRAM_ID = new PublicKey('92MB3SxG4ovKwRb8M4VtTPijA1CzxGo9eiZL2TgfNHxE')
const USDT_DECIMALS = 6
const PEAK_DECIMALS = 9

export const FEE_COLLECT_ADDRESS = 'EfQv2XvBGckvhDh2urjC6bjnvmjuE8f6wnA7ZHbBRRNL'

function getPeakMint(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('peak_mint')],
    PEAK_PROGRAM_ID,
  )
  return pda
}

function getMintAndDecimals(asset: string): { mint: PublicKey; decimals: number } {
  if (asset === 'USDT') return { mint: USDT_MINT, decimals: USDT_DECIMALS }
  if (asset === 'PEAK') return { mint: getPeakMint(), decimals: PEAK_DECIMALS }
  throw new Error(`Unsupported asset: ${asset}`)
}

function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed')
}

interface SolanaProvider {
  publicKey: PublicKey
  isConnected: boolean
  connect(): Promise<{ publicKey: PublicKey }>
  signTransaction?(tx: Transaction): Promise<Transaction>
  signAndSendTransaction?(tx: Transaction, opts?: Record<string, unknown>): Promise<{ signature: string }>
}

function getProvider(): SolanaProvider {
  const w = window as Record<string, unknown>
  const okx = (w.okxwallet as Record<string, unknown>)?.solana as SolanaProvider | undefined
  const phantom = (w.phantom as Record<string, unknown>)?.solana as SolanaProvider | undefined
  const generic = w.solana as SolanaProvider | undefined
  const provider = okx || phantom || generic
  if (!provider) throw new Error('未检测到 Solana 钱包，请安装 Phantom 或 OKX 钱包')
  return provider
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider()
  try {
    const resp = await provider.connect()
    return resp.publicKey.toBase58()
  } catch {
    if (provider.publicKey) return provider.publicKey.toBase58()
    throw new Error('钱包连接失败')
  }
}

async function ensureAtaExists(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner, true, TOKEN_PROGRAM_ID)
  try {
    await connection.getTokenAccountBalance(ata)
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    )
  }
  return ata
}

export interface TransferResult {
  txHash: string
}

/**
 * 构造并签名 SPL Token 转账交易
 */
export async function sendSplTransfer(
  asset: string,
  toAddress: string,
  amount: string,
): Promise<TransferResult> {
  const provider = getProvider()
  if (!provider.isConnected) {
    await provider.connect()
  }

  const connection = getConnection()
  const { mint, decimals } = getMintAndDecimals(asset)
  const fromPk = provider.publicKey
  const toPk = new PublicKey(toAddress)
  const lamports = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)))

  const sourceAta = getAssociatedTokenAddressSync(mint, fromPk, true, TOKEN_PROGRAM_ID)

  const tx = new Transaction()
  const destAta = await ensureAtaExists(connection, tx, fromPk, toPk, mint)

  tx.add(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destAta,
      fromPk,
      lamports,
      decimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  )

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
  tx.feePayer = fromPk

  let sig: string

  if (provider.signAndSendTransaction) {
    const result = await provider.signAndSendTransaction(tx, { preflightCommitment: 'confirmed' })
    sig = result.signature
  } else if (provider.signTransaction) {
    const signed = await provider.signTransaction(tx)
    sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
  } else {
    throw new Error('钱包不支持签名交易')
  }

  connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
    .catch(() => {})

  return { txHash: sig }
}
