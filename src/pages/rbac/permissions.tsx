import { useEffect, useState } from 'react'
import { Card, Table, Tag, Typography } from 'antd'
import { getPermissions } from '@/api/rbac'

const { Title, Text } = Typography

export default function PermissionsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setLoading(true)
    getPermissions()
      .then((res: any) => setData(res.data?.list || res.data || []))
      .finally(() => setLoading(false))
  }, [])

  const modules = [...new Set(data.map((p: any) => p.module))]

  const columns = [
    { title: '权限名', dataIndex: 'name', key: 'name', width: 200 },
    { title: '编码', dataIndex: 'code', key: 'code', width: 200 },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 140,
      filters: modules.map((m) => ({ text: m, value: m })),
      onFilter: (value: any, record: any) => record.module === value,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description' },
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
        <Title level={4} style={{ margin: 0 }}>权限列表</Title>
        <Text type="secondary">查看系统所有权限码</Text>
      </div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 800 }} />
      </Card>
    </div>
  )
}
