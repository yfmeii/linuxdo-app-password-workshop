# 密码工坊 · Password Workshop

纯客户端密码生成器，适用于独立网页和 Linux DO 微应用。支持随机密码、英文单词或汉语词汇/成语拼音组成的易记密码，以及数字 PIN；提供长度与字符组合设置、隐藏、更换和复制。

界面使用 React、shadcn/ui、Tailwind CSS 和 Lucide。词库与分隔符使用单选项切换；操作反馈使用 Toast。适配社区配色、系统明暗主题、减少动效偏好、移动端及键盘操作。

## 本地运行

使用 [.node-version](.node-version) 中的 Node.js 和 `package.json` 指定的 npm。

```sh
npm ci
npm run dev
```

```sh
npm run setup:pack
npm test
npm run package
npm run preview
```

`setup:pack` 首次从固定上游提交下载官方打包工具，并校验 SHA-256，随后使用 `.cache/` 中的副本。下载只发生在开发、测试或打包阶段；应用运行时不下载词库、脚本或其他资源。

`dist/` 包含独立网页；`dist/package/app.zip` 是 Linux DO 上传包。版本号同时维护于 `package.json`、`manifest.json`，两者必须一致。应用 ID 是公开标识，Fork 项目应在 `manifest.json` 中填写自己的 ID，并同步仓库信息和外链清单。

## 核对版本

页面底部的“版本信息”显示版本号、完整源码提交和源码 SHA-256 指纹；“开源代码”指向本仓库。每个 [Release](https://github.com/yfmeii/linuxdo-app-password-workshop/releases) 提供上传包、构建信息、源码文件清单与 SHA-256 校验文件。

版本号和页面自报信息用于定位构建。核对社区实际包是否相同，应比较完整上传包的 SHA-256；复现构建和 GitHub 构建证明的步骤见 [发布与核验](docs/releases.md)。

## 文档

- [安全设计与信任边界](SECURITY.md)：随机数、熵值、数据处理与漏洞报告。
- [开发与部署](docs/development.md)：目录、离线词库、主题、权限和构建。
- [发布与核验](docs/releases.md)：源码指纹、可复现构建、Release、完整包比对。
- [公开内容检查](docs/publication.md)：适合公开和应排除的文件。
- [第三方来源与许可](THIRD_PARTY.md)：组件、图标、词库及官方打包工具。

原创应用代码使用 [MIT](LICENSE) 许可；第三方组件和数据分别适用其原有许可。
