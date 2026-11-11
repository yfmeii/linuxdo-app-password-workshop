# 发布与核验

## 核验层次

| 信息 | 可核对的内容 | 边界 |
| --- | --- | --- |
| 页面版本号 | 对应的 Release 标签 | 同版本可以存在不同构建 |
| 页面完整提交号、源码指纹 | 与 Release 的 `build-info.json` 是否一致 | 由应用自报，不证明实际执行字节 |
| GitHub 构建证明 | 文件由本仓库工作流、对应提交构建 | 需要信任 GitHub、工作流及依赖供应链 |
| 本地复现包与 Release 完整 SHA-256 | 开源源码能否构建出相同上传包 | 需使用指定工具链 |
| 社区实际包与 Release 完整 SHA-256 | 两个包是否逐字节相同 | 需取得实际上传包或平台可信的完整摘要 |

沙箱 URL 中的短哈希前缀仅用于定位，不代替完整 64 位 SHA-256。页面显示的源码指纹不等于 ZIP 摘要，也不能充当对自身的完整性证明。平台更改加载方式、注入代码或运行环境的行为不在包比对的保证范围内。

## 构建信息

`scripts/build-info.mjs` 对所有受 Git 管理及未被忽略的源文件按路径排序，计算每个文件原始字节的 SHA-256，再对该文件清单的紧凑 JSON 计算总摘要。路径采用 Git 的相对路径；不包含时间戳、绝对路径、密码或设备信息。完整清单位于 `source-manifest.json`。

版本、仓库、Release URL、完整提交号、源码指纹和工作区是否有修改被编译进 `app.js`，同时写入 `build-info.json`。本地未提交构建显示“本地构建”。`release:build` 要求工作区干净、标签指向 HEAD、版本与标签一致，并检查构建期间源码未变化。

`release-manifest.json` 记录构建信息、官方工具提交及摘要、Node 版本、ZIP 大小、完整 ZIP SHA-256 和五个包内文件的摘要。`SHA256SUMS` 覆盖 ZIP、Release 清单、源码清单和构建信息。校验文件之间自洽不等于可信，来源还应通过 GitHub 构建证明验证。

## 发布

1. 同步 `package.json`、`manifest.json` 的版本，更新 manifest 中对应的 Release URL。
2. 使用 `.node-version` 指定的 Node.js，以及 `package.json` 指定的 npm，执行 `npm ci`、`npm run setup:pack`、`npm test`。
3. 重建词库并确认无差异，提交全部发布源码，创建对应标签，例如 `git tag v1.1.0`。
4. 执行 `npm run release:build`。同一源码和工具链的重复构建应产生相同 ZIP 摘要。
5. 推送提交和标签。GitHub Actions 在固定版本的 Ubuntu、Node 和 npm 上构建，为产物生成构建证明，并创建 Release。
6. 将该 Release 的 `app.zip` 原样上传 Linux DO，完成沙箱验证与提审。不要修改文件后沿用原校验信息。

Release 工作流固定第三方 Action 的完整提交，锁定 npm 依赖版本，且不写入源码。Release 只允许发布不存在的标签版本，不自动覆盖已有资产。

## 下载与验证

以下以 `v1.1.0` 为例，需要 Git、指定的 Node/npm 和 GitHub CLI。

```sh
git clone https://github.com/yfmeii/linuxdo-app-password-workshop.git
cd linuxdo-app-password-workshop
git checkout v1.1.0
npm ci
npm run setup:pack
npm run release:build
gh release download v1.1.0 --repo yfmeii/linuxdo-app-password-workshop --dir /tmp/password-workshop-release
gh attestation verify /tmp/password-workshop-release/app.zip --repo yfmeii/linuxdo-app-password-workshop
gh attestation verify /tmp/password-workshop-release/release-manifest.json --repo yfmeii/linuxdo-app-password-workshop
npm run verify:release -- /tmp/password-workshop-release
```

`gh attestation verify` 的输出应指向本仓库的 `.github/workflows/release.yml` 及所核对标签的完整提交。核验程序拒绝不干净的源码、不同提交或指纹、损坏下载、本地构建与发布包不一致。

取得社区实际包后追加其路径即可同时比较：

```sh
npm run verify:release -- /tmp/password-workshop-release /path/to/community-app.zip
```

无法取得社区实际字节或可信完整摘要时，只能确认页面自报的版本与源码信息，不能据此宣称运行代码已与开源包完全匹配。应用不自动请求 GitHub 或尝试读取宿主代码。
