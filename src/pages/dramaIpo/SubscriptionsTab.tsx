import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getDramaSubscriptions, type DramaSubscriptionRow } from '@/api/dramaIpo'

const { Text } = Typography

const short = (v?: string | null, head = 6, tail = 4) => {
  if (!v) return '-'
  return v.length <= head + tail + 3 ? v : `${v.slice(0, head)}...${v.slice(-tail)}`
}

export default function SubscriptionsTab({ serialNo }: { serialNo?: string }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DramaSubscriptionRow[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const loadData = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const v = form.getFieldsValue()
      const res: any = await getDramaSubscriptions({
        page,
        pageSize,
        serialNo: v.serialNo?.trim() || undefined,
        wallet: v.wallet?.trim() || undefined,
        subNo: v.subNo?.trim() || undefined,
      })
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (serialNo) form.setFieldsValue({ serialNo })
    loadData(1)
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [serialNo])

  const columns = [
    { title: '认购单号', dataIndex: 'subNo', width: 160 },
    {
      title: '剧目',
      width: 180,
      render: (_: unknown, r: DramaSubscriptionRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.projectName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.serialNo}</Text>
        </Space>
      ),
    },
    {
      title: '认购地址',
      dataIndex: 'walletAddress',
      width: 130,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ fontFamily: 'Consolas, monospace' }}>{short(v)}</Text>
        </Tooltip>
      ),
    },
    { title: '份数', dataIndex: 'shares', width: 70 },
    {
      title: '认购额 (USDT)',
      width: 160,
      render: (_: unknown, r: DramaSubscriptionRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{Number(r.amountUsdt).toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            67% {Number(r.primaryAmountUsdt).toLocaleString()} / 33% {Number(r.secondaryAmountUsdt).toLocaleString()}
          </Text>
        </Space>
      ),
    },
    {
      title: '空投 (PEAK)',
      width: 170,
      render: (_: unknown, r: DramaSubscriptionRow) => (
        <Space direction="vertical" size={0}>
          <Text>{Number(r.airdropReleased).toLocaleString()} / {Number(r.airdropTotal).toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已发 {r.releasedDays}/300 天 · 锁价 {r.peakPriceUsdt}
          </Text>
        </Space>
      ),
    },
    {
      title: '已返本金',
      dataIndex: 'principalPaidUsdt',
      width: 100,
      render: (v: string) => `${Number(v).toLocaleString()} U`,
    },
    {
      title: '已分红',
      dataIndex: 'dividendPaidUsdt',
      width: 100,
      render: (v: string) => `${Number(v).toLocaleString()} U`,
    },
    {
      title: '状态',
      width: 90,
      render: (_: unknown, r: DramaSubscriptionRow) => (
        r.isOut ? <Tag color="warning">已出局</Tag> : <Tag color="success">进行中</Tag>
      ),
    },
    {
      title: '认购时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '交易',
      dataIndex: 'txHash',
      width: 110,
      render: (v: string | null) => (v
        ? <Tooltip title={v}><Text style={{ fontFamily: 'Consolas, monospace' }}>{short(v)}</Text></Tooltip>
        : '-'),
    },
  ]

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="serialNo">
            <Input placeholder="剧目编号" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="wallet">
            <Input placeholder="认购钱包地址" allowClear style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="subNo">
            <Input placeholder="认购单号" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => loadData(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); loadData(1) }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1500 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => loadData(page, pageSize),
        }}
      />
    </>
  )
}
