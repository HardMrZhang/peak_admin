import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, App, Popconfirm, Typography, Image, Switch, DatePicker,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { getBanners, createBanner, updateBanner, deleteBanner, toggleBanner } from '@/api/content'
import RichTextEditor from '@/components/RichTextEditor'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const langOptions = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en' },
]

const mediaTypeOptions = [
  { label: '富文本公告', value: 'RICH_TEXT' },
  { label: '图片', value: 'IMAGE' },
  { label: '视频', value: 'VIDEO' },
]

const mediaTypeMeta: Record<string, { label: string; color: string }> = {
  RICH_TEXT: { label: '富文本公告', color: 'green' },
  IMAGE: { label: '图片', color: 'blue' },
  VIDEO: { label: '视频', color: 'purple' },
}

function stripHtml(html?: string) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim()
}

export default function BannersPage() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [current, setCurrent] = useState<any>(null)
  const [form] = Form.useForm()
  const [filterForm] = Form.useForm()
  const mediaType = Form.useWatch('mediaType', form)
  const isRichText = mediaType === 'RICH_TEXT'

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = filterForm.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.langCode) params.langCode = values.langCode
      const res: any = await getBanners(params)
      setData(res.data?.list || res.data || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload: Record<string, unknown> = { ...values }
    if (values.startAt) payload.startAt = values.startAt.toISOString()
    else payload.startAt = undefined
    if (values.endAt) payload.endAt = values.endAt.toISOString()
    else payload.endAt = undefined

    if (values.mediaType === 'RICH_TEXT') {
      payload.mediaUrl = ''
    } else {
      payload.contentHtml = ''
    }
    if (!payload.targetUrl) payload.targetUrl = undefined

    try {
      if (editMode && current) {
        await updateBanner(current.id, payload)
        message.success('更新成功')
      } else {
        await createBanner(payload as any)
        message.success('创建成功')
      }
      form.resetFields()
      setVisible(false)
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBanner(id)
      message.success('已删除')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const handleToggle = async (id: string, checked: boolean) => {
    try {
      await toggleBanner(id, checked)
      message.success('状态已更新')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const openCreate = () => {
    setEditMode(false)
    setCurrent(null)
    form.resetFields()
    setVisible(true)
  }

  const openEdit = (record: any) => {
    setCurrent(record)
    setEditMode(true)
    form.setFieldsValue({
      ...record,
      startAt: record.startAt ? dayjs(record.startAt) : null,
      endAt: record.endAt ? dayjs(record.endAt) : null,
    })
    setVisible(true)
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 150, ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '内容预览',
      key: 'preview',
      width: 240,
      render: (_: unknown, record: any) => {
        if (record.mediaType === 'RICH_TEXT') {
          const text = stripHtml(record.contentHtml)
          return <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{text || '-'}</Text>
        }
        if (record.mediaType === 'VIDEO') return <Tag color="purple">视频</Tag>
        return record.mediaUrl
          ? <Image src={record.mediaUrl} width={80} height={45} style={{ objectFit: 'cover', borderRadius: 4 }} />
          : '-'
      },
    },
    {
      title: '类型',
      dataIndex: 'mediaType',
      key: 'mediaType',
      width: 100,
      render: (v: string) => {
        const meta = mediaTypeMeta[v] || mediaTypeMeta.IMAGE
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '语言',
      dataIndex: 'langCode',
      key: 'langCode',
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '跳转链接', dataIndex: 'targetUrl', key: 'targetUrl', width: 160, ellipsis: true, render: (v: string) => v || '-' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 70 },
    {
      title: '生效时间',
      key: 'period',
      width: 200,
      render: (_: unknown, record: any) => {
        const start = record.startAt ? new Date(record.startAt).toLocaleString('zh-CN') : '不限'
        const end = record.endAt ? new Date(record.endAt).toLocaleString('zh-CN') : '不限'
        return <Text type="secondary" style={{ fontSize: 12 }}>{start} ~ {end}</Text>
      },
    },
    {
      title: '启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 70,
      render: (v: number | boolean, record: any) => (
        <Switch checked={!!v} size="small" onChange={(checked) => handleToggle(record.id, checked)} />
      ),
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
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除此内容？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>公告管理</Title>
            <Text type="secondary">管理首页公告栏（富文本），支持多语言和定时上下架</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增公告
          </Button>
        </Space>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={filterForm} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="langCode">
            <Select placeholder="语言" allowClear style={{ width: 120 }} options={langOptions} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button></Form.Item>
          <Form.Item><Button onClick={() => { filterForm.resetFields(); loadData() }}>重置</Button></Form.Item>
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
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editMode ? '编辑公告' : '新增公告'}
        open={visible}
        onOk={handleSubmit}
        onCancel={() => { form.resetFields(); setVisible(false) }}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ langCode: 'zh-CN', mediaType: 'RICH_TEXT', sortOrder: 0, isEnabled: 1 }}>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="langCode" label="语言" style={{ flex: 1 }}>
              <Select options={langOptions} />
            </Form.Item>
            <Form.Item name="mediaType" label="类型" style={{ flex: 1 }}>
              <Select options={mediaTypeOptions} />
            </Form.Item>
          </Space>
          <Form.Item name="title" label="标题" tooltip="公告栏滚动展示的文字，富文本公告也需填写标题">
            <Input placeholder="公告标题" maxLength={100} />
          </Form.Item>

          {isRichText ? (
            <Form.Item
              name="contentHtml"
              label="公告内容（富文本）"
              rules={[{
                validator: (_, value) => {
                  if (stripHtml(value)) return Promise.resolve()
                  return Promise.reject(new Error('请输入公告内容'))
                },
              }]}
            >
              <RichTextEditor placeholder="请输入公告内容，可设置加粗、颜色、列表、链接等格式…" />
            </Form.Item>
          ) : (
            <Form.Item name="mediaUrl" label="媒体地址" rules={[{ required: true, message: '请输入媒体地址' }, { type: 'url', message: '请输入有效 URL' }]}>
              <Input placeholder="请输入图片或视频 URL" />
            </Form.Item>
          )}

          <Form.Item name="targetUrl" label="跳转链接" rules={[{ type: 'url', message: '请输入有效 URL' }]}>
            <Input placeholder="点击后跳转的链接（选填，需含 http(s)://）" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="sortOrder" label="排序" style={{ flex: 1 }} tooltip="数值越小越靠前">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="isEnabled" label="启用" style={{ flex: 1 }}>
              <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="startAt" label="生效开始" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="不限" />
            </Form.Item>
            <Form.Item name="endAt" label="生效结束" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="不限" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
