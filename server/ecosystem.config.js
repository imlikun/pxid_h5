// pxid-feed 持久化环境配置（2026-08-20 P0 安全修复引入）
// 背景：ADMIN_TOKEN / SHOPIFY_WEBHOOK_SECRET 原为代码内硬编码 fallback / 空值，
//       现改 fail-closed：env 不配即拒绝（admin 500 / webhook 503）。
// 本文件即权威配置源，修改后执行：pm2 startOrReload ecosystem.config.js --only pxid-feed
module.exports = {
  apps: [{
    name: 'pxid-feed',
    script: 'server.js',
    cwd: '/root/pxid-feed-server',
    env: {
      NODE_ENV: 'production',
      PORT: 8700,
      // 运营后台接口 token（2026-08-20 轮换，原硬编码 '875632...' 已作废）
      ADMIN_TOKEN: '182376f39b788161dc6323b074dea44811343406d03e84d2',
      // Shopify webhook HMAC secret（2026-08-20 生成，待 Shopify 侧配置 orders/create + fulfillment/update 时使用）
      SHOPIFY_WEBHOOK_SECRET: '4b599ad098eaf1ec807a474c49a90a2dfc0fa00edab43f6b78b4bfd20487f49a',
      // 用户侧 token 签名密钥（2026-08-20 SEC-01 修复引入，crypto.randomBytes(64) 生成）
      // 配了才启用 HMAC 验真；ToC Flutter 需用同一 secret 签发 token 给 bridge.getToken()
      USER_TOKEN_SECRET: '992d7b63db794dee5828ae9746a31422ade8df40342181c8947f5d2548ef381a9c1d64c81408a5b044a745f12dfda58df109864028d6a7a108507d2d476fb596',
      // ===== ToC 公网网关对接（2026-08-26 启用，对齐 raulin Apipost「与发现精选对接」线上/开发环境）=====
      // 实测：公网 toc.pxidiot.com:446 用默认 dev secret 即可通（raulin Apipost 未配 discoverAppSecret 变量，走 fallback 默认值，200 OK）
      TOC_BASE_URL: 'https://toc.pxidiot.com:446',
      TOC_CLIENT_ID: 'pxid_discover',
      TOC_CLIENT_SECRET: 'toc-dev-2026-08-24-discover-app-secret',
      // ban-sync 反向（D→ToC 强踢）复用同一 secret；正向（ToC→D 推送）待 raulin 给 TOC_BANSYNC_SECRET 再开
      TOC_BANSYNC_SECRET: 'toc-dev-2026-08-24-discover-app-secret'
    }
  }]
}
