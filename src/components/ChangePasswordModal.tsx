import { Modal, Form, Input, message } from 'antd'
import { changePassword } from '@/api/auth'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [form] = Form.useForm()

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      await changePassword(values)
      message.success('密码修改成功')
      form.resetFields()
      onClose()
    } catch {
      // error handled by interceptor
    }
  }

  return (
    <Modal
      title="修改密码"
      open={visible}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose() }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="oldPassword"
          label="旧密码"
          rules={[{ required: true, message: '请输入旧密码' }]}
        >
          <Input.Password placeholder="请输入旧密码" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码不少于8位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
