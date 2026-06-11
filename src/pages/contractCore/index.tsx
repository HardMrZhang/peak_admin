import { useEffect, useState } from 'react'
import { App, Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Table, Typography } from 'antd'
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

// DApp 合约可配置参数（与后端 update-dapp-config 白名单一致）
const DAPP_CONFIG_FIELDS: Array<{ key: string; label: string; kind: 'pubkey' | 'u64' }> = [
  // —— 角色 / 钱包 / 金库 ——
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
  // —— 空投参数 ——
  { key: 'airdropPoolBps', label: '空投进池比例 bps（9000=90%）', kind: 'u64' },
  { key: 'airdropBurnBps', label: '空投销毁比例 bps（1000=10%，与进池合计须 10000）', kind: 'u64' },
  { key: 'airdropDailyBpsLow', label: '低档日释放 bps（140=1.4%）', kind: 'u64' },
  { key: 'airdropDailyBpsHigh', label: '高档日释放 bps（150=1.5%）', kind: 'u64' },
  { key: 'airdropTierThresholdUsdt', label: '定档阈值 USDT-6位（500U=500000000）', kind: 'u64' },
  { key: 'airdropMinUsdt', label: '最低参与门槛 USDT-6位（100U=100000000；0=不限）', kind: 'u64' },
  { key: 'airdropTotalMultiplier', label: '空投总量倍数（默认 3）', kind: 'u64' },
  // —— 提现费率 ——
  { key: 'airdropWithdrawFeeBps', label: '提现总费率 bps（2000=20%）', kind: 'u64' },
  { key: 'feeMarketBps', label: '手续费-市场 bps（1100=11%）', kind: 'u64' },
  { key: 'feePromoBps', label: '手续费-推广 bps（200=2%）', kind: 'u64' },
  { key: 'feeStake15dBps', label: '手续费-15天池 bps（60=0.6%）', kind: 'u64' },
  { key: 'feeStake30dBps', label: '手续费-30天池 bps（90=0.9%）', kind: 'u64' },
  { key: 'feeStake90dBps', label: '手续费-90天池 bps（150=1.5%）', kind: 'u64' },
  { key: 'feeStake150dBps', label: '手续费-150天池 bps（200=2%）', kind: 'u64' },
  { key: 'feeT7Bps', label: '手续费-T7 bps（200=2%；7份合计须等于总费率）', kind: 'u64' },
  // —— 质押 / 零撸卡 ——
  { key: 'minStakeAmount', label: '最低质押 PEAK-9位（1000枚=1000000000000）', kind: 'u64' },
  { key: 'zeroCardPriceUsdt', label: '零撸卡价格 USDT-6位（100U=100000000）', kind: 'u64' },
]

