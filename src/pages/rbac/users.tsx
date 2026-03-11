import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Typography,
} from 'antd'
import { PlusOutlined, UserOutlined, EditOutlined } from '@ant-design/icons'
import { getAdminUsers, createAdminUser, assignRoles, updateAdminStatus, getRoles } from '@/api/rbac'

const { Title, Text } = Typography

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [createVisible, setCreateVisible] = useState(false)
  const [roleVisible, setRoleVisible] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [roles, setRoles] = useState<any[]>([])
  const [form] = Form.useForm()
  const [roleForm] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res: any = await getAdminUsers({ page, pageSize })
      setData(res.data?.list || [])
      setPagination({
        current: page,
        pageSize,
        total: res.data?.total || 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const res: any = await getRoles()
      setRoles(res.data?.list || res.data || [])
    } catch { /* empty */ }
  }

  useEffect(() => {
    loadData()
    loadRoles()
  }, [])

  const handleCreate = async () => {
    const values = await form.validateFields()
    try {
      await createAdminUser(values)
      message.success('创建成功')
      form.resetFields()
      setCreateVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const handleAssignRoles = async () => {
    const values = await roleForm.validateFields()
    try {
      await assignRoles(currentUser.id, values.roleIds)
      message.success('角色分配成功')
      setRoleVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const handleToggleStatus = async (record: any) => {
    const newStatus = record.status === 1 ? 0 : 1
    try {
      await updateAdminStatus(record.id, newStatus)
      message.success(newStatus === 1 ? '已启用' : '已禁用')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* empty */ }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '显示名', dataIndex: 'displayName', key: 'displayName', width: 120 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '手机', dataIndex: 'mobile', key: 'mobile', width: 140 },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (roles: any[]) =>
        roles?.map((r: any) => (
          <Tag color="blue" key={r.id || r.roleId}>
            {r.role?.name || r.name}
          </Tag>
        )) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: number) => (
        <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setCurrentUser(record)
              roleForm.setFieldsValue({
                roleIds: record.roles?.map((r: any) => r.roleId || r.id) || [],
              })
              setRoleVisible(true)
            }}
          >
            分配角色
          </Button>
          <Popconfirm
            title={`确认${record.status === 1 ? '禁用' : '启用'}此管理员？`}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button type="link" size="small" danger={record.status === 1}>
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
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
            <Title level={4} style={{ margin: 0 }}>管理员列表</Title>
            <Text type="secondary">管理系统管理员账户</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
            新增管理员
          </Button>
        </Space>
      </div>

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
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="新增管理员"
        open={createVisible}
        onOk={handleCreate}
        onCancel={() => { form.resetFields(); setCreateVisible(false) }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码不少于8位' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名" rules={[{ required: true, message: '请输入显示名' }]}>
            <Input placeholder="请输入显示名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="mobile" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`分配角色 - ${currentUser?.displayName || currentUser?.username}`}
        open={roleVisible}
        onOk={handleAssignRoles}
        onCancel={() => setRoleVisible(false)}
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="roleIds" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((r: any) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
