// 简化鉴权：每台浏览器/设备一个稳定 ID（localStorage 持久化）
// 首次访问生成 UUID，之后随发帖提交（后端用于去重 / 关联用户）
const KEY = 'pxid_h5_device_id_v1'
function uuid() {
  // RFC4122 v4 简化
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch (e) {
    return 'web-' + Date.now()
  }
}
