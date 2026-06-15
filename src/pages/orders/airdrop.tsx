import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, Select, Tag, Typography, DatePicker, Tooltip,
  Modal, Descriptions, Spin,
} from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { getAirdropOrders, getAirdropOrderDetail } from '@/api/airdrop'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const statusMap: Record<string, { color: string; text: string }> = {
  AIRING: { color: 'processing', text: '空投中' },
  FINISHED: { color: 'success', text: '空投结束' },
}

const shortText = (value?: string | null, head = 8, tail = 6) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export default function AirdropOrdersPage() {
  const [searchParams] = useSearchParams()
  const initialWallet = searchParams.get('wallet') || ''
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>(initialWallet ? { walletAddress: initialWallet } : {})
  const [form] = Form.useForm()

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getAirdropOrders(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialWallet) form.setFieldsValue({ walletAddress: initialWallet })
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (values.walletAddress) f.walletAddress = values.walletAddress.trim()
    if (values.status) f.status = values.status
    if (values.dateRange) {
      f.startDate = values.dateRange[0].format('YYYY-MM-DD')
      f.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const openDetail = async (record: any) => {
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res: any = await getAirdropOrderDetail(record.id)
      setDetail(res.data)
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = [
    { title: '订单ID', dataIndex: 'id', key: 'id', width: 90 },
    { title: 'GrantID', dataIndex: 'grantId', key: 'grantId', width: 100 },
    {
      title: '钱包地址',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 180,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '投资数量',
      dataIndex: 'principal',
      key: 'principal',
      width: 130,
      sorter: (a: any, b: any) => Number(a.principal) - Number(b.principal),
      render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v} PEAK</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
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
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
      ),
    },
  ]

  const recordColumns = [
    { title: '时间', dataIndex: 'bizDate', key: 'bizDate', width: 120 },
    { title: '摘要', key: 'summary', render: (_: unknown, r: any) => `第 ${r.dayNo} 天发放` },
    { title: '空投数量(PEAK)', dataIndex: 'amount', key: 'amount', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>三倍空投订单</Title>
        <Text type="secondary">查看用户三倍空投参与订单</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item name="walletAddress"><Input placeholder="钱包地址" allowClear style={{ width: 220 }} /></Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 130 }}
              options={[{ label: '空投中', value: 'AIRING' }, { label: '空投结束', value: 'FINISHED' }]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查找</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}) }}>重置</Button>
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
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="三倍空投订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
        width={820}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="订单ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text || detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完整钱包地址" span={2}>
                <Text copyable style={{ fontFamily: 'Consolas, monospace' }}>{detail.walletAddress}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="投资数量">{detail.principal} PEAK</Descriptions.Item>
              <Descriptions.Item label="投资时PEAK价格">{detail.price} USDT</Descriptions.Item>
              <Descriptions.Item label="USDT价值">{detail.usdValue} USDT</Descriptions.Item>
              <Descriptions.Item label="三倍后数量">{detail.totalCap} PEAK</Descriptions.Item>
              <Descriptions.Item label="空投比例">{detail.dailyRate}%</Descriptions.Item>
              <Descriptions.Item label="已发放数量">{detail.released} PEAK</Descriptions.Item>
              <Descriptions.Item label="剩余空投数量">{detail.remain} PEAK</Descriptions.Item>
              <Descriptions.Item label="剩余空投天数">{detail.remainDays} 天</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ margin: '20px 0 12px', fontWeight: 600 }}>空投记录</div>
            <Table
              columns={recordColumns}
              dataSource={detail.releaseLogs || []}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 280 }}
              locale={{ emptyText: '暂无空投记录' }}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
