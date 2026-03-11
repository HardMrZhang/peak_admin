import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, Tag, Space, message, Tree, Typography,
} from 'antd'
import { PlusOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { getRoles, createRole, updateRole, assignPermissions, getPermissions } from '@/api/rbac'

const { Title, Text } = Typography
const { TextArea } = Input

export default function RolesPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [createVisible, setCreateVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [permVisible, setPermVisible] = useState(false)
  const [currentRole, setCurrentRole] = useState<any>(null)
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await getRoles()
      setData(res.data?.list || res.data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const res: any = await getPermissions()
      setPermissions(res.data?.list || res.data || [])
    } catch { /* empty */ }
  }

  useEffect(() => {
    loadData()
    loadPermissions()
  }, [])

  const handleCreate = async () => {
    const values = await form.validateFields()
    try {
      await createRole({ roleCode: values.roleCode, roleName: values.roleName })
      message.success('创建成功')
      form.resetFields()
      setCreateVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const handleEdit = async () => {
    const values = await editForm.validateFields()
    const payload: Record<string, any> = {}
    if (values.roleName) payload.roleName = values.roleName
    if (values.status !== undefined) payload.status = values.status
    try {
      await updateRole(currentRole.id, payload)
      message.success('更新成功')
      setEditVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const handleAssignPerms = async () => {
    try {
      await assignPermissions(currentRole.id, checkedKeys)
      message.success('权限分配成功')
      setPermVisible(false)
      loadData()
    } catch { /* empty */ }
  }

  const permModules = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const mod = p.module || 'other'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(p)
    return acc
  }, {})

  const treeData = Object.entries(permModules).map(([mod, perms]) => ({
    title: mod,
    key: `module_${mod}`,
    children: (perms as any[]).map((p: any) => ({
      title: `${p.name} (${p.code})`,
      key: p.id,
    })),
  }))

  const columns = [
    { title: '角色名', dataIndex: 'roleName', key: 'roleName', width: 150 },
    { title: '编码', dataIndex: 'roleCode', key: 'roleCode', width: 150 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '权限数',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 100,
      render: (perms: any[]) => <Tag color="blue">{perms?.length || 0}</Tag>,
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
      width: 200,
      render: (_: unknown, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setCurrentRole(record)
              editForm.setFieldsValue({ roleName: record.roleName, status: record.status })
              setEditVisible(true)
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => {
              setCurrentRole(record)
              setCheckedKeys(record.permissions?.map((p: any) => p.permissionId || p.id) || [])
              setPermVisible(true)
            }}
          >
            分配权限
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>角色管理</Title>
            <Text type="secondary">管理系统角色及权限分配</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
            新增角色
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 900 }} />
      </Card>

      <Modal title="新增角色" open={createVisible} onOk={handleCreate} onCancel={() => { form.resetFields(); setCreateVisible(false) }} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="roleCode" label="角色编码" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input placeholder="如 OPERATOR" />
          </Form.Item>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如 运营人员" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="编辑角色" open={editVisible} onOk={handleEdit} onCancel={() => setEditVisible(false)} destroyOnClose>
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`分配权限 - ${currentRole?.roleName}`}
        open={permVisible}
        onOk={handleAssignPerms}
        onCancel={() => setPermVisible(false)}
        width={520}
        destroyOnClose
      >
        <Tree
          checkable
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={(keys: any) => setCheckedKeys(keys.checked || keys)}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  )
}
