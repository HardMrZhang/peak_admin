import { useEffect, useState } from 'react'
import { Card, Table, Form, DatePicker, Select, Button, Typography, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { getSnapshots } from '@/api/settlement'

const { Title, Text } = Typography
const calcStatusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待计算' },
  DONE: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
}

const calcStatusOptions = Object.entries(calcStatusMap).map(([k, v]) => ({ label: v.text, value: k }))

export default function SnapshotsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.bizDate) params.bizDate = values.bizDate.format('YYYY-MM-DD')
      if (values.calcStatus) params.calcStatus = values.calcStatus
      const res: any = await getSnapshots(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const columns = [
    { title: '业务日期', dataIndex: 'bizDate', key: 'bizDate', width: 120 },
    { title: '售出节点(EOD)', dataIndex: 'soldNodesEod', key: 'soldNodesEod', width: 120 },
    { title: '日池(PEAK)', dataIndex: 'dailyPoolPeak', key: 'dailyPoolPeak', width: 140 },
    { title: '每节点奖励', dataIndex: 'perNodePeak', key: 'perNodePeak', width: 140, render: (v: string) => <Text strong>{v}</Text> },
    { title: '规则版本', dataIndex: 'ruleVersion', key: 'ruleVersion', width: 120 },
    {
      title: '计算状态',
      dataIndex: 'calcStatus',
      key: 'calcStatus',
      width: 100,
      render: (v: string) => {
        const s = calcStatusMap[v] || { color: 'default', text: v }
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
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>奖励快照</Title>
        <Text type="secondary">每日节点奖励计算快照</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="bizDate"><DatePicker placeholder="业务日期" /></Form.Item>
          <Form.Item name="calcStatus">
            <Select placeholder="计算状态" allowClear style={{ width: 120 }} options={calcStatusOptions} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); loadData() }}>重置</Button>
          </Form.Item>
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
