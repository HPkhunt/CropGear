import client from './api.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const PUBLIC_MEDIA_BASE = `${API_BASE.replace(/\/$/, '')}/media/public`

async function presignUpload({ purpose, file, related }) {
  const payload = {
    purpose,
    content_type: file.type || 'application/octet-stream',
    content_length: file.size || 0,
    filename: file.name || ''
  }
  if (related && typeof related === 'object') {
    payload.related = related
  }
  const { data } = await client.post('/media/presign', payload)
  return data
}

async function uploadToS3({ url, fields, file }) {
  const form = new FormData()
  Object.entries(fields || {}).forEach(([key, value]) => {
    form.append(key, value)
  })
  form.append('file', file)
  const response = await fetch(url, {
    method: 'POST',
    body: form
  })
  if (!response.ok) {
    throw new Error(`S3 upload failed with status ${response.status}`)
  }
  return true
}

async function finalizeUpload(assetId) {
  const { data } = await client.post('/media/finalize', { asset_id: assetId })
  return data
}

async function uploadMedia({ purpose, file, related }) {
  const presign = await presignUpload({ purpose, file, related })
  const asset = presign?.asset
  const upload = presign?.upload
  if (!asset?.id || !upload?.url) {
    throw new Error('Invalid presign response')
  }
  await uploadToS3({ url: upload.url, fields: upload.fields, file })
  const finalized = await finalizeUpload(asset.id)
  const publicUrl = `${PUBLIC_MEDIA_BASE}/${asset.id}`
  return {
    asset: finalized?.asset || asset,
    publicUrl,
    downloadUrl: finalized?.download_url
  }
}

export const mediaService = {
  uploadMedia,
  async getCapabilities() {
    const { data } = await client.get('/media/capabilities')
    return data
  },
  uploadEquipmentImage(file, related) {
    return uploadMedia({ purpose: 'equipment_image', file, related })
  },
  uploadReviewPhoto(file, related) {
    return uploadMedia({ purpose: 'review_photo', file, related })
  },
  publicUrlFor(assetId) {
    return `${PUBLIC_MEDIA_BASE}/${assetId}`
  }
}
