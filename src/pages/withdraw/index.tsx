import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Form, Input, Select, Tag, Space, message, Modal, Popconfirm, Typography, Descriptions, Tooltip,
} from 'antd'
import {
  SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, EyeOutlined,
} from '@ant-design/icons'
import {
  getWithdraws, approveWithdraw, rejectWithdraw, markWithdrawRisk, batchApproveWithdraws, getWithdrawDetail,
} from '@/api/withdraw'

const { Title, Text } = Typography
const { TextArea } = Input

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING_REVIEW: { color: 'processing', text: '待审核' },
  PENDING_SEND: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已拒绝' },
  SENT: { color: 'cyan', text: '已发送' },
  SUCCESS: { color: 'green', text: '已完成' },
  FAILED: { color: 'red', text: '失败' },
}

const statusOptions = Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))

export default function WithdrawPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [rejectVisible, setRejectVisible] = useState(false)
  const [riskVisible, setRiskVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentId, setCurrentId] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [riskReason, setRiskReason] = useState('')
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
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
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
    </div>
  )
}
