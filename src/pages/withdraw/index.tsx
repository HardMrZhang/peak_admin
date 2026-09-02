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
import { sendSplTransfer, connectWallet, getTxOnchainStatus, FEE_COLLECT_ADDRESS } from '@/utils/solana'
import type { TxStatus } from '@/utils/solana'
import { assetLabel } from '@/utils/asset'

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

/** 金额统一两位小数：展示与实际发币必须同一个值，否则后端链上校验会判定金额不符。 */
const fmtAmount = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

const normalizeAmounts = (r: Record<string, unknown> | null | undefined) => (r ? {
  ...r,
  amount: fmtAmount(r.amount),
  feeAmount: fmtAmount(r.feeAmount),
  actualAmount: fmtAmount(r.actualAmount),
} : r)

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
  const [txStatus, setTxStatus] = useState<TxStatus | ''>('')
  const [feeStatus, setFeeStatus] = useState<TxStatus | ''>('')
  const [checkingTx, setCheckingTx] = useState(false)
  const [checkingFee, setCheckingFee] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [sendingUser, setSendingUser] = useState(false)
  const [sendingFee, setSendingFee] = useState(false)
  const [connectedAddr, setConnectedAddr] = useState('')
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
      setData((res.data?.list || []).map(normalizeAmounts))
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
      await approveWithdraw(id)
      message.success('已通过')
      loadData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '审批失败')
    }
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
      setDetail(normalizeAmounts(res.data))
      setDetailVisible(true)
    } catch { /* empty */ }
  }

  const openConfirmModal = async (record: any) => {
    setCurrentId(record.id)
    setCurrentRecord(record)
    setTxHash('')
    setFeeTxHash('')
    setTxStatus('')
    setFeeStatus('')
    setConfirmVisible(true)
    try {
      const addr = await connectWallet()
      setConnectedAddr(addr)
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
      if (result.status === 'failed') {
        // 链上确认失败 = 未扣款，允许重新发送
        setTxHash('')
        setTxStatus('')
        message.error('该笔交易上链失败（未扣款），可重新发送')
      } else {
        setTxHash(result.txHash)
        setTxStatus(result.status)
        if (result.status === 'confirmed') {
          message.success('用户转账已确认上链')
        } else {
          message.warning('交易已广播但尚未确认。请勿重复发送，点“查询链上状态”核实后再确认完成')
        }
      }
    } catch (err: any) {
      // 广播前失败（未发出），可安全重试
      message.error(err?.message || '转账未发出，可重试')
    } finally {
      setSendingUser(false)
    }
  }

  const handleSendFee = async () => {
    if (!currentRecord) return
    if (Number(currentRecord.feeAmount) <= 0) {
      message.info('该提现手续费为 0，无需手续费归集')
      return
    }
    setSendingFee(true)
    try {
      const result = await sendSplTransfer(
        currentRecord.asset,
        FEE_COLLECT_ADDRESS,
        currentRecord.feeAmount,
      )
      if (result.status === 'failed') {
        setFeeTxHash('')
        setFeeStatus('')
        message.error('手续费交易上链失败（未扣款），可重新发送')
      } else {
        setFeeTxHash(result.txHash)
        setFeeStatus(result.status)
        if (result.status === 'confirmed') {
          message.success('手续费转账已确认上链')
        } else {
          message.warning('手续费交易已广播但尚未确认，请勿重复发送')
        }
      }
    } catch (err: any) {
      message.error(err?.message || '手续费转账未发出，可重试')
    } finally {
      setSendingFee(false)
    }
  }

  const handleCheckStatus = async (which: 'user' | 'fee') => {
    const sig = (which === 'user' ? txHash : feeTxHash).trim()
    if (!sig) return
    if (which === 'user') setCheckingTx(true); else setCheckingFee(true)
    try {
      const st = await getTxOnchainStatus(sig)
      if (which === 'user') setTxStatus(st); else setFeeStatus(st)
      if (st === 'confirmed') message.success('链上已确认')
      else if (st === 'failed') {
        message.error('链上确认失败（未扣款），可重新发送')
        if (which === 'user') { setTxHash(''); setTxStatus('') } else { setFeeTxHash(''); setFeeStatus('') }
      } else message.info('尚未确认，请稍后再查，切勿重复发送')
    } catch {
      message.error('查询失败，请重试')
    } finally {
      if (which === 'user') setCheckingTx(false); else setCheckingFee(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!txHash.trim() || txHash.trim().length < 20) {
      message.warning('请先完成用户转账')
      return
    }
    if (txStatus === 'pending' || feeStatus === 'pending') {
      message.warning('有交易尚未确认，请先“查询链上状态”核实后再确认完成')
      return
    }
    setConfirmLoading(true)
    try {
      await confirmWithdrawSend(currentId, txHash.trim(), feeTxHash.trim() || undefined)
      message.success('提现完成')
      setConfirmVisible(false)
      setTxHash('')
      setFeeTxHash('')
      setTxStatus('')
      setFeeStatus('')
      loadData(pagination.current, pagination.pageSize)
    } catch (err: any) {
      // 后端链上校验未通过等：提示但不清空，便于核实
      message.error(err?.response?.data?.message || err?.message || '确认失败')
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
    { title: '资产类型', dataIndex: 'asset', key: 'asset', width: 100, render: (v: string) => assetLabel(v) },
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
            <Select placeholder="资产" allowClear style={{ width: 100 }} options={[{ label: 'USDT', value: 'USDT' }, { label: 'PEAK', value: 'PEAK' }, { label: 'Aipk', value: 'AIPK' }]} />
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
            <Descriptions.Item label="资产类型">{assetLabel(detail.asset)}</Descriptions.Item>
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
        okButtonProps={{
          disabled: !txHash
            || txStatus === 'pending'
            || (Number(currentRecord?.feeAmount || 0) > 0 && (!feeTxHash || feeStatus === 'pending')),
        }}
        width={600}
      >
        {currentRecord ? (
          <div style={{ marginTop: 12 }}>
            {connectedAddr && (
              <div style={{ background: '#e6f7e6', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13 }}>
                <Text type="secondary">当前连接钱包：</Text>
                <Text copyable strong style={{ wordBreak: 'break-all' }}>{connectedAddr}</Text>
              </div>
            )}
            <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text strong>第一步：转账给用户</Text>
                {(() => {
                  if (txStatus === 'confirmed') return <Tag color="success">已确认上链</Tag>
                  if (txStatus === 'pending') return <Tag color="warning">已广播·待确认</Tag>
                  if (txHash) return <Tag color="processing">已填入·待核实</Tag>
                  return <Tag color="default">待转账</Tag>
                })()}
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>金额：</Text>
                <Text strong style={{ color: '#10b981', fontSize: 15 }}>{currentRecord.actualAmount} {assetLabel(currentRecord.asset)}</Text>
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
                {txHash ? '已发送' : `发送 ${currentRecord.actualAmount} ${assetLabel(currentRecord.asset)} 给用户`}
              </Button>
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>txHash（已转账可手动填入）：</Text>
                <Input
                  size="small"
                  value={txHash}
                  onChange={(e) => { setTxHash(e.target.value.trim()); setTxStatus('') }}
                  placeholder="粘贴链上交易哈希"
                  style={{ fontSize: 11, marginTop: 2 }}
                />
                {txHash && txStatus !== 'confirmed' && (
                  <Button size="small" type="link" loading={checkingTx} onClick={() => handleCheckStatus('user')} style={{ paddingLeft: 0, marginTop: 2 }}>
                    查询链上状态
                  </Button>
                )}
              </div>
            </div>

            {Number(currentRecord.feeAmount) > 0 ? (
              <div style={{ background: '#fff7e6', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text strong>第二步：手续费归集</Text>
                  {(() => {
                    if (feeStatus === 'confirmed') return <Tag color="success">已确认上链</Tag>
                    if (feeStatus === 'pending') return <Tag color="warning">已广播·待确认</Tag>
                    if (feeTxHash) return <Tag color="processing">已填入·待核实</Tag>
                    return <Tag color="default">待转账</Tag>
                  })()}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>手续费：</Text>
                  <Text strong style={{ color: '#f59e0b', fontSize: 15 }}>{currentRecord.feeAmount} {assetLabel(currentRecord.asset)}</Text>
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
                  {feeTxHash ? '已发送' : `发送 ${currentRecord.feeAmount} ${assetLabel(currentRecord.asset)} 手续费`}
                </Button>
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>txHash（已转账可手动填入）：</Text>
                  <Input
                    size="small"
                    value={feeTxHash}
                    onChange={(e) => { setFeeTxHash(e.target.value.trim()); setFeeStatus('') }}
                    placeholder="粘贴链上交易哈希"
                    style={{ fontSize: 11, marginTop: 2 }}
                  />
                  {feeTxHash && feeStatus !== 'confirmed' && (
                    <Button size="small" type="link" loading={checkingFee} onClick={() => handleCheckStatus('fee')} style={{ paddingLeft: 0, marginTop: 2 }}>
                      查询链上状态
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: '#f6ffed', borderRadius: 8, padding: '12px 16px' }}>
                <Text type="secondary">第二步：手续费归集（当前手续费为 0，已自动跳过）</Text>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
