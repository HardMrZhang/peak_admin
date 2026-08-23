import { useState } from 'react'
import { Button, Image, Space, Upload, App } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { uploadDramaFile, type UploadScope } from '@/api/dramaIpo'

interface Props {
  value?: string | null
  onChange?: (url: string | null) => void
  scope: UploadScope
  width?: number
  height?: number
}

/**
 * 受控图片上传：上传成功后把后端返回的公开 URL 交回表单，
 * 表单里存的始终是字符串 URL 而不是 antd 的 fileList，省掉一层转换。
 */
export default function ImageUpload({ value, onChange, scope, width = 120, height = 160 }: Props) {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const res: any = await uploadDramaFile(file, scope)
      onChange?.(res.data?.url ?? null)
      message.success('上传成功')
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <Space direction="vertical" size={8}>
      {value ? (
        <Image
          src={value}
          width={width}
          height={height}
          style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
        />
      ) : null}
      <Space>
        <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
          <Button icon={<UploadOutlined />} loading={uploading} size="small">
            {value ? '重新上传' : '上传图片'}
          </Button>
        </Upload>
        {value ? (
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onChange?.(null)}>
            移除
          </Button>
        ) : null}
      </Space>
    </Space>
  )
}
