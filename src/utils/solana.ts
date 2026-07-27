import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=fc56707a-a30e-4676-9895-b5c37cbba6a2'
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
const PEAK_PROGRAM_ID = new PublicKey('92MB3SxG4ovKwRb8M4VtTPijA1CzxGo9eiZL2TgfNHxE')
const USDT_DECIMALS = 6
const PEAK_DECIMALS = 9

export const FEE_COLLECT_ADDRESS = 'EfQv2XvBGckvhDh2urjC6bjnvmjuE8f6wnA7ZHbBRRNL'

const PEAK_MINT = new PublicKey('24NSBvTN5oPhSDPorMNGrLFJcqor9hdPZm3AqKBVXDWy')

function getPeakMint(): PublicKey {
  return PEAK_MINT
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
  const w = window as unknown as Record<string, unknown>
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

async function getCurrentWalletPublicKey(provider: SolanaProvider): Promise<PublicKey> {
  try {
    const resp = await provider.connect()
    if (resp?.publicKey) return resp.publicKey
  } catch {
    // ignore and fallback to injected key
  }
  if (provider.publicKey) return provider.publicKey
  throw new Error('无法获取当前钱包地址，请在钱包中重新连接站点')
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
    const info = await connection.getAccountInfo(ata)
    if (!info) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      )
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('429') || msg.includes('Too many') || msg.includes('Timed out')) {
      console.warn('RPC rate limited checking ATA, skipping create instruction')
    } else {
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      )
    }
  }
  return ata
}

export type TxStatus = 'confirmed' | 'pending' | 'failed'

export interface TransferResult {
  txHash: string
  /** confirmed=链上已确认成功；failed=链上确认失败(未扣款,可重试)；pending=已广播但未确认(切勿重发,需核实) */
  status: TxStatus
}

/**
 * 查询某签名的链上真实状态。用于「已广播但确认超时」时人工核实，杜绝盲目重发。
 */
export async function getTxOnchainStatus(sig: string): Promise<TxStatus> {
  const connection = getConnection()
  try {
    const st = await connection.getSignatureStatuses([sig], { searchTransactionHistory: true })
    const info = st.value[0]
    if (info) {
      if (info.err) return 'failed'
      if (info.confirmationStatus === 'confirmed' || info.confirmationStatus === 'finalized') return 'confirmed'
      return 'pending'
    }
    const tx = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    if (tx) return tx.meta?.err ? 'failed' : 'confirmed'
    return 'pending'
  } catch {
    return 'pending'
  }
}

/**
 * 等待交易确认。已广播后调用：绝不抛错（抛错会让操作员误以为没发出去而重发→双发）。
 * 返回 confirmed / failed / pending 三态，由调用方据此决定 UI 与是否允许重发。
 */
async function waitForConfirmation(
  connection: Connection,
  sig: string,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<TxStatus> {
  try {
    const res = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    return res.value.err ? 'failed' : 'confirmed'
  } catch {
    // 超时 / blockhash 过期：不代表失败，去查签名真实状态
    return getTxOnchainStatus(sig)
  }
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
  const fromPk = await getCurrentWalletPublicKey(provider)

  const connection = getConnection()
  const { mint, decimals } = getMintAndDecimals(asset)
  const toPk = new PublicKey(toAddress)
  const lamports = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)))

  const sourceAta = getAssociatedTokenAddressSync(mint, fromPk, true, TOKEN_PROGRAM_ID)
  const sourceBalance = await connection.getTokenAccountBalance(sourceAta).catch(() => null)
  if (!sourceBalance) {
    throw new Error(`当前钱包缺少 ${asset} 代币账户，请先在钱包里创建/接收一次 ${asset}`)
  }
  const sourceRaw = BigInt(sourceBalance.value.amount || '0')
  if (sourceRaw < lamports) {
    const need = Number(lamports) / (10 ** decimals)
    const has = Number(sourceRaw) / (10 ** decimals)
    throw new Error(`当前钱包 ${fromPk.toBase58()} 的 ${asset} 余额不足：可用 ${has}，需要 ${need}`)
  }
  console.log('[solana] transfer precheck', {
    asset,
    from: fromPk.toBase58(),
    to: toPk.toBase58(),
    sourceAta: sourceAta.toBase58(),
    sourceBalanceRaw: sourceBalance.value.amount,
    amountRaw: lamports.toString(),
  })

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

  // 广播前失败（模拟失败/用户拒签/余额不足等）会在此抛出，此时尚未上链，可安全重试。
  // 关闭 skipPreflight，让注定失败的交易在广播前就被拦截，避免拿到一个“看似成功”的签名。
  if (provider.signTransaction) {
    const signed = await provider.signTransaction(tx)
    sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
    console.log('[solana] signTransaction + sendRaw -> sig:', sig)
  } else if (provider.signAndSendTransaction) {
    const result = await provider.signAndSendTransaction(tx, { preflightCommitment: 'confirmed' })
    const res = result as Record<string, unknown>
    sig = (res.signature as string)
      || (res.txid as string)
      || (res.transactionHash as string)
      || (typeof result === 'string' ? result : '')
    console.log('[solana] signAndSendTransaction result:', JSON.stringify(result), '-> sig:', sig)
  } else {
    throw new Error('钱包不支持签名交易')
  }

  if (!sig) {
    throw new Error('钱包未返回交易签名，请检查控制台日志')
  }

  // 已广播：等待真实确认结果后再返回（不再“广播即成功”）。
  const status = await waitForConfirmation(connection, sig, blockhash, lastValidBlockHeight)
  return { txHash: sig, status }
}

