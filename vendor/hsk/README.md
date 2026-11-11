# 汉语拼音词库

来源：[Complete HSK Vocabulary complete.json](https://github.com/drkameleon/complete-hsk-vocabulary/blob/7ac65bf1a6387d35f1ade478906172a19311c7f9/complete.json)。上游项目 MIT 许可见 [LICENSE](LICENSE)。词典读音包含 CC-CEDICT 贡献者的数据，来源与数据许可见 [第三方资源](../../THIRD_PARTY.md)。`pinyin-source.json` 和生成的 `src/pinyin-words.json` 按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 提供。

上游完整文件的 SHA-256 为 `c869a0ce353279c9333d9b42c31fc3549785e8b40673dab57ee42bc99cd14131`。

`pinyin-source.json` 保留符合条件词条的简体汉字及首个数字声调读音：词汇为 HSK 3.0 一至六级的双字词，成语为释义含 `(idiom)` 的四字条目。生成脚本校验音节数量，去掉声调，将 ü/u: 转为 v，并按拼接后的 ASCII 拼音去重；同拼音只保留首个汉字提示。输出包含 3,761 个词汇拼音与 264 个成语拼音。

在项目根目录执行离线重建：

```sh
node scripts/build-pinyin-wordlists.mjs
```

从固定上游文件重新提取并生成：

```sh
curl -fsSL https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/7ac65bf1a6387d35f1ade478906172a19311c7f9/complete.json -o /tmp/complete-hsk.json
node scripts/build-pinyin-wordlists.mjs /tmp/complete-hsk.json
```

导入前脚本校验完整文件的 SHA-256。运行时仅使用随应用打包的词库。
