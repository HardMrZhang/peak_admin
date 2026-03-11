import { useEffect, useState } from 'react'
import { Card, Table, Form, Input, Select, Button, Tag, Typography, DatePicker, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { getAuditLogs } from '@/api/audit'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const moduleOptions = [
  'auth', 'rbac', 'node_config', 'orders', 'settlement',
  'referral', 'withdraw', 'nft', 'reports', 'content',
].map((m) => ({ label: m, value: m }))

const resultOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
]

export default function AuditPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.adminUserId) params.adminUserId = values.adminUserId
      if (values.module) params.module = values.module
      if (values.result) params.result = values.result
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD')
        params.endDate = values.dateRange[1].format('YYYY-MM-DD')
      }
      const res: any = await getAuditLogs(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const columns = [
    {
      title: '操作人',
      dataIndex: 'adminUsername',
      key: 'adminUsername',
      width: 120,
      render: (v: string, record: any) => v || record.adminDisplayName || '-',
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    { title: '操作', dataIndex: 'action', key: 'action', width: 150 },
    { title: '目标ID', dataIndex: 'targetId', key: 'targetId', width: 160, ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'SUCCESS' ? 'success' : v === 'FAILED' ? 'error' : 'default'}>
          {v === 'SUCCESS' ? '成功' : v === 'FAILED' ? '失败' : v || '-'}
        </Tag>
      ),
    },
    {
      title: '详情',
      dataIndex: 'requestPayload',
      key: 'requestPayload',
      ellipsis: true,
      render: (v: any) => {
        if (!v) return '-'
        if (typeof v === 'string') return v
        return JSON.stringify(v).slice(0, 100)
      },
    },
    { title: 'IP', dataIndex: 'requestIp', key: 'requestIp', width: 130 },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>审计日志</Title>
        <Text type="secondary">查看管理员操作记录</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="adminUserId"><Input placeholder="管理员ID" allowClear /></Form.Item>
          <Form.Item name="module">
            <Select placeholder="模块" allowClear style={{ width: 140 }} options={moduleOptions} />
          </Form.Item>
          <Form.Item name="result">
            <Select placeholder="结果" allowClear style={{ width: 100 }} options={resultOptions} />
          </Form.Item>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); loadData() }}>重置</Button></Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
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
