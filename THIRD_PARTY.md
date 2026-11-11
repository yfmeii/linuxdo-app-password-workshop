# 第三方资源

## UI 组件和图标

`src/components/ui/` 中的组件基于 [shadcn/ui](https://ui.shadcn.com)，使用 [MIT 许可](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)。组件基于 Radix UI，类名工具使用本地 `src/lib/utils.js`。

Toast 组件改编自 shadcn/ui 的 [New York Toast](https://ui.shadcn.com/r/styles/new-york/toast.json)，使用同一 MIT 许可，适配本地通知状态、配色与动效。

Radio Group 组件改编自 shadcn/ui 的 [New York Radio Group](https://ui.shadcn.com/r/styles/new-york/radio-group.json)，使用同一 MIT 许可，适配本地布局与配色。

界面图标来自 [Lucide](https://lucide.dev/license)，使用 ISC 许可。React、Radix UI、Tailwind CSS 及其依赖的版本与许可记录在 `package-lock.json` 和安装包元数据中。

shadcn/ui 与 Lucide 的版权和许可原文保留在 `licenses/`。

## EFF 长词表

`vendor/eff_large_wordlist.txt` 为 Electronic Frontier Foundation 的 [EFF's Long Wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt)，包含 7,776 个单词。`scripts/build-wordlist.mjs` 去除骰子索引，并排除 4 个含连字符的词以避免与密码分隔符冲突，生成包含 7,772 个单词的 `src/words.json`。

作者：Electronic Frontier Foundation。词表按 [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/) 许可提供。说明与来源：[Deep Dive: EFF's New Wordlists for Random Passphrases](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases)。

许可原文见 `licenses/CC-BY-3.0.txt`。

## 汉语拼音词库

`vendor/hsk/pinyin-source.json` 提取自 [Complete HSK Vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary/tree/7ac65bf1a6387d35f1ade478906172a19311c7f9)，提交 `7ac65bf1a6387d35f1ade478906172a19311c7f9`。作者 Yanis Zafirópulos，项目使用 MIT 许可，原文保留在 `vendor/hsk/LICENSE`。

该项目的词典读音来源包含 [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)，由 CC-CEDICT 贡献者维护，使用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可。提取数据与 `src/pinyin-words.json` 的词库衍生数据按 CC BY-SA 4.0 提供；此许可适用于数据。

处理包括筛选 HSK 3.0 一至六级双字词、筛选四字成语、选取首个读音、去除声调、将 ü 转为 v、拼接音节及按最终拼音去重。重建步骤见 [词库说明](vendor/hsk/README.md)。应用 JS 构建产物保留来源与许可声明。

数据许可原文见 `licenses/CC-BY-SA-4.0.txt`，上游项目 MIT 原文见 `vendor/hsk/LICENSE`。

## 官方打包工具

打包使用 [linux-do/mapp-developer-guide 的 pack.mjs](https://github.com/linux-do/mapp-developer-guide/blob/acbe7817a006bd82c2fc084611d8f43de245808c/sdk/pack.mjs)，固定提交 `acbe7817a006bd82c2fc084611d8f43de245808c`，SHA-256 为 `3d163ba12e709f202a2472f5fd357494aea272f8fff2e94f4ef4ee5363f9bc51`。`scripts/official-pack.mjs` 在开发环境下载并校验该工具，缓存目录被 Git 忽略。

上游在该提交未附许可证，本仓库不转载 SDK 文件，也不将原创代码的 MIT 许可扩展到上游工具。运行时直接使用宿主提供的 `globalThis.miniApp` 接口，未将 SDK 副本打入应用。
