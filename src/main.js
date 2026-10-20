import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initBridge, prewarmAuthToken } from './bridge'
import './styles/tokens.css'
import { installDetailDiagnostics } from './utils/detailDiagnostics'
import { loadSocialMode } from './config/socialMode'

initBridge()
installDetailDiagnostics()
// 与首屏渲染并行预热登录 token：request() 每个接口前都要 await 它，
// 不预热的话首屏列表会被这一个串行 RTT（实测 ~1s）挡住
prewarmAuthToken()

async function bootstrap() {
  // 先读只读开关再 mount：避免先渲染出发布/点赞等社交入口再闪没
  await loadSocialMode()

  const app = createApp(App)
  app.use(router)

  // 供 bridge mock 在独立预览时做路由兜底
  window.__router = router

  app.mount('#app')
}

bootstrap()
