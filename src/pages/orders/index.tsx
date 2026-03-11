import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, Select, Tag, Space, Typography, DatePicker, Tooltip,
} from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { getOrders } from '@/api/orders'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待支付' },
  PAID: { color: 'processing', text: '已支付' },
  FAILED: { color: 'error', text: '失败' },
  CANCELLED: { color: 'warning', text: '已取消' },
  EXPIRED: { color: 'volcano', text: '已过期' },
}

const statusOptions = Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))

export default function OrdersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getOrders(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const shortText = (value?: string | null, head = 8, tail = 6) => {
    if (!value) return '-'
    if (value.length <= head + tail + 3) return value
    return `${value.slice(0, head)}...${value.slice(-tail)}`
  }

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (values.orderNo) f.orderNo = values.orderNo
    if (values.status) f.status = values.status
    if (values.userId) f.userId = values.userId
    if (values.dateRange) {
      f.startDate = values.dateRange[0].format('YYYY-MM-DD')
      f.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 220,
      ellipsis: true,
      render: (v: string | null) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 10, 8)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '用户钱包',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 180,
      render: (v: string) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 6, 4)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    { title: '支付金额', dataIndex: 'totalAmountUsdt', key: 'totalAmountUsdt', width: 120, render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>${v}</Text> },
    { title: '节点数', dataIndex: 'qty', key: 'qty', width: 80 },
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
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/orders/${record.id}`)}>
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>订单管理</Title>
        <Text type="secondary">查看和管理节点购买订单</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="orderNo"><Input placeholder="订单号" allowClear /></Form.Item>
          <Form.Item name="userId"><Input placeholder="用户ID" allowClear /></Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }} options={statusOptions} />
          </Form.Item>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); setFilters({}); loadData() }}>重置</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          className="compact-admin-table"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          tableLayout="fixed"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => loadData(page, pageSize),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}
