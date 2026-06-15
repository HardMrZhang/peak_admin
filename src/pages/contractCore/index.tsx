import { useEffect, useState } from 'react'
import {
  App, Button, Card, Col, Descriptions, Divider, Form, Input, InputNumber, Row,
  Select, Space, Table, Tabs, Tag, Typography,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import {
  adminTransferNode,
  claimReferral,
  claimReward,
  creditStakeReward,
  creditUser,
  getContractCoverage,
  getContractInventory,
  getDappConfig,
  revokeGrant,
  settleDaily,
  transferContractAdmin,
  transferDappAdmin,
  updateContractConfig,
  updateDappConfig,
  updateDappPrice,
  updateEmission,
} from '@/api/contractCore'

const { Title, Text } = Typography

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const base58Rule = { pattern: BASE58_RE, message: '请输入合法的 Solana 地址' }

// DApp 合约可配置参数（与后端 update-dapp-config 白名单一致）
const DAPP_CONFIG_FIELDS: Array<{ key: string; label: string; kind: 'pubkey' | 'u64' }> = [
  { key: 'operator', label: '记账热钱包（operator）', kind: 'pubkey' },
  { key: 'marketWallet', label: '市场运营钱包（占 11%）', kind: 'pubkey' },
  { key: 'airdropPoolVault', label: '空投池金库', kind: 'pubkey' },
  { key: 'promoWallet', label: '推广分红金库（一推五）', kind: 'pubkey' },
  { key: 't7Vault', label: 'T7 分红金库', kind: 'pubkey' },
  { key: 'stake15dVault', label: '15天质押金库', kind: 'pubkey' },
  { key: 'stake30dVault', label: '30天质押金库', kind: 'pubkey' },
  { key: 'stake90dVault', label: '90天质押金库', kind: 'pubkey' },
  { key: 'stake150dVault', label: '150天质押金库', kind: 'pubkey' },
  { key: 'blackhole', label: '黑洞销毁地址', kind: 'pubkey' },
  { key: 'usdtMint', label: 'USDT 代币地址', kind: 'pubkey' },
  { key: 'airdropPoolBps', label: '空投进池比例', kind: 'u64' },
  { key: 'airdropBurnBps', label: '空投销毁比例', kind: 'u64' },
  { key: 'airdropDailyBpsLow', label: '低档每日释放比例', kind: 'u64' },
  { key: 'airdropDailyBpsHigh', label: '高档每日释放比例', kind: 'u64' },
  { key: 'airdropTierThresholdUsdt', label: '高低档分界金额', kind: 'u64' },
  { key: 'airdropMinUsdt', label: '最低参与金额（0=不限）', kind: 'u64' },
  { key: 'airdropTotalMultiplier', label: '空投总量倍数', kind: 'u64' },
  { key: 'airdropWithdrawFeeBps', label: '提现总手续费', kind: 'u64' },
  { key: 'feeMarketBps', label: '手续费-市场运营', kind: 'u64' },
  { key: 'feePromoBps', label: '手续费-推广分红', kind: 'u64' },
  { key: 'feeStake15dBps', label: '手续费-15天池', kind: 'u64' },
  { key: 'feeStake30dBps', label: '手续费-30天池', kind: 'u64' },
  { key: 'feeStake90dBps', label: '手续费-90天池', kind: 'u64' },
  { key: 'feeStake150dBps', label: '手续费-150天池', kind: 'u64' },
  { key: 'feeT7Bps', label: '手续费-T7 分红', kind: 'u64' },
  { key: 'minStakeAmount', label: '最低质押数量', kind: 'u64' },
  { key: 'zeroCardPriceUsdt', label: '零撸卡价格', kind: 'u64' },
]

const coverageStatusColor: Record<string, string> = {
  implemented: 'success',
  partial: 'warning',
  queued_worker: 'processing',
  h5_user_signed: 'default',
}

type Unit = 'bps' | 'usdt6' | 'peak9' | 'int' | null

// raw 整数按精度还原为可读字符串（去尾零）
function fmtUnits(raw: string | number, decimals: number): string {
  const s = String(raw)
  if (!/^\d+$/.test(s)) return ''
  const base = 10n ** BigInt(decimals)
  const v = BigInt(s)
  const int = v / base
  const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return frac ? `${int}.${frac}` : int.toString()
}

// 由配置字段 key 推断单位（bps / USDT-6位 / PEAK-9位 / 纯整数）
function unitOf(f?: { key: string; kind: string }): Unit {
  if (!f || f.kind === 'pubkey') return null
  if (/Bps$/.test(f.key)) return 'bps'
  if (/Usdt/i.test(f.key)) return 'usdt6'
  if (f.key === 'minStakeAmount') return 'peak9'
  return 'int'
}

// raw 值 → 可读换算提示文案；无法换算时返回空串
function conversionHint(unit: Unit, raw: any): string {
  if (!unit || unit === 'int') return ''
  const s = String(raw ?? '')
  if (!/^\d+$/.test(s)) return ''
  if (unit === 'bps') return `≈ ${Number(s) / 100}%`
  if (unit === 'usdt6') return `≈ ${fmtUnits(s, 6)} USDT`
  if (unit === 'peak9') return `≈ ${fmtUnits(s, 9)} PEAK`
  return ''
}

// 人类可读数值（如 1000）→ 链上最小单位 raw（按精度放大）
function humanToRaw(human: any, decimals: number): string {
  const s = String(human ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return ''
  const [i, f = ''] = s.split('.')
  const frac = f.slice(0, decimals).padEnd(decimals, '0')
  return (BigInt(i) * 10n ** BigInt(decimals) + BigInt(frac || '0')).toString()
}

// 提交前会换算成的链上最小单位预览
function rawPreview(human: any, decimals: number): string {
  const raw = humanToRaw(human, decimals)
  return raw ? `提交时将换算为最小单位：${raw}` : ''
}

// 金额输入校验：非负数字（可带小数）
const amountRule = { pattern: /^\d+(\.\d+)?$/, message: '请输入数字金额' }

// 配置项按单位给出"填写什么"的提示文案
function cfgUnitLabel(unit: Unit): string {
  if (unit === 'bps') return '百分比 %'
  if (unit === 'usdt6') return 'USDT'
  if (unit === 'peak9') return 'PEAK'
  if (unit === 'int') return '整数'
  return '地址'
}

// 把配置项的"人类可读输入"换算成链上 raw；非法返回 null
function cfgToRaw(meta: { key: string; kind: string }, input: any): string | null {
  const s = String(input ?? '').trim()
  if (meta.kind === 'pubkey') return BASE58_RE.test(s) ? s : null
  const unit = unitOf(meta)
  if (unit === 'bps') {
    if (!/^\d+(\.\d+)?$/.test(s)) return null
    return String(Math.round(Number(s) * 100)) // 百分比 → 基点
  }
  if (unit === 'usdt6') return humanToRaw(s, 6) || null
  if (unit === 'peak9') return humanToRaw(s, 9) || null
  return /^\d+$/.test(s) ? s : null // 纯整数（如倍数）
}

// 单个操作的卡片：独立 Form 实例 + 校验 + 提交按钮，避免多表单共用一个实例。
function ActionCard({
  title, desc, form, onSubmit, okText = '执行', danger, children,
}: any) {
  const [submitting, setSubmitting] = useState(false)
  const handleFinish = async (values: any) => {
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch { /* 错误由全局拦截器提示 */ } finally {
      setSubmitting(false)
    }
  }
  return (
    <Card size="small" title={title} style={{ borderRadius: 10, height: '100%' }}>
      {desc ? (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>{desc}</Text>
      ) : null}
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        {children}
        <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
          <Button type="primary" danger={danger} htmlType="submit" block loading={submitting}>{okText}</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default function ContractCorePage() {
  const { message, modal } = App.useApp()
  const [coverage, setCoverage] = useState<any[]>([])
  const [inventory, setInventory] = useState<any>(null)
  const [dappConfig, setDappConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dappCfgLoading, setDappCfgLoading] = useState(false)

  // 每个操作独立的 Form 实例
  const [settleF] = Form.useForm()
  const [transferNodeF] = Form.useForm()
  const [transferAdminF] = Form.useForm()
  const [revokeF] = Form.useForm()
  const [emissionF] = Form.useForm()
  const [claimRewardF] = Form.useForm()
  const [updateConfigF] = Form.useForm()
  const [creditUserF] = Form.useForm()
  const [priceF] = Form.useForm()
  const [csrF] = Form.useForm()
  const [cfgChangeF] = Form.useForm()
  const [transferDappF] = Form.useForm()

  // 实时换算提示：监听各 raw 输入，按单位换算为可读值
  const cfgFieldKey = Form.useWatch('dappCfgField', cfgChangeF)
  const cfgValue = Form.useWatch('dappCfgValue', cfgChangeF)
  const cfgMeta = DAPP_CONFIG_FIELDS.find((f) => f.key === cfgFieldKey)
  const cfgRawPreview = (() => {
    if (!cfgMeta || cfgMeta.kind === 'pubkey') return ''
    const raw = cfgToRaw(cfgMeta, cfgValue)
    return raw ? `提交时将写入链上：${raw}` : ''
  })()
  const creditAmt = Form.useWatch('amount', creditUserF)
  const priceAmt = Form.useWatch('peakPriceUsdt', priceF)
  const csrAmt = Form.useWatch('amount', csrF)
  const nodePrice = Form.useWatch('nodePriceUsdt', updateConfigF)

  const loadDappConfig = async () => {
    setDappCfgLoading(true)
    try {
      const res: any = await getDappConfig()
      setDappConfig(res.data || null)
    } catch {
      setDappConfig(null)
    } finally {
      setDappCfgLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [coverageRes, inventoryRes]: any = await Promise.allSettled([
        getContractCoverage(),
        getContractInventory(),
      ])
      setCoverage(coverageRes.status === 'fulfilled' ? (coverageRes.value.data || []) : [])
      setInventory(inventoryRes.status === 'fulfilled' ? (inventoryRes.value.data || null) : null)
    } finally {
      setLoading(false)
    }
    loadDappConfig()
  }

  useEffect(() => { loadData() }, [])

  // 成功后提示并刷新；失败由拦截器提示并向上抛出（让按钮 loading 结束）。
  const after = (okMessage: string, reload?: () => void) => {
    message.success(okMessage)
    if (reload) reload()
  }

  const submitDappConfigChange = (values: any) => new Promise<void>((resolve, reject) => {
    const meta = DAPP_CONFIG_FIELDS.find((f) => f.key === values.dappCfgField)
    if (!meta) { message.warning('请先选择要修改的参数'); resolve(); return }
    const input = String(values.dappCfgValue ?? '').trim()
    const raw = cfgToRaw(meta, input)
    if (raw == null) {
      message.warning(meta.kind === 'pubkey' ? `${meta.label} 需要合法的 Solana 地址` : `${meta.label} 输入格式不正确`)
      resolve(); return
    }
    const unit = unitOf(meta)
    const readable = meta.kind !== 'pubkey' && unit && unit !== 'int' ? `（你填写的是 ${input} ${cfgUnitLabel(unit)}）` : ''
    modal.confirm({
      title: '确认修改链上配置？',
      content: (
        <div>
          将把 <b>{meta.label}</b> 修改为：
          <div style={{ margin: '8px 0' }}>
            <Text code copyable={meta.kind === 'pubkey'}>{raw}</Text>
            {readable ? <Text type="secondary" style={{ marginLeft: 8 }}>{readable}</Text> : null}
          </div>
          <Text type="warning">admin 将签名直接上链，链上会复核不变量（如进池+销毁=100%、7 份手续费合计=总费率），非法组合会被拒绝。</Text>
        </div>
      ),
      okText: '确认上链',
      cancelText: '取消',
      onOk: async () => {
        try {
          await updateDappConfig({ [meta.key]: raw })
          after(`已修改：${meta.label}`, loadDappConfig)
          cfgChangeF.resetFields()
          resolve()
        } catch (e) {
          reject(e)
          throw e
        }
      },
      onCancel: () => resolve(),
    })
  })

  // ────────────────────────── 概览 Tab ──────────────────────────
  const overviewTab = (
    <Row gutter={16}>
      <Col xs={24} lg={9}>
        <Card title="节点销售库存" loading={loading} style={{ borderRadius: 12, height: '100%' }}>
          <Descriptions column={1} size="small" labelStyle={{ width: 110 }}>
            <Descriptions.Item label="Program">
              <Text copyable={!!inventory?.programId} style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {inventory?.programId || '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Collection">
              <Text copyable={!!inventory?.collection} style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {inventory?.collection || '-'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="已售 / 预铸">{inventory?.soldTotal ?? '-'} / {inventory?.premintedTotal ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="剩余">{inventory?.remaining ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="最近结算日">{inventory?.lastSettledDay ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="暂停状态">
              <Tag color={inventory?.paused ? 'error' : 'success'}>{inventory?.paused ? '已暂停' : '运行中'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      <Col xs={24} lg={15}>
        <Card title="合约指令覆盖" style={{ borderRadius: 12, height: '100%' }}>
          <Table
            rowKey={(r: any) => `${r.domain}:${r.instruction}`}
            size="small"
            pagination={false}
            scroll={{ y: 360 }}
            dataSource={coverage}
            columns={[
              { title: 'Domain', dataIndex: 'domain', width: 160 },
              { title: 'Instruction', dataIndex: 'instruction' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 140,
                render: (v: string) => <Tag color={coverageStatusColor[v] || 'default'}>{v}</Tag>,
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  )

  // ────────────────────────── 节点合约 Tab ──────────────────────────
  const nodeTab = (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="每日收益结算"
          desc="对某一天做链上收益结算。系统通常每天自动结算，这里用于手动补结算。（合约指令 settle_daily）"
          form={settleF}
          okText="执行结算"
          onSubmit={async (v: any) => { await settleDaily(v.day); after('已提交结算', loadData) }}
        >
          <Form.Item name="day" label="结算第几天" extra="从合约启动当天起算的天数序号" rules={[{ required: true, message: '请输入要结算的天数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="例如 30" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="赠送 / 补发节点"
          desc="把下一个待售节点直接发放到指定钱包，常用于补单或赠送。（合约指令 admin_transfer_node）"
          form={transferNodeF}
          okText="发放节点"
          onSubmit={async (v: any) => { await adminTransferNode(v.receiverWallet); after('节点已发放', loadData) }}
        >
          <Form.Item name="receiverWallet" label="接收节点的钱包地址" rules={[{ required: true, message: '请输入接收钱包' }, base58Rule]}>
            <Input placeholder="对方的 Solana 钱包地址" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="移交合约管理员"
          desc="把节点合约的最高管理权限交给另一个钱包。移交后当前管理员将失去权限，不可撤销，请谨慎。（合约指令 transfer_admin）"
          form={transferAdminF}
          okText="移交管理员"
          danger
          onSubmit={async (v: any) => { await transferContractAdmin(v.newAdmin); after('管理员已移交', loadData) }}
        >
          <Form.Item name="newAdmin" label="新管理员钱包地址" rules={[{ required: true, message: '请输入新管理员地址' }, base58Rule]}>
            <Input placeholder="新管理员的 Solana 钱包地址" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="撤销授予额度"
          desc="撤销某笔已发放的授予额度（如归属/空投授予）。（合约指令 revoke_grant）"
          form={revokeF}
          okText="撤销授予"
          danger
          onSubmit={async (v: any) => { await revokeGrant(v.grantId); after('授予已撤销', loadData) }}
        >
          <Form.Item name="grantId" label="授予编号" extra="发放授予时生成的编号（grant ID）" rules={[{ required: true, message: '请输入授予编号' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="例如 1" />
          </Form.Item>
        </ActionCard>
      </Col>

      <Col xs={24} lg={8}>
        <ActionCard
          title="设置代币释放节奏"
          desc="设定某个时间段内，每天产出（释放）多少代币。（合约指令 update_emission）"
          form={emissionF}
          okText="保存释放节奏"
          onSubmit={async (v: any) => {
            await updateEmission([{ startOffset: v.startOffset, endOffset: v.endOffset, dailyEmission: v.dailyEmission }])
            after('释放节奏已更新', loadData)
          }}
        >
          <Form.Item name="startOffset" label="起始第几天" extra="从合约启动起算" rules={[{ required: true, message: '请输入起始天' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 0" />
          </Form.Item>
          <Form.Item name="endOffset" label="结束第几天" rules={[{ required: true, message: '请输入结束天' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 365" />
          </Form.Item>
          <Form.Item name="dailyEmission" label="每天释放数量" extra="链上最小单位（与代币精度一致）" rules={[{ required: true, message: '请输入每天释放数量' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="代用户领取节点奖励"
          desc="替指定用户领取某个节点的挖矿奖励（进入领取队列）。（合约指令 claim_reward）"
          form={claimRewardF}
          okText="代领奖励"
          onSubmit={async (v: any) => {
            await claimReward({ userId: v.userId, nodeIndex: v.nodeIndex, assetAddress: v.assetAddress })
            after('已加入领取队列')
          }}
        >
          <Form.Item name="userId" label="用户 ID" extra="系统内的用户编号" rules={[{ required: true, message: '请输入用户 ID' }]}>
            <Input placeholder="例如 1024" />
          </Form.Item>
          <Form.Item name="nodeIndex" label="第几个节点" extra="该用户名下节点的序号" rules={[{ required: true, message: '请输入节点序号' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="例如 1" />
          </Form.Item>
          <Form.Item name="assetAddress" label="节点 NFT 地址" rules={[{ required: true, message: '请输入节点 NFT 地址' }, base58Rule]}>
            <Input placeholder="节点 NFT 的 Solana 地址" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="修改节点销售设置"
          desc="调整单个节点的售价，以及每次最多可购买的数量。（合约指令 update_config）"
          form={updateConfigF}
          okText="保存销售设置"
          onSubmit={async (v: any) => {
            await updateContractConfig({
              nodePriceUsdt: v.nodePriceUsdt,
              maxPurchasePerTx: v.maxPurchasePerTx,
            })
            after('销售设置已更新', loadData)
          }}
        >
          <Form.Item name="nodePriceUsdt" label="单个节点售价（USDT 最小单位）" extra={conversionHint('usdt6', nodePrice ? String(nodePrice) : '') || '按链上最小单位填写，如 100 USDT = 100000000'} rules={[{ required: true, message: '请输入售价' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 100000000" />
          </Form.Item>
          <Form.Item name="maxPurchasePerTx" label="每次最多购买数量">
            <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="例如 10" />
          </Form.Item>
          <Divider style={{ margin: '4px 0 12px' }} />
          <Button block onClick={() => claimReferral().then(() => after('推荐奖励已领取', loadData))}>
            领取推荐奖励
          </Button>
        </ActionCard>
      </Col>
    </Row>
  )

  // ────────────────────────── DApp 运营记账 Tab ──────────────────────────
  const dappOpsTab = (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <ActionCard
          title="给用户发放可提现额度"
          desc="给用户增加一笔可提现/可领取的额度（如发放空投收益），用户之后自己提现。（合约指令 credit_user）"
          form={creditUserF}
          okText="发放额度"
          onSubmit={async (v: any) => {
            await creditUser({ user: v.user, bucket: v.bucket, amount: humanToRaw(v.amount, 9) })
            after('额度已发放')
          }}
        >
          <Form.Item name="user" label="用户钱包地址" rules={[{ required: true, message: '请输入钱包地址' }, base58Rule]}>
            <Input placeholder="用户的 Solana 钱包地址" />
          </Form.Item>
          <Form.Item name="bucket" label="额度类型" rules={[{ required: true, message: '请选择额度类型' }]}>
            <Select
              options={[
                { value: 1, label: '空投收益提现' },
                { value: 2, label: '推广分红（一推五）' },
                { value: 3, label: 'T7 加权分红' },
              ]}
            />
          </Form.Item>
          <Form.Item name="amount" label="发放数量（PEAK）" extra={rawPreview(creditAmt, 9)} rules={[{ required: true, message: '请输入数量' }, amountRule]}>
            <Input placeholder="例如 1000" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="更新 PEAK 价格"
          desc="更新系统记录的 PEAK 当前价格，用于空投、零撸卡的折算。系统已定时自动刷价，这里用于手动应急更新。（合约指令 update_price）"
          form={priceF}
          okText="更新价格"
          onSubmit={async (v: any) => {
            await updateDappPrice({ peakPriceUsdt: humanToRaw(v.peakPriceUsdt, 6), maxStaleSecs: v.maxStaleSecs ?? undefined })
            after('价格已更新')
          }}
        >
          <Form.Item name="peakPriceUsdt" label="1 个 PEAK 的价格（USDT）" extra={rawPreview(priceAmt, 6)} rules={[{ required: true, message: '请输入价格' }, amountRule]}>
            <Input placeholder="例如 0.05" />
          </Form.Item>
          <Form.Item name="maxStaleSecs" label="价格有效时长（秒，选填）" extra="超过该时长价格视为过期；留空或 0 表示沿用现有设置">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="例如 600" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="给质押订单补发收益"
          desc="给某个质押订单补发一笔待领取的收益，用户之后自己领取。（合约指令 credit_stake_reward）"
          form={csrF}
          okText="补发收益"
          onSubmit={async (v: any) => {
            await creditStakeReward({
              periodDays: v.periodDays, positionOwner: v.positionOwner, positionId: v.positionId, amount: humanToRaw(v.amount, 9),
            })
            after('收益已补发')
          }}
        >
          <Form.Item name="periodDays" label="质押周期" rules={[{ required: true, message: '请选择周期' }]}>
            <Select options={[15, 30, 90, 150].map((d) => ({ value: d, label: `${d} 天` }))} />
          </Form.Item>
          <Form.Item name="positionOwner" label="质押用户钱包地址" rules={[{ required: true, message: '请输入钱包地址' }, base58Rule]}>
            <Input placeholder="质押用户的 Solana 钱包地址" />
          </Form.Item>
          <Form.Item name="positionId" label="质押订单编号" extra="该质押仓位的编号（position ID）" rules={[{ required: true, message: '请输入质押订单编号' }]}>
            <Input placeholder="例如 1" />
          </Form.Item>
          <Form.Item name="amount" label="补发收益（PEAK）" extra={rawPreview(csrAmt, 9)} rules={[{ required: true, message: '请输入数量' }, amountRule]}>
            <Input placeholder="例如 50" />
          </Form.Item>
        </ActionCard>
      </Col>
    </Row>
  )

  // ────────────────────────── DApp 配置 Tab ──────────────────────────
  const dappConfigTab = (
    <Row gutter={16}>
      <Col xs={24} lg={14}>
        <Card
          title="链上配置当前值"
          style={{ borderRadius: 12, height: '100%' }}
          extra={<Button size="small" icon={<ReloadOutlined />} loading={dappCfgLoading} onClick={loadDappConfig}>刷新</Button>}
        >
          <Table
            rowKey="key"
            size="small"
            loading={dappCfgLoading}
            pagination={false}
            scroll={{ y: 460 }}
            dataSource={[
              { key: 'admin', label: '治理 admin（transfer_dapp_admin 修改）', value: dappConfig?.admin },
              ...DAPP_CONFIG_FIELDS.map((f) => ({ key: f.key, label: f.label, value: dappConfig?.[f.key] })),
              { key: 'paused', label: '暂停状态', value: String(dappConfig?.paused ?? '-') },
            ]}
            columns={[
              { title: '参数', dataIndex: 'label', width: 200 },
              {
                title: '当前链上值',
                dataIndex: 'value',
                render: (v: any, row: any) => {
                  const meta = DAPP_CONFIG_FIELDS.find((f) => f.key === row.key)
                  const hint = meta ? conversionHint(unitOf(meta), v) : ''
                  return (
                    <span>
                      <Text code copyable={typeof v === 'string' && v.length > 20}>{v?.toString?.() ?? '-'}</Text>
                      {hint ? <Text type="secondary" style={{ marginLeft: 8 }}>{hint}</Text> : null}
                    </span>
                  )
                },
              },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ActionCard
            title="修改单个参数"
            desc="选好参数后按可读值填写：比例填百分比(%)，金额填 USDT 或 PEAK，系统自动换算上链。比例约束（如进池+销毁=100%）由链上强制校验。"
            form={cfgChangeF}
            okText="提交修改"
            onSubmit={submitDappConfigChange}
          >
            <Form.Item name="dappCfgField" label="参数" rules={[{ required: true, message: '请选择参数' }]}>
              <Select
                showSearch
                placeholder="选择要修改的参数"
                optionFilterProp="label"
                options={DAPP_CONFIG_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
              />
            </Form.Item>
            <Form.Item
              name="dappCfgValue"
              label={cfgMeta ? `新值（填${cfgUnitLabel(unitOf(cfgMeta))}）` : '新值'}
              extra={cfgRawPreview}
              rules={[{ required: true, message: '请输入新值' }]}
            >
              <Input placeholder={cfgMeta ? `请输入${cfgUnitLabel(unitOf(cfgMeta))}` : '请先选择上方参数'} />
            </Form.Item>
          </ActionCard>

          <ActionCard
            title="移交治理 admin"
            desc="transfer_dapp_admin：移交后当前 admin 失去全部治理权限（建议 Squads 多签）"
            form={transferDappF}
            okText="执行 transfer_dapp_admin"
            danger
            onSubmit={(v: any) => new Promise<void>((resolve, reject) => {
              modal.confirm({
                title: '确认移交治理 admin？',
                content: (
                  <div>
                    移交后<b>当前 admin 将失去全部治理权限</b>，此操作不可逆。新 admin：
                    <div style={{ marginTop: 8 }}><Text code copyable>{v.dappNewAdmin}</Text></div>
                  </div>
                ),
                okText: '确认移交',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: async () => {
                  try {
                    await transferDappAdmin(v.dappNewAdmin)
                    after('transfer_dapp_admin 成功', loadDappConfig)
                    transferDappF.resetFields()
                    resolve()
                  } catch (e) { reject(e); throw e }
                },
                onCancel: () => resolve(),
              })
            })}
          >
            <Form.Item name="dappNewAdmin" label="新 admin 地址" rules={[{ required: true, message: '请输入地址' }, base58Rule]}>
              <Input placeholder="Solana 地址" />
            </Form.Item>
          </ActionCard>
        </Space>
      </Col>
    </Row>
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>合约核心控制台</Title>
        <Text type="secondary">按合约指令执行销售、结算、奖励、配置与管理操作</Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs
          defaultActiveKey="overview"
          items={[
            { key: 'overview', label: '概览', children: overviewTab },
            { key: 'node', label: '节点合约操作', children: nodeTab },
            { key: 'dappOps', label: 'DApp 运营记账', children: dappOpsTab },
            { key: 'dappConfig', label: 'DApp 合约配置', children: dappConfigTab },
          ]}
        />
      </Card>
    </div>
  )
}
