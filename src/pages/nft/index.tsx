import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Form, Input, Select, Tag, Typography, Tooltip,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { getNftRecords } from '@/api/nft'

const { Title, Text } = Typography

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待铸造' },
  MINTING: { color: 'cyan', text: '铸造中' },
  SUCCESS: { color: 'success', text: '已铸造' },
  FAILED: { color: 'error', text: '铸造失败' },
}

export default function NftPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.userId) params.userId = values.userId
      if (values.status !== undefined && values.status !== null) params.status = values.status
      const res: any = await getNftRecords(params)
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

  const columns = [
    {
      title: '用户',
      dataIndex: 'userWallet',
      key: 'userWallet',
      width: 160,
      render: (v: string) => v ? `${v.slice(0, 6)}...${v.slice(-4)}` : '-',
    },
    {
      title: 'Token ID',
      dataIndex: 'tokenId',
      key: 'tokenId',
      width: 220,
      ellipsis: true,
      render: (v: string | null) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 12, 8)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      width: 230,
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
      title: '关联订单',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = statusMap[v] || { color: 'default', text: '未知' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '铸造时间',
      dataIndex: 'mintedAt',
      key: 'mintedAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>NFT 管理</Title>
        <Text type="secondary">管理 NFT 铸造记录</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="userId"><Input placeholder="用户ID" allowClear /></Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }} options={Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); loadData() }}>重置</Button></Form.Item>
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
    </div>
  )
}
