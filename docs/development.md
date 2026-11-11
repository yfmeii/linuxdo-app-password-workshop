# 开发与部署

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/App.jsx` | 生成器页面与交互 |
| `src/generator.js` | 随机数、生成策略、熵值 |
| `src/host.js` | 主题、剪贴板与受控外链 |
| `src/components/ui/` | shadcn/ui 组件 |
| `src/style.css` | 主题、响应式布局和动效 |
| `src/words.json`、`src/pinyin-words.json` | 运行时本地词库 |
| `vendor/` | 有明确来源和许可的词库数据 |
| `scripts/` | 词库、网页、打包和版本核验工具 |
| `test/` | Node.js 测试 |
| `.github/workflows/` | CI 和 Release |

## 主题与交互

社区提供的 `background`、`text`、`accent`、`border` 映射为背景、文字、强调色和边框，辅助颜色由背景/文字色派生。缺少完整有效配色时使用内置配色；独立网页跟随系统明暗主题。

CSS 动效遵循系统及社区的减少动效偏好。密码内容立即更新，动效不保留上一次结果。词库与分隔符使用 Radio Group，窄屏换行，支持点击整张选项和方向键切换。

Toast 同时显示最新一条通知。成功提示显示 3 秒，其他提示显示 7 秒；可关闭，悬停或聚焦时暂停计时，支持 F8 聚焦及读屏播报。生成失败、强度及长度限制在相关位置持续显示。

## 词库重建

```sh
node scripts/build-wordlist.mjs
node scripts/build-pinyin-wordlists.mjs
```

两条命令均从仓库内的数据离线生成词库。上游文件验证和汉语词库筛选规则见 [词库说明](../vendor/hsk/README.md)，来源和许可见 [第三方资源](../THIRD_PARTY.md)。

## Linux DO 打包

遵循 [官方开发指南](https://github.com/linux-do/mapp-developer-guide/blob/master/docs/developer-guide.md)。应用使用宿主提供的 `globalThis.miniApp` 接口，等待 `ready`、报告首屏就绪并订阅主题变化。剪贴板权限不足、用户取消或失败时显示情境提示；外链仅使用清单中的固定地址。

`npm run setup:pack` 按固定提交下载官方 `pack.mjs`，校验摘要后缓存在忽略目录 `.cache/mapp-sdk/`。`npm run package` 也会在缓存缺失时执行此步骤。缓存文件每次使用前均校验；内容不符时停止，不执行该文件。

ZIP 根目录包含 `manifest.json`、`index.html` 正文片段、IIFE `app.js`、`app.css`、`strings.json` 五个文件，由官方工具校验生成。ZIP 外的版本核验文件位于 `dist/package/`。将 `app.zip` 上传社区沙箱验证，随后通过社区管理页提审。GitHub Release 不会自动更新社区应用。

## 独立网页

`npm run build` 输出网页、脚本、样式、字符串和 `build-info.json` 到 `dist/`。`npm run preview` 仅在 `127.0.0.1` 预览。生产环境使用 HTTPS 静态服务，响应头要求见 [安全设计](../SECURITY.md)。

网页 CSP、SHA-384 完整性属性及 HTML 由 `scripts/build-web.mjs` 生成。修改源文件后重新构建，不能直接改写带完整性校验的产物。
