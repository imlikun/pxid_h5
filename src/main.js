import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initBridge, prewarmAuthToken } from './bridge'
import './styles/tokens.css'

initBridge()
// 与首屏渲染并行预热登录 token：request() 每个接口前都要 await 它，
// 不预热的话首屏列表会被这一个串行 RTT（实测 ~1s）挡住
prewarmAuthToken()

const app = createApp(App)
app.use(router)

// 供 bridge mock 在独立预览时做路由兜底
window.__router = router

app.mount('#app')
