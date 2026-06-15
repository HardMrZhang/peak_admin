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
  { key: 'operator', label: 'operator 记账热钱包', kind: 'pubkey' },
  { key: 'marketWallet', label: '市场运营 11% 钱包（建议多签）', kind: 'pubkey' },
  { key: 'airdropPoolVault', label: '空投池金库', kind: 'pubkey' },
  { key: 'promoWallet', label: '1推5 推广分红金库', kind: 'pubkey' },
  { key: 't7Vault', label: 'T7 分红金库', kind: 'pubkey' },
  { key: 'stake15dVault', label: '15天质押池金库', kind: 'pubkey' },
  { key: 'stake30dVault', label: '30天质押池金库', kind: 'pubkey' },
  { key: 'stake90dVault', label: '90天质押池金库', kind: 'pubkey' },
  { key: 'stake150dVault', label: '150天质押池金库', kind: 'pubkey' },
  { key: 'blackhole', label: '黑洞地址（保留字段）', kind: 'pubkey' },
  { key: 'usdtMint', label: 'USDT mint', kind: 'pubkey' },
  { key: 'airdropPoolBps', label: '空投进池比例 bps（9000=90%）', kind: 'u64' },
  { key: 'airdropBurnBps', label: '空投销毁比例 bps（1000=10%）', kind: 'u64' },
  { key: 'airdropDailyBpsLow', label: '低档日释放 bps（140=1.4%）', kind: 'u64' },
  { key: 'airdropDailyBpsHigh', label: '高档日释放 bps（150=1.5%）', kind: 'u64' },
  { key: 'airdropTierThresholdUsdt', label: '定档阈值 USDT-6位（500U=500000000）', kind: 'u64' },
  { key: 'airdropMinUsdt', label: '最低参与门槛 USDT-6位（100U=100000000；0=不限）', kind: 'u64' },
  { key: 'airdropTotalMultiplier', label: '空投总量倍数（默认 3）', kind: 'u64' },
  { key: 'airdropWithdrawFeeBps', label: '提现总费率 bps（2000=20%）', kind: 'u64' },
  { key: 'feeMarketBps', label: '手续费-市场 bps（1100=11%）', kind: 'u64' },
  { key: 'feePromoBps', label: '手续费-推广 bps（200=2%）', kind: 'u64' },
  { key: 'feeStake15dBps', label: '手续费-15天池 bps（60=0.6%）', kind: 'u64' },
  { key: 'feeStake30dBps', label: '手续费-30天池 bps（90=0.9%）', kind: 'u64' },
  { key: 'feeStake90dBps', label: '手续费-90天池 bps（150=1.5%）', kind: 'u64' },
  { key: 'feeStake150dBps', label: '手续费-150天池 bps（200=2%）', kind: 'u64' },
  { key: 'feeT7Bps', label: '手续费-T7 bps（200=2%；7份合计须等于总费率）', kind: 'u64' },
  { key: 'minStakeAmount', label: '最低质押 PEAK-9位（1000枚=1000000000000）', kind: 'u64' },
  { key: 'zeroCardPriceUsdt', label: '零撸卡价格 USDT-6位（100U=100000000）', kind: 'u64' },
]

