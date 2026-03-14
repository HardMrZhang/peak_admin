import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, InputNumber, Tag, Space, message, Popconfirm, Typography, Descriptions, Select, DatePicker,
} from 'antd'
import { PlusOutlined, EditOutlined, CheckCircleOutlined, SaveOutlined } from '@ant-design/icons'
import type { NodeConfigStatus } from '@/api/nodeConfig'
import {
  getNodeConfigs,
  createNodeConfig,
  updateNodeConfig,
  updateNodeConfigStatus,
  getActiveNodeConfig,
  getReferralSettings,
  updateReferralSettings,
} from '@/api/nodeConfig'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const statusMap: Record<string, { color: string; text: string }> = {
  NOT_STARTED: { color: 'default', text: '未开始' },
  ON_SALE: { color: 'success', text: '销售中' },
  PAUSED: { color: 'warning', text: '已暂停' },
  ENDED: { color: 'error', text: '已结束' },
}

const statusOptions = Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))

export default function NodeConfigPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [activeConfig, setActiveConfig] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [current, setCurrent] = useState<any>(null)
  const [savingReferral, setSavingReferral] = useState(false)
  const [form] = Form.useForm()
  const [referralForm] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const [listRes, activeRes, referralRes]: any[] = await Promise.allSettled([
        getNodeConfigs(),
        getActiveNodeConfig(),
        getReferralSettings(),
      ])
      if (listRes.status === 'fulfilled') {
        setData(listRes.value.data?.list || listRes.value.data || [])
      }
      if (activeRes.status === 'fulfilled') {
        setActiveConfig(activeRes.value.data)
      }
      if (referralRes.status === 'fulfilled') {
        referralForm.setFieldsValue({
          rewardPerNodeUsdt: referralRes.value.data?.rewardPerNodeUsdt ?? 50,
          pointPerNode: referralRes.value.data?.pointPerNode ?? 100,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleReferralSave = async () => {
    const values = await referralForm.validateFields()
    setSavingReferral(true)
    try {
      await updateReferralSettings({
        rewardPerNodeUsdt: values.rewardPerNodeUsdt,
        pointPerNode: values.pointPerNode,
      })
      message.success('推广参数已更新')
      loadData()
    } finally {
      setSavingReferral(false)
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload: Record<string, unknown> = {
      totalNodes: values.totalNodes,
      nodePriceUsdt: values.nodePriceUsdt,
      status: values.status,
    }
    if (values.saleStartAt) payload.saleStartAt = values.saleStartAt.toISOString()
    else payload.saleStartAt = null
    if (values.saleEndAt) payload.saleEndAt = values.saleEndAt.toISOString()
    else payload.saleEndAt = null

    try {
      if (editMode && current) {
        await updateNodeConfig(current.id, payload)
        message.success('更新成功')
      } else {
        await createNodeConfig(payload as any)
        message.success('创建成功')
      }
      form.resetFields()
      setVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const handleStatusChange = async (id: string, status: NodeConfigStatus) => {
    try {
      await updateNodeConfigStatus(id, status)
      message.success('状态已更新')
      loadData()
    } catch { /* empty */ }
  }

  const openEdit = (record: any) => {
    setCurrent(record)
    setEditMode(true)
    form.setFieldsValue({
      totalNodes: record.totalNodes,
      nodePriceUsdt: record.nodePriceUsdt,
      status: record.status,
      saleStartAt: record.saleStartAt ? dayjs(record.saleStartAt) : null,
      saleEndAt: record.saleEndAt ? dayjs(record.saleEndAt) : null,
    })
    setVisible(true)
  }

  const columns = [
    { title: '总节点数', dataIndex: 'totalNodes', key: 'totalNodes', width: 100 },
    { title: '节点单价(USDT)', dataIndex: 'nodePriceUsdt', key: 'nodePriceUsdt', width: 140, render: (v: number) => `$${v}` },
    { title: '已售', dataIndex: 'soldNodes', key: 'soldNodes', width: 80, render: (v: number) => v ?? '-' },
    {
      title: '销售开始',
      dataIndex: 'saleStartAt',
      key: 'saleStartAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '销售结束',
      dataIndex: 'saleEndAt',
      key: 'saleEndAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
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
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          {record.status !== 'ON_SALE' && (
            <Popconfirm title="确认启动销售？" onConfirm={() => handleStatusChange(record.id, 'ON_SALE')}>
              <Button type="link" size="small">启动销售</Button>
            </Popconfirm>
          )}
          {record.status === 'ON_SALE' && (
            <Popconfirm title="确认暂停？" onConfirm={() => handleStatusChange(record.id, 'PAUSED')}>
              <Button type="link" size="small" danger>暂停</Button>
            </Popconfirm>
          )}
          {(record.status === 'PAUSED' || record.status === 'ON_SALE') && (
            <Popconfirm title="确认结束销售？" onConfirm={() => handleStatusChange(record.id, 'ENDED')}>
              <Button type="link" size="small" danger>结束</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>节点配置</Title>
            <Text type="secondary">管理节点销售配置</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditMode(false); setCurrent(null); form.resetFields(); setVisible(true) }}>
            新增配置
          </Button>
        </Space>
      </div>

      {activeConfig && (
        <Card
          bordered={false}
          style={{ borderRadius: 12, marginBottom: 16 }}
          title={<Space><CheckCircleOutlined style={{ color: '#10b981' }} /><span>当前生效配置</span></Space>}
        >
          <Descriptions column={4} size="small">
            <Descriptions.Item label="总节点数">{activeConfig.totalNodes}</Descriptions.Item>
            <Descriptions.Item label="节点单价">${activeConfig.nodePriceUsdt}</Descriptions.Item>
            <Descriptions.Item label="已售">{activeConfig.soldNodes ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[activeConfig.status]?.color}>{statusMap[activeConfig.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="销售开始">{activeConfig.saleStartAt ? new Date(activeConfig.saleStartAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
            <Descriptions.Item label="销售结束">{activeConfig.saleEndAt ? new Date(activeConfig.saleEndAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 16 }}
        title="推广参数配置"
        extra={
          <Button type="primary" icon={<SaveOutlined />} loading={savingReferral} onClick={handleReferralSave}>
            保存推广参数
          </Button>
        }
      >
        <Form form={referralForm} layout="inline">
          <Form.Item
            name="rewardPerNodeUsdt"
            label="每节点奖励(USDT)"
            rules={[{ required: true, message: '请输入奖励金额' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item
            name="pointPerNode"
            label="每节点积分"
            rules={[{ required: true, message: '请输入积分数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title={editMode ? '编辑配置' : '新增配置'}
        open={visible}
        onOk={handleSubmit}
        onCancel={() => { form.resetFields(); setVisible(false) }}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="totalNodes" label="总节点数" rules={[{ required: true, message: '请输入总节点数' }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} placeholder="10000" />
            </Form.Item>
            <Form.Item name="nodePriceUsdt" label="节点单价(USDT)" rules={[{ required: true, message: '请输入节点单价' }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} placeholder="500" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="saleStartAt" label="销售开始时间" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择开始时间" />
            </Form.Item>
            <Form.Item name="saleEndAt" label="销售结束时间" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择结束时间" />
            </Form.Item>
          </Space>
          <Form.Item name="status" label="状态" initialValue="NOT_STARTED">
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
