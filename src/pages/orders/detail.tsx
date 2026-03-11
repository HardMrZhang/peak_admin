import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Spin, Typography, Table } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getOrderDetail } from '@/api/orders'

const { Title, Text } = Typography

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待支付' },
  PAID: { color: 'processing', text: '已支付' },
  FAILED: { color: 'error', text: '失败' },
  CANCELLED: { color: 'warning', text: '已取消' },
  EXPIRED: { color: 'volcano', text: '已过期' },
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (id) {
      getOrderDetail(id)
        .then((res: any) => setOrder(res.data))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="page-container">
        <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <Text type="secondary">订单不存在</Text>
          <br />
          <Button type="link" onClick={() => navigate('/orders')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  const s = statusMap[order.status] || { color: 'default', text: order.status }

  const txColumns = [
    { title: '交易哈希', dataIndex: 'txHash', key: 'txHash', width: 300, ellipsis: true },
    { title: '链', dataIndex: 'chainName', key: 'chainName', width: 100 },
    {
      title: '状态',
      dataIndex: 'receiptStatus',
      key: 'receiptStatus',
      width: 100,
      render: (v: string) => {
        const m: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'processing', text: '待确认' },
          CONFIRMED: { color: 'success', text: '已确认' },
          FAILED: { color: 'error', text: '失败' },
        }
        const ss = m[v] || { color: 'default', text: v }
        return <Tag color={ss.color}>{ss.text}</Tag>
      },
    },
    { title: '区块号', dataIndex: 'blockNumber', key: 'blockNumber', width: 120 },
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
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>订单详情</Title>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Descriptions title="基本信息" column={3} bordered size="small">
          <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
            <Descriptions.Item label="用户钱包">{order.walletAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={s.color}>{s.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="支付金额">${order.totalAmountUsdt}</Descriptions.Item>
          <Descriptions.Item label="节点数量">{order.qty}</Descriptions.Item>
          <Descriptions.Item label="支付币种">{order.payAsset || 'USDT'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(order.createdAt).toLocaleString('zh-CN')}</Descriptions.Item>
          <Descriptions.Item label="过期时间">{order.expiredAt ? new Date(order.expiredAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          <Descriptions.Item label="支付时间">{order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {order.chainTxs?.length > 0 && (
        <Card bordered={false} title="链上交易" style={{ borderRadius: 12 }}>
          <Table
            columns={txColumns}
            dataSource={order.chainTxs}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
          />
        </Card>
      )}
    </div>
  )
}