const coverageStatusColor: Record<string, string> = {
  implemented: 'success',
  partial: 'warning',
  queued_worker: 'processing',
  h5_user_signed: 'default',
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
  const { message } = App.useApp()
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

  const submitDappConfigChange = async (values: any) => {
    const meta = DAPP_CONFIG_FIELDS.find((f) => f.key === values.dappCfgField)
    if (!meta) { message.warning('请先选择要修改的参数'); return }
    const value = String(values.dappCfgValue ?? '').trim()
    if (meta.kind === 'u64' && !/^\d+$/.test(value)) {
      message.warning(`${meta.label} 需要非负整数（raw 值）`); return
    }
    if (meta.kind === 'pubkey' && !BASE58_RE.test(value)) {
      message.warning(`${meta.label} 需要合法的 Solana 地址`); return
    }
    await updateDappConfig({ [meta.key]: value })
    after(`已修改：${meta.label}`, loadDappConfig)
    cfgChangeF.resetFields()
  }

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
          title="每日结算"
          desc="settle_daily：触发指定天的链上结算"
          form={settleF}
          okText="触发 settle_daily"
          onSubmit={async (v: any) => { await settleDaily(v.day); after('settle_daily 已提交', loadData) }}
        >
          <Form.Item name="day" label="天序号 (day)" rules={[{ required: true, message: '请输入天序号' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="day" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="划转节点"
          desc="admin_transfer_node：把下一个节点转给指定钱包"
          form={transferNodeF}
          okText="执行 admin_transfer_node"
          onSubmit={async (v: any) => { await adminTransferNode(v.receiverWallet); after('admin_transfer_node 成功', loadData) }}
        >
          <Form.Item name="receiverWallet" label="接收钱包" rules={[{ required: true, message: '请输入接收钱包' }, base58Rule]}>
            <Input placeholder="Solana 地址" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="移交管理员"
          desc="transfer_admin：移交节点合约 admin（不可逆）"
          form={transferAdminF}
          okText="执行 transfer_admin"
          danger
          onSubmit={async (v: any) => { await transferContractAdmin(v.newAdmin); after('transfer_admin 成功', loadData) }}
        >
          <Form.Item name="newAdmin" label="新 admin 地址" rules={[{ required: true, message: '请输入新 admin 地址' }, base58Rule]}>
            <Input placeholder="Solana 地址" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <ActionCard
          title="撤销授予"
          desc="revoke_grant：撤销指定 grant"
          form={revokeF}
          okText="执行 revoke_grant"
          danger
          onSubmit={async (v: any) => { await revokeGrant(v.grantId); after('revoke_grant 成功', loadData) }}
        >
          <Form.Item name="grantId" label="grantId" rules={[{ required: true, message: '请输入 grantId' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="grantId" />
          </Form.Item>
        </ActionCard>
      </Col>

      <Col xs={24} lg={8}>
        <ActionCard
          title="更新释放曲线"
          desc="update_emission：设置一段释放区间"
          form={emissionF}
          okText="执行 update_emission"
          onSubmit={async (v: any) => {
            await updateEmission([{ startOffset: v.startOffset, endOffset: v.endOffset, dailyEmission: v.dailyEmission }])
            after('update_emission 成功', loadData)
          }}
        >
          <Form.Item name="startOffset" label="startOffset" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endOffset" label="endOffset" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dailyEmission" label="dailyEmission" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="领取奖励"
          desc="claim_reward：为指定用户节点领取奖励（入队）"
          form={claimRewardF}
          okText="执行 claim_reward"
          onSubmit={async (v: any) => {
            await claimReward({ userId: v.userId, nodeIndex: v.nodeIndex, assetAddress: v.assetAddress })
            after('claim_reward 已入队')
          }}
        >
          <Form.Item name="userId" label="用户 ID" rules={[{ required: true, message: '请输入用户 ID' }]}>
            <Input placeholder="userId" />
          </Form.Item>
          <Form.Item name="nodeIndex" label="nodeIndex" rules={[{ required: true, message: '请输入 nodeIndex' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="assetAddress" label="资产地址" rules={[{ required: true, message: '请输入资产地址' }, base58Rule]}>
            <Input placeholder="assetAddress" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="更新销售配置"
          desc="update_config：节点价格 / 单笔上限"
          form={updateConfigF}
          okText="执行 update_config"
          onSubmit={async (v: any) => {
            await updateContractConfig({ nodePriceUsdt: v.nodePriceUsdt, maxPurchasePerTx: v.maxPurchasePerTx })
            after('update_config 成功', loadData)
          }}
        >
          <Form.Item name="nodePriceUsdt" label="节点价格 USDT（6位精度 raw）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxPurchasePerTx" label="单笔最大购买数">
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Divider style={{ margin: '4px 0 12px' }} />
          <Button block onClick={() => claimReferral().then(() => after('claim_referral 成功', loadData))}>
            执行 claim_referral
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
          title="写入可提额度"
          desc="credit_user：给用户链上账本写可提额度"
          form={creditUserF}
          okText="执行 credit_user"
          onSubmit={async (v: any) => {
            await creditUser({ user: v.user, bucket: v.bucket, amount: v.amount })
            after('credit_user 已入队')
          }}
        >
          <Form.Item name="user" label="用户钱包地址" rules={[{ required: true, message: '请输入钱包地址' }, base58Rule]}>
            <Input placeholder="Solana 地址" />
          </Form.Item>
          <Form.Item name="bucket" label="额度桶" rules={[{ required: true, message: '请选择额度桶' }]}>
            <Select
              options={[
                { value: 1, label: '1 - 空投收益提现（20% 七份拆分）' },
                { value: 2, label: '2 - 推广分红（promo）' },
                { value: 3, label: '3 - T7 加权分红（t7）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="amount" label="数量（raw，9 位精度）" rules={[{ required: true, message: '请输入数量' }]}>
            <Input placeholder="如 1000000000000" />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="更新价格源"
          desc="update_price：空投/零撸卡折算依赖（worker 已定时刷价，此处用于应急）"
          form={priceF}
          okText="执行 update_price"
          onSubmit={async (v: any) => {
            await updateDappPrice({ peakPriceUsdt: v.peakPriceUsdt, maxStaleSecs: v.maxStaleSecs ?? undefined })
            after('update_price 已入队')
          }}
        >
          <Form.Item name="peakPriceUsdt" label="PEAK 价格 USDT（6位精度 raw）" rules={[{ required: true, message: '请输入价格' }]}>
            <Input placeholder="1 PEAK 的 USDT 价 raw" />
          </Form.Item>
          <Form.Item name="maxStaleSecs" label="maxStaleSecs（可选，0 沿用现值）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </ActionCard>
      </Col>
      <Col xs={24} lg={8}>
        <ActionCard
          title="补写质押收益"
          desc="credit_stake_reward：补写质押仓位待领收益"
          form={csrF}
          okText="执行 credit_stake_reward"
          onSubmit={async (v: any) => {
            await creditStakeReward({
              periodDays: v.periodDays, positionOwner: v.positionOwner, positionId: v.positionId, amount: v.amount,
            })
            after('credit_stake_reward 已入队')
          }}
        >
          <Form.Item name="periodDays" label="质押周期" rules={[{ required: true, message: '请选择周期' }]}>
            <Select options={[15, 30, 90, 150].map((d) => ({ value: d, label: `${d} 天` }))} />
          </Form.Item>
          <Form.Item name="positionOwner" label="仓位所有者钱包" rules={[{ required: true, message: '请输入钱包地址' }, base58Rule]}>
            <Input placeholder="Solana 地址" />
          </Form.Item>
          <Form.Item name="positionId" label="positionId" rules={[{ required: true, message: '请输入 positionId' }]}>
            <Input placeholder="positionId" />
          </Form.Item>
          <Form.Item name="amount" label="收益数量（raw，9 位精度）" rules={[{ required: true, message: '请输入数量' }]}>
            <Input placeholder="如 1000000000" />
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
              { title: '参数', dataIndex: 'label', width: 260 },
              {
                title: '当前链上值',
                dataIndex: 'value',
                render: (v: any) => <Text code copyable={typeof v === 'string' && v.length > 20}>{v?.toString?.() ?? '-'}</Text>,
              },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ActionCard
            title="修改单个参数"
            desc="update_dapp_config：admin 签名直接上链。单位：*Bps=基点(10000=100%)；*Usdt=6位；PEAK=9位。比例约束由链上强制校验。"
            form={cfgChangeF}
            okText="提交修改"
            onSubmit={submitDappConfigChange}
          >
            <Form.Item name="dappCfgField" label="参数" rules={[{ required: true, message: '请选择参数' }]}>
              <Select
                showSearch
                placeholder="选择要修改的参数"
                optionFilterProp="label"
                options={DAPP_CONFIG_FIELDS.map((f) => ({ value: f.key, label: `${f.label}（${f.key}）` }))}
              />
            </Form.Item>
            <Form.Item name="dappCfgValue" label="新值" rules={[{ required: true, message: '请输入新值' }]}>
              <Input placeholder="地址 或 整数 raw 值（单位见参数说明）" />
            </Form.Item>
          </ActionCard>

          <ActionCard
            title="移交治理 admin"
            desc="transfer_dapp_admin：移交后当前 admin 失去全部治理权限（建议 Squads 多签）"
            form={transferDappF}
            okText="执行 transfer_dapp_admin"
            danger
            onSubmit={async (v: any) => { await transferDappAdmin(v.dappNewAdmin); after('transfer_dapp_admin 成功', loadDappConfig) }}
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
