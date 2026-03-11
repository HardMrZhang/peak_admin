import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Row, Space, Table, Typography, message } from 'antd'
import {
  adminTransferNode,
  claimReferral,
  claimReward,
  getContractCoverage,
  getContractInventory,
  revokeGrant,
  settleDaily,
  transferContractAdmin,
  updateContractConfig,
  updateEmission,
} from '@/api/contractCore'

const { Title, Text } = Typography

export default function ContractCorePage() {
  const [coverage, setCoverage] = useState<any[]>([])
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

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
  }

  useEffect(() => {
    loadData()
  }, [])

  const runAction = async (fn: () => Promise<any>, okMessage: string) => {
    await fn()
    message.success(okMessage)
    loadData()
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
    </div>
  )
}