function findProgramPda(seed: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(seed)],
    PEAK_PROGRAM_ID,
  )
  return pda
}

// sha256("global:admin_withdraw_vault")[0..8]
const ADMIN_WITHDRAW_VAULT_DISC = new Uint8Array([104, 13, 82, 172, 52, 229, 136, 35])

/**
 * 从 peak_vault 转出 PEAK（admin_withdraw_vault 合约指令）
 * 一笔交易同时完成用户转账 + 手续费归集
 */
export async function sendPeakFromVault(
  toAddress: string,
  actualAmount: string,
  feeAddress: string | null,
  feeAmount: string | null,
): Promise<TransferResult> {
  const provider = getProvider()
  const connection = getConnection()
  const adminPk = await getCurrentWalletPublicKey(provider)
  const peakMint = getPeakMint()

  const configPda = findProgramPda('config')
  const peakVaultPda = findProgramPda('peak_vault')
  const programAuthorityPda = findProgramPda('program_authority')
  const discriminator = ADMIN_WITHDRAW_VAULT_DISC

  const tx = new Transaction()

  const toPk = new PublicKey(toAddress)
  const destAta = await ensureAtaExists(connection, tx, adminPk, toPk, peakMint)

  const userLamports = BigInt(Math.round(parseFloat(actualAmount) * (10 ** PEAK_DECIMALS)))
  const userData = Buffer.alloc(16)
  Buffer.from(discriminator).copy(userData, 0)
  userData.writeBigUInt64LE(userLamports, 8)

  tx.add(new TransactionInstruction({
    programId: PEAK_PROGRAM_ID,
    keys: [
      { pubkey: adminPk, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: peakVaultPda, isSigner: false, isWritable: true },
      { pubkey: programAuthorityPda, isSigner: false, isWritable: false },
      { pubkey: destAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: userData,
  }))

  if (feeAddress && feeAmount && parseFloat(feeAmount) > 0) {
    const feePk = new PublicKey(feeAddress)
    const feeAta = await ensureAtaExists(connection, tx, adminPk, feePk, peakMint)

    const feeLamports = BigInt(Math.round(parseFloat(feeAmount) * (10 ** PEAK_DECIMALS)))
    const feeData = Buffer.alloc(16)
    Buffer.from(discriminator).copy(feeData, 0)
    feeData.writeBigUInt64LE(feeLamports, 8)

    tx.add(new TransactionInstruction({
      programId: PEAK_PROGRAM_ID,
      keys: [
        { pubkey: adminPk, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: peakVaultPda, isSigner: false, isWritable: true },
        { pubkey: programAuthorityPda, isSigner: false, isWritable: false },
        { pubkey: feeAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: feeData,
    }))
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
  tx.feePayer = adminPk

  let sig: string

  if (provider.signAndSendTransaction) {
    const result = await provider.signAndSendTransaction(tx, { preflightCommitment: 'confirmed' })
    const res = result as Record<string, unknown>
    sig = (res.signature as string)
      || (res.txid as string)
      || (res.transactionHash as string)
      || (typeof result === 'string' ? result : '')
  } else if (provider.signTransaction) {
    const signed = await provider.signTransaction(tx)
    sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
  } else {
    throw new Error('钱包不支持签名交易')
  }

  if (!sig) {
    throw new Error('钱包未返回交易签名，请检查控制台日志')
  }

  const status = await waitForConfirmation(connection, sig, blockhash, lastValidBlockHeight)
  return { txHash: sig, status }
}
