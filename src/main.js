import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initBridge } from './bridge'
import './styles/tokens.css'

initBridge()

const app = createApp(App)
app.use(router)

// 供 bridge mock 在独立预览时做路由兜底
window.__router = router

app.mount('#app')