export default function ContractCorePage() {
  const { message } = App.useApp()
  const [coverage, setCoverage] = useState<any[]>([])
  const [inventory, setInventory] = useState<any>(null)
  const [dappConfig, setDappConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dappCfgLoading, setDappCfgLoading] = useState(false)
  const [form] = Form.useForm()

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
      if (coverageRes.status === 'fulfilled') {
        setCoverage(coverageRes.value.data || [])
      } else {
        setCoverage([])
      }
      if (inventoryRes.status === 'fulfilled') {
        setInventory(inventoryRes.value.data || null)
      } else {
        setInventory(null)
      }
    } finally {
      setLoading(false)
    }
    loadDappConfig()
  }

  useEffect(() => {
    loadData()
  }, [])

  const runAction = async (fn: () => Promise<any>, okMessage: string) => {
    await fn()
    message.success(okMessage)
    loadData()
  }

  // 修改单个 DApp 配置参数（前端先做格式校验，链上 validate_all 最终复核）
  const submitDappConfigChange = async () => {
    const field = form.getFieldValue('dappCfgField')
    const value = String(form.getFieldValue('dappCfgValue') ?? '').trim()
    const meta = DAPP_CONFIG_FIELDS.find((f) => f.key === field)
    if (!meta) {
      message.warning('请先选择要修改的参数')
      return
    }
    if (!value) {
      message.warning('请输入新值')
      return
    }
    if (meta.kind === 'u64' && !/^\d+$/.test(value)) {
      message.warning(`${meta.label} 需要非负整数（raw 值）`)
      return
    }
    if (meta.kind === 'pubkey' && !BASE58_RE.test(value)) {
      message.warning(`${meta.label} 需要合法的 Solana 地址`)
      return
    }
    await runAction(() => updateDappConfig({ [field]: value }), `update_dapp_config 成功：${meta.label}`)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>合约核心控制台</Title>
        <Text type="secondary">按合约指令执行销售、结算、奖励、配置与管理操作</Text>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="库存状态" loading={loading} bordered={false} style={{ borderRadius: 12 }}>
            <p>Program: {inventory?.programId || '-'}</p>
            <p>Collection: {inventory?.collection || '-'}</p>
            <p>已售: {inventory?.soldTotal ?? '-'}</p>
            <p>预铸: {inventory?.premintedTotal ?? '-'}</p>
            <p>剩余: {inventory?.remaining ?? '-'}</p>
            <p>最近结算日: {inventory?.lastSettledDay ?? '-'}</p>
            <p>Paused: {String(inventory?.paused ?? '-')}</p>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="合约覆盖" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              rowKey="instruction"
              size="small"
              pagination={false}
              dataSource={coverage}
              columns={[
                { title: 'Domain', dataIndex: 'domain' },
                { title: 'Instruction', dataIndex: 'instruction' },
                { title: 'Status', dataIndex: 'status' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="执行操作" bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="day" label="settle_daily.day">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Button block onClick={() => runAction(() => settleDaily(form.getFieldValue('day')), 'settle_daily 已提交')}>触发 settle_daily</Button>
            </Col>
            <Col span={6}>
              <Form.Item name="receiverWallet" label="admin_transfer_node.receiverWallet">
                <Input />
              </Form.Item>
              <Button block onClick={() => runAction(() => adminTransferNode(form.getFieldValue('receiverWallet')), 'admin_transfer_node 成功')}>执行 admin_transfer_node</Button>
            </Col>
            <Col span={6}>
              <Form.Item name="newAdmin" label="transfer_admin.newAdmin">
                <Input />
              </Form.Item>
              <Button block onClick={() => runAction(() => transferContractAdmin(form.getFieldValue('newAdmin')), 'transfer_admin 成功')}>执行 transfer_admin</Button>
            </Col>
            <Col span={6}>
              <Form.Item name="grantId" label="revoke_grant.grantId">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Button block onClick={() => runAction(() => revokeGrant(form.getFieldValue('grantId')), 'revoke_grant 成功')}>执行 revoke_grant</Button>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={8}>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber min={0} style={{ width: '40%' }} placeholder="startOffset" onChange={(v) => form.setFieldValue('segmentStart', v)} />
                <InputNumber min={0} style={{ width: '40%' }} placeholder="endOffset" onChange={(v) => form.setFieldValue('segmentEnd', v)} />
                <InputNumber min={0} style={{ width: '50%' }} placeholder="dailyEmission" onChange={(v) => form.setFieldValue('segmentDaily', v)} />
              </Space.Compact>
              <Button style={{ marginTop: 8 }} block onClick={() => runAction(() => updateEmission([{ startOffset: form.getFieldValue('segmentStart'), endOffset: form.getFieldValue('segmentEnd'), dailyEmission: form.getFieldValue('segmentDaily') }]), 'update_emission 成功')}>执行 update_emission</Button>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input placeholder="claim_reward.userId" onChange={(e) => form.setFieldValue('claimUserId', e.target.value)} />
                <InputNumber min={1} style={{ width: '100%' }} placeholder="nodeIndex" onChange={(v) => form.setFieldValue('claimNodeIndex', v)} />
                <Input placeholder="assetAddress" onChange={(e) => form.setFieldValue('claimAssetAddress', e.target.value)} />
                <Button block onClick={() => runAction(() => claimReward({
                  userId: form.getFieldValue('claimUserId'),
                  nodeIndex: form.getFieldValue('claimNodeIndex'),
                  assetAddress: form.getFieldValue('claimAssetAddress'),
                }), 'claim_reward 已入队')}>执行 claim_reward</Button>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input placeholder="update_config.nodePriceUsdt" onChange={(e) => form.setFieldValue('nodePriceUsdt', Number(e.target.value || 0))} />
                <Input placeholder="update_config.maxPurchasePerTx" onChange={(e) => form.setFieldValue('maxPurchasePerTx', Number(e.target.value || 0))} />
                <Button block onClick={() => runAction(() => updateContractConfig({
                  nodePriceUsdt: form.getFieldValue('nodePriceUsdt'),
                  maxPurchasePerTx: form.getFieldValue('maxPurchasePerTx'),
                }), 'update_config 成功')}>执行 update_config</Button>
                <Button block onClick={() => runAction(() => claimReferral(), 'claim_referral 成功')}>执行 claim_referral</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="PEAK DApp 运营操作（operator 链上记账）" bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">给用户链上账本写可提额度（credit_user）</Text>
                <Input placeholder="用户钱包地址" onChange={(e) => form.setFieldValue('creditUserWallet', e.target.value)} />
                <Select
                  placeholder="额度桶"
                  style={{ width: '100%' }}
                  options={[
                    { value: 1, label: '1 - 空投收益提现（airdrop，20% 七份拆分）' },
                    { value: 2, label: '2 - 推广分红（promo）' },
                    { value: 3, label: '3 - T7 加权分红（t7）' },
                  ]}
                  onChange={(v) => form.setFieldValue('creditUserBucket', v)}
                />
                <Input placeholder="数量（raw，9 位精度）" onChange={(e) => form.setFieldValue('creditUserAmount', e.target.value)} />
                <Button block onClick={() => runAction(() => creditUser({
                  user: form.getFieldValue('creditUserWallet'),
                  bucket: form.getFieldValue('creditUserBucket'),
                  amount: form.getFieldValue('creditUserAmount'),
                }), 'credit_user 已入队')}>执行 credit_user</Button>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">更新链上价格源（update_price，空投/零撸卡折算依赖）</Text>
                <Input placeholder="peakPriceUsdt（1 PEAK 的 USDT 价，6 位精度 raw）" onChange={(e) => form.setFieldValue('dappPrice', e.target.value)} />
                <InputNumber min={0} style={{ width: '100%' }} placeholder="maxStaleSecs（可选，0 沿用现值）" onChange={(v) => form.setFieldValue('dappPriceStale', v)} />
                <Button block onClick={() => runAction(() => updateDappPrice({
                  peakPriceUsdt: form.getFieldValue('dappPrice'),
                  maxStaleSecs: form.getFieldValue('dappPriceStale') ?? undefined,
                }), 'update_price 已入队')}>执行 update_price</Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  注：worker 已有定时刷价任务，这里仅用于手动应急刷新
                </Text>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">补写质押仓位待领收益（credit_stake_reward）</Text>
                <Select
                  placeholder="周期（天）"
                  style={{ width: '100%' }}
                  options={[15, 30, 90, 150].map((d) => ({ value: d, label: `${d} 天` }))}
                  onChange={(v) => form.setFieldValue('csrPeriod', v)}
                />
                <Input placeholder="仓位所有者钱包地址" onChange={(e) => form.setFieldValue('csrOwner', e.target.value)} />
                <Input placeholder="positionId" onChange={(e) => form.setFieldValue('csrPositionId', e.target.value)} />
                <Input placeholder="收益数量（raw，9 位精度）" onChange={(e) => form.setFieldValue('csrAmount', e.target.value)} />
                <Button block onClick={() => runAction(() => creditStakeReward({
                  periodDays: form.getFieldValue('csrPeriod'),
                  positionOwner: form.getFieldValue('csrOwner'),
                  positionId: form.getFieldValue('csrPositionId'),
                  amount: form.getFieldValue('csrAmount'),
                }), 'credit_stake_reward 已入队')}>执行 credit_stake_reward</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title="PEAK DApp 合约配置（全部运营参数可在线修改，链上自动校验不变量）"
        bordered={false}
        style={{ borderRadius: 12, marginTop: 16 }}
        extra={<Button size="small" onClick={loadDappConfig}>刷新</Button>}
      >
        <Row gutter={16}>
          <Col span={13}>
            <Table
              rowKey="key"
              size="small"
              loading={dappCfgLoading}
              pagination={false}
              scroll={{ y: 420 }}
              dataSource={[
                { key: 'admin', label: '治理 admin（transfer_dapp_admin 修改）', value: dappConfig?.admin },
                ...DAPP_CONFIG_FIELDS.map((f) => ({ key: f.key, label: f.label, value: dappConfig?.[f.key] })),
                { key: 'paused', label: '暂停状态', value: String(dappConfig?.paused ?? '-') },
              ]}
              columns={[
                { title: '参数', dataIndex: 'label', width: 280 },
                {
                  title: '当前链上值',
                  dataIndex: 'value',
                  render: (v: any) => <Text code copyable={typeof v === 'string' && v.length > 20}>{v?.toString?.() ?? '-'}</Text>,
                },
              ]}
            />
          </Col>
          <Col span={11}>
            <Form form={form} layout="vertical">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">修改单个参数（update_dapp_config，admin 签名直接上链）</Text>
                <Form.Item name="dappCfgField" noStyle>
                  <Select
                    showSearch
                    placeholder="选择要修改的参数"
                    style={{ width: '100%' }}
                    optionFilterProp="label"
                    options={DAPP_CONFIG_FIELDS.map((f) => ({ value: f.key, label: `${f.label}（${f.key}）` }))}
                  />
                </Form.Item>
                <Form.Item name="dappCfgValue" noStyle>
                  <Input placeholder="新值（地址 或 整数 raw 值，单位见参数说明）" />
                </Form.Item>
                <Button type="primary" block onClick={submitDappConfigChange}>提交修改</Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  单位：*Bps=基点（10000=100%）；*Usdt=6位精度；PEAK 数量=9位精度。
                  比例类约束（进池+销毁=100%、7份手续费合计=总费率）由链上强制校验，非法组合会被拒绝。
                </Text>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary">移交 DApp 治理 admin（建议 Squads 多签；移交后当前 admin 失去全部治理权限）</Text>
                <Input placeholder="新 admin 地址" onChange={(e) => form.setFieldValue('dappNewAdmin', e.target.value)} />
                <Button
                  danger
                  block
                  onClick={() => {
                    const newAdmin = String(form.getFieldValue('dappNewAdmin') ?? '').trim()
                    if (!BASE58_RE.test(newAdmin)) {
                      message.warning('请输入合法的 Solana 地址')
                      return
                    }
                    runAction(() => transferDappAdmin(newAdmin), 'transfer_dapp_admin 成功')
                  }}
                >执行 transfer_dapp_admin</Button>
              </Space>
            </Form>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
