import { useEffect, useState } from 'react'
import {
  Card, Table, Tabs, Button, Form, Input, Tag, Typography, Select, Tooltip,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { getReferralRelationships, getReferralRewards } from '@/api/referral'

const { Title, Text } = Typography

export default function ReferralPage() {
  const [tab, setTab] = useState('relationships')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const loadRelationships = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.userId) params.userId = values.userId
      const res: any = await getReferralRelationships(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  const loadRewards = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.toUserId) params.toUserId = values.toUserId
      if (values.fromUserId) params.fromUserId = values.fromUserId
      if (values.status) params.status = values.status
      const res: any = await getReferralRewards(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  const loadData = (page = 1, pageSize = 10) => {
    if (tab === 'relationships') loadRelationships(page, pageSize)
    else loadRewards(page, pageSize)
  }

  useEffect(() => { loadData() }, [tab])

  const shortText = (value?: string | null, head = 8, tail = 6) => {
    if (!value) return '-'
    if (value.length <= head + tail + 3) return value
    return `${value.slice(0, head)}...${value.slice(-tail)}`
  }

  const relColumns = [
    {
      title: '用户',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 160,
      render: (v: string) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 6, 4)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '推荐人',
      dataIndex: ['referrer', 'inviteCode'],
      key: 'referrer',
      width: 160,
      render: (v: string) => v || '-',
    },
    { title: '直推人数', dataIndex: 'directReferralCount', key: 'directReferralCount', width: 100 },
    {
      title: '绑定时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ]

  const rewardColumns = [
    {
      title: '推荐人',
      dataIndex: 'fromUserWallet',
      key: 'fromUserWallet',
      width: 160,
      render: (v: string) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 6, 4)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '被推荐人',
      dataIndex: 'toUserWallet',
      key: 'toUserWallet',
      width: 160,
      render: (v: string) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 6, 4)}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    { title: '奖励金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '奖励编号',
      dataIndex: 'rewardNo',
      key: 'rewardNo',
      width: 170,
      ellipsis: true,
      render: (v: string | null) => (
        v ? (
          <Tooltip title={v}>
            <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 8, 6)}</Text>
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
        const map: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'processing', text: '待发放' },
          CONFIRMED: { color: 'success', text: '已发放' },
          REVERSED: { color: 'error', text: '已冲正' },
        }
        const s = map[v] || { color: 'default', text: '未知' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '奖励层级',
      dataIndex: 'rewardLevel',
      key: 'rewardLevel',
      width: 100,
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>推荐管理</Title>
        <Text type="secondary">管理推荐关系和推荐奖励</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          {tab === 'relationships' ? (
            <Form.Item name="userId"><Input placeholder="用户ID" allowClear /></Form.Item>
          ) : (
            <>
              <Form.Item name="toUserId"><Input placeholder="推荐人用户ID" allowClear /></Form.Item>
              <Form.Item name="fromUserId"><Input placeholder="被推荐用户ID" allowClear /></Form.Item>
              <Form.Item name="status">
                <Select
                  placeholder="状态"
                  allowClear
                  style={{ width: 180 }}
                  options={[
                    { label: '待发放', value: 'PENDING' },
                    { label: '已发放', value: 'CONFIRMED' },
                    { label: '已冲正', value: 'REVERSED' },
                  ]}
                />
              </Form.Item>
            </>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); loadData() }}>重置</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs activeKey={tab} onChange={(k) => { setTab(k); setData([]); setPagination({ current: 1, pageSize: 10, total: 0 }) }} items={[
          { key: 'relationships', label: '推荐关系' },
          { key: 'rewards', label: '推荐奖励' },
        ]} />
        <Table
          className="compact-admin-table"
          columns={tab === 'relationships' ? relColumns : rewardColumns}
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
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}
