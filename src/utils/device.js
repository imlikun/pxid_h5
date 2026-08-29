// 设备身份统一出口：直接委托原生桥。
// 真机（Flutter 注入 window.PXIDBridge.getDeviceId）返回真实设备 ID，
// 与发帖/互动后端落地身份一致；浏览器预览返回稳定的 mock 匿名 ID。
// 不再本地自造 UUID（旧 pxid_h5_device_id_v1），避免两套身份割裂导致
// 「我的」动态/收藏/关注/粉丝全部对不上（2026-08-29 根因修复）。
import bridge from '../bridge'

export async function getDeviceId() {
  try {
    const id = await bridge.getDeviceId()
    return id || ''
  } catch (e) {
    return ''
  }
}
