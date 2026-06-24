import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, Typography, Tooltip, Tag, Space,
} from 'antd'
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { getNodeHolders } from '@/api/orders'

const { Title, Text } = Typography

const shortText = (value?: string | null, head = 6, tail = 4) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

const walletCell = (v: string) => (
  <Tooltip title={v}>
    <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
  </Tooltip>
)

interface Holder {
  userId: string
  walletAddress: string | null
  inviteCode: string | null
  email: string | null
  nodeCount: number
  totalAmountUsdt: string
  orderCount: number
  lastPaidAt: string | null
}

export default function ShareholderNodesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Holder[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10, kw = keyword) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, pageSize }
      if (kw) params.keyword = kw
      const res: any = await getNodeHolders(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    const kw = (form.getFieldValue('keyword') || '').trim()
    setKeyword(kw)
    loadData(1, pagination.pageSize, kw)
  }

  const handleReset = () => {
    form.resetFields()
    setKeyword('')
    loadData(1, pagination.pageSize, '')
  }

  const columns = [
    { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 100 },
    {
      title: '钱包地址',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 160,
      render: (v: string) => (v ? walletCell(v) : '-'),
    },
    {
      title: '邀请码',
      dataIndex: 'inviteCode',
      key: 'inviteCode',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '持有节点数',
      dataIndex: 'nodeCount',
      key: 'nodeCount',
      width: 120,
      sorter: (a: Holder, b: Holder) => a.nodeCount - b.nodeCount,
      render: (v: number) => <Tag color="blue" style={{ fontSize: 13 }}>{v}</Tag>,
    },
    {
      title: '累计投入(USDT)',
      dataIndex: 'totalAmountUsdt',
      key: 'totalAmountUsdt',
      width: 150,
      render: (v: string) => <Text strong>${v}</Text>,
    },
    {
      title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 90,
    },
    {
      title: '最近购买时间',
      dataIndex: 'lastPaidAt',
      key: 'lastPaidAt',
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: Holder) => (
        <Button
          type="link"
          size="small"
          icon={<UnorderedListOutlined />}
          disabled={!record.walletAddress}
          onClick={() => navigate(`/orders?wallet=${record.walletAddress}`)}
        >
          购买记录
        </Button>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>股东节点列表</Title>
        <Text type="secondary">按持有人聚合的股东节点持有情况（已支付订单）</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input
              placeholder="钱包地址 / 邀请码 / 用户ID / 邮箱"
              allowClear
              style={{ width: 280 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查找</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          className="compact-admin-table"
          columns={columns}
          dataSource={data}
          rowKey="userId"
          loading={loading}
          tableLayout="fixed"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 位持有人`,
            onChange: (page, pageSize) => loadData(page, pageSize),
          }}
          scroll={{ x: 1210 }}
        />
      </Card>
    </div>
  )
}
