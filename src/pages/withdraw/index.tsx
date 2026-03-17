import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Form, Input, Select, Tag, Space, App, Modal, Popconfirm, Typography, Descriptions, Tooltip,
} from 'antd'
import {
  SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, EyeOutlined, SendOutlined,
} from '@ant-design/icons'
import {
  getWithdraws, approveWithdraw, rejectWithdraw, markWithdrawRisk, batchApproveWithdraws, getWithdrawDetail, confirmWithdrawSend,
} from '@/api/withdraw'
import { sendSplTransfer, sendPeakFromVault, connectWallet, FEE_COLLECT_ADDRESS } from '@/utils/solana'

const { Title, Text } = Typography
const { TextArea } = Input

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING_REVIEW: { color: 'processing', text: '待审核' },
  APPROVED: { color: 'orange', text: '待发送' },
  PENDING_SEND: { color: 'cyan', text: '发送中' },
  SENDING: { color: 'cyan', text: '发送中' },
  REJECTED: { color: 'error', text: '已拒绝' },
  SUCCESS: { color: 'green', text: '已完成' },
  FAILED: { color: 'red', text: '失败' },
}

const statusOptions = Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))

export default function WithdrawPage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [rejectVisible, setRejectVisible] = useState(false)
  const [riskVisible, setRiskVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [currentRecord, setCurrentRecord] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [riskReason, setRiskReason] = useState('')
  const [txHash, setTxHash] = useState('')
  const [feeTxHash, setFeeTxHash] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [sendingUser, setSendingUser] = useState(false)
  const [sendingFee, setSendingFee] = useState(false)
  const [form] = Form.useForm()

  const shortText = (value?: string | null, head = 8, tail = 6) => {
    if (!value) return '-'
    if (value.length <= head + tail + 3) return value
    return `${value.slice(0, head)}...${value.slice(-tail)}`
  }

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.userId) params.userId = values.userId
      if (values.status) params.status = values.status
      if (values.asset) params.asset = values.asset
      if (values.riskFlag !== undefined && values.riskFlag !== null) params.riskFlag = values.riskFlag
      const res: any = await getWithdraws(params)
      console.log('[Withdraw] API response:', res)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } catch (err) {
      console.error('[Withdraw] loadData error:', err)
      message.error('加载提现列表失败，请检查网络或权限')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleApprove = async (id: string) => {
    try {
      const res: any = await approveWithdraw(id)
      if (res?.data?.status === 'SUCCESS') {
        message.success('已通过，PEAK 已自动出款')
      } else {
        message.success('已通过')
      }
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { message.warning('请输入拒绝原因'); return }
    try {
      await rejectWithdraw(currentId, rejectReason)
      message.success('已拒绝')
      setRejectVisible(false)
      setRejectReason('')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleRisk = async () => {
    if (!riskReason.trim()) { message.warning('请输入风险原因'); return }
    try {
      await markWithdrawRisk(currentId, riskReason)
      message.success('已标记风险')
      setRiskVisible(false)
      setRiskReason('')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleBatchApprove = async () => {
    try {
      await batchApproveWithdraws(selectedRowKeys)
      message.success(`已批量通过 ${selectedRowKeys.length} 条`)
      setSelectedRowKeys([])
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleViewDetail = async (id: string) => {
    try {
      const res: any = await getWithdrawDetail(id)
      setDetail(res.data)
      setDetailVisible(true)
    } catch { /* empty */ }
  }

  const openConfirmModal = async (record: any) => {
    setCurrentId(record.id)
    setCurrentRecord(record)
    setTxHash('')
    setFeeTxHash('')
    setConfirmVisible(true)
    try {
      await connectWallet()
    } catch (err: any) {
      message.warning(err?.message || '钱包连接失败')
    }
  }

  const handleSendToUser = async () => {
    if (!currentRecord) return
    setSendingUser(true)
    try {
      const result = await sendSplTransfer(
        currentRecord.asset,
        currentRecord.toAddress,
        currentRecord.actualAmount,
      )
      setTxHash(result.txHash)
      message.success('用户转账已发送')
    } catch (err: any) {
      message.error(err?.message || '转账失败')
    } finally {
      setSendingUser(false)
    }
  }

  const handleSendFee = async () => {
    if (!currentRecord) return
    setSendingFee(true)
    try {
      const result = await sendSplTransfer(
        currentRecord.asset,
        FEE_COLLECT_ADDRESS,
        currentRecord.feeAmount,
      )
      setFeeTxHash(result.txHash)
      message.success('手续费转账已发送')
    } catch (err: any) {
      message.error(err?.message || '手续费转账失败')
    } finally {
      setSendingFee(false)
    }
  }

  const handlePeakVaultTransfer = async () => {
    if (!currentRecord) return
    setSendingUser(true)
    try {
      const result = await sendPeakFromVault(
        currentRecord.toAddress,
        currentRecord.actualAmount,
        FEE_COLLECT_ADDRESS,
        currentRecord.feeAmount,
      )
      setTxHash(result.txHash)
      setFeeTxHash(result.txHash)
      message.success('Vault 转账成功：用户到账 + 手续费归集已完成')
    } catch (err: any) {
      message.error(err?.message || 'Vault 转账失败')
    } finally {
      setSendingUser(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!txHash.trim() || txHash.trim().length < 20) {
      message.warning('请先完成用户转账')
      return
    }
    setConfirmLoading(true)
    try {
      await confirmWithdrawSend(currentId, txHash.trim(), feeTxHash.trim() || undefined)
      message.success('提现完成')
      setConfirmVisible(false)
      setTxHash('')
      setFeeTxHash('')
      loadData(pagination.current, pagination.pageSize)
    } catch {
      /* empty */
    } finally {
      setConfirmLoading(false)
    }
  }

  const columns = [
    {
      title: '用户',
      dataIndex: 'userWallet',
      key: 'userWallet',
      width: 160,
      render: (v: string) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 6, 4)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    { title: '提现金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: '资产类型', dataIndex: 'asset', key: 'asset', width: 100 },
    { title: '手续费', dataIndex: 'feeAmount', key: 'feeAmount', width: 100 },
    { title: '到账金额', dataIndex: 'actualAmount', key: 'actualAmount', width: 120 },
    {
      title: '提现地址',
      dataIndex: 'toAddress',
      key: 'toAddress',
      width: 220,
      ellipsis: true,
      render: (v: string | null) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 8, 8)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '风险',
      dataIndex: 'riskFlag',
      key: 'riskFlag',
      width: 70,
      render: (v: boolean) => v ? <Tag color="red">风险</Tag> : null,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = statusMap[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>详情</Button>
          {record.status === 'PENDING_REVIEW' && (
            <>
              <Popconfirm title="确认通过？" onConfirm={() => handleApprove(record.id)}>
                <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#10b981' }}>通过</Button>
              </Popconfirm>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => { setCurrentId(record.id); setRejectVisible(true) }}>
                拒绝
              </Button>
              <Button type="link" size="small" icon={<WarningOutlined />} style={{ color: '#f59e0b' }} onClick={() => { setCurrentId(record.id); setRiskVisible(true) }}>
                风险
              </Button>
            </>
          )}
          {record.status === 'APPROVED' && (
            <>
              <Button type="link" size="small" icon={<SendOutlined />} style={{ color: '#3b82f6' }} onClick={() => openConfirmModal(record)}>
                确认发送
              </Button>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => { setCurrentId(record.id); setRejectVisible(true) }}>
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>提现管理</Title>
        <Text type="secondary">审核和管理用户提现申请</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="userId"><Input placeholder="用户ID" allowClear /></Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }} options={statusOptions} />
          </Form.Item>
          <Form.Item name="asset">
            <Select placeholder="资产" allowClear style={{ width: 100 }} options={[{ label: 'USDT', value: 'USDT' }, { label: 'PEAK', value: 'PEAK' }]} />
          </Form.Item>
          <Form.Item name="riskFlag">
            <Select placeholder="风险标记" allowClear style={{ width: 120 }} options={[{ label: '有风险', value: true }, { label: '无风险', value: false }]} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); loadData() }}>重置</Button></Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        {selectedRowKeys.length > 0 && (
          <Space style={{ marginBottom: 16 }}>
            <Text>已选 {selectedRowKeys.length} 条</Text>
            <Popconfirm title={`确认批量通过 ${selectedRowKeys.length} 条提现？`} onConfirm={handleBatchApprove}>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}>批量通过</Button>
            </Popconfirm>
          </Space>
        )}
        <Table
          className="compact-admin-table"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          tableLayout="fixed"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            getCheckboxProps: (record: any) => ({ disabled: record.status !== 'PENDING_REVIEW' }),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => loadData(page, pageSize),
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal title="拒绝提现" open={rejectVisible} onOk={handleReject} onCancel={() => setRejectVisible(false)} okButtonProps={{ danger: true }} okText="拒绝">
        <div style={{ marginTop: 16 }}>
          <Text>请输入拒绝原因：</Text>
          <TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="请输入拒绝原因（1-255字）" style={{ marginTop: 8 }} maxLength={255} showCount />
        </div>
      </Modal>

      <Modal title="标记风险" open={riskVisible} onOk={handleRisk} onCancel={() => setRiskVisible(false)} okText="标记">
        <div style={{ marginTop: 16 }}>
          <Text>请输入风险原因：</Text>
          <TextArea rows={3} value={riskReason} onChange={(e) => setRiskReason(e.target.value)} placeholder="请输入风险原因（1-255字）" style={{ marginTop: 8 }} maxLength={255} showCount />
        </div>
      </Modal>

      <Modal title="提现详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={640}>
        {detail && (
          <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="用户钱包">{detail.userWallet || '-'}</Descriptions.Item>
            <Descriptions.Item label="提现金额">{detail.amount}</Descriptions.Item>
            <Descriptions.Item label="资产类型">{detail.asset}</Descriptions.Item>
            <Descriptions.Item label="手续费">{detail.feeAmount}</Descriptions.Item>
            <Descriptions.Item label="到账金额">{detail.actualAmount}</Descriptions.Item>
            <Descriptions.Item label="风险标记">{detail.riskFlag ? <Tag color="red">有风险</Tag> : <Tag color="green">正常</Tag>}</Descriptions.Item>
            <Descriptions.Item label="提现地址" span={2}>{detail.toAddress}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text || detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">{new Date(detail.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
            {detail.rejectReason && <Descriptions.Item label="拒绝原因" span={2}>{detail.rejectReason}</Descriptions.Item>}
            {detail.riskReason && <Descriptions.Item label="风险原因" span={2}>{detail.riskReason}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="提现转账"
        open={confirmVisible}
        onOk={handleConfirmSend}
        onCancel={() => setConfirmVisible(false)}
        confirmLoading={confirmLoading}
        okText="确认完成"
        okButtonProps={{ disabled: !txHash || !feeTxHash }}
        width={600}
      >
        {currentRecord && currentRecord.asset === 'PEAK' ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: '#f6ffed', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ fontSize: 15 }}>从 Peak Vault 一键转账</Text>
                {txHash ? <Tag color="success">已完成</Tag> : <Tag color="processing">待转账</Tag>}
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>用户到账：</Text>
                <Text strong style={{ color: '#10b981', fontSize: 15 }}>{currentRecord.actualAmount} PEAK</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>→</Text>
                <Text code style={{ fontSize: 11, marginLeft: 4 }}>{shortText(currentRecord.toAddress, 8, 6)}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>手续费归集：</Text>
                <Text strong style={{ color: '#f59e0b', fontSize: 15 }}>{currentRecord.feeAmount} PEAK</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>→</Text>
                <Text code style={{ fontSize: 11, marginLeft: 4 }}>{shortText(FEE_COLLECT_ADDRESS, 8, 6)}</Text>
              </div>
              <div style={{ background: '#e6f7ff', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  将构造一笔交易，通过合约从 peak_vault 同时转出用户金额和手续费，Admin 钱包仅支付 gas。
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={txHash ? <CheckCircleOutlined /> : <SendOutlined />}
                loading={sendingUser}
                onClick={handlePeakVaultTransfer}
                disabled={!!txHash}
                style={{ width: '100%' }}
              >
                {txHash ? '已发送' : '从 Vault 一键转账'}
              </Button>
              {txHash && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>txHash：</Text>
                  <Text copyable style={{ fontSize: 11, wordBreak: 'break-all' }}>{txHash}</Text>
                </div>
              )}
            </div>
          </div>
        ) : currentRecord ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text strong>第一步：转账给用户</Text>
                {txHash ? <Tag color="success">已完成</Tag> : <Tag color="processing">待转账</Tag>}
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>金额：</Text>
                <Text strong style={{ color: '#10b981', fontSize: 15 }}>{currentRecord.actualAmount} {currentRecord.asset}</Text>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>收款地址：</Text>
                <br />
                <Text copyable code style={{ fontSize: 12, wordBreak: 'break-all' }}>{currentRecord.toAddress}</Text>
              </div>
              <Button
                type="primary"
                icon={txHash ? <CheckCircleOutlined /> : <SendOutlined />}
                loading={sendingUser}
                onClick={handleSendToUser}
                disabled={!!txHash}
                style={{ marginTop: 8, width: '100%' }}
              >
                {txHash ? '已发送' : `发送 ${currentRecord.actualAmount} ${currentRecord.asset} 给用户`}
              </Button>
              {txHash && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>txHash：</Text>
                  <Text copyable style={{ fontSize: 11, wordBreak: 'break-all' }}>{txHash}</Text>
                </div>
              )}
            </div>

            <div style={{ background: '#fff7e6', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text strong>第二步：手续费归集</Text>
                {feeTxHash ? <Tag color="success">已完成</Tag> : <Tag color="warning">待转账</Tag>}
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>手续费：</Text>
                <Text strong style={{ color: '#f59e0b', fontSize: 15 }}>{currentRecord.feeAmount} {currentRecord.asset}</Text>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>归集地址：</Text>
                <br />
                <Text copyable code style={{ fontSize: 12, wordBreak: 'break-all' }}>{FEE_COLLECT_ADDRESS}</Text>
              </div>
              <Button
                icon={feeTxHash ? <CheckCircleOutlined /> : <SendOutlined />}
                loading={sendingFee}
                onClick={handleSendFee}
                disabled={!txHash || !!feeTxHash}
                style={{ marginTop: 8, width: '100%', borderColor: feeTxHash ? undefined : '#f59e0b', color: (sendingFee || feeTxHash) ? undefined : '#f59e0b' }}
              >
                {feeTxHash ? '已发送' : `发送 ${currentRecord.feeAmount} ${currentRecord.asset} 手续费`}
              </Button>
              {feeTxHash && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>txHash：</Text>
                  <Text copyable style={{ fontSize: 11, wordBreak: 'break-all' }}>{feeTxHash}</Text>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
