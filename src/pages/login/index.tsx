import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, BlockOutlined } from '@ant-design/icons'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const { setToken } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res: any = await login(values)
      setToken(res.data.token)
      message.success('登录成功')
      navigate('/', { replace: true })
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: -200,
          right: -100,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          bottom: -100,
          left: -100,
        }}
      />

      <div
        style={{
          width: 420,
          padding: '48px 40px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 16,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}
          >
            <BlockOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Peak Admin
          </Title>
          <Text type="secondary">后台管理系统</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="用户名"
              style={{ borderRadius: 8, height: 48 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="密码"
              style={{ borderRadius: 8, height: 48 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
