# 鹿児島玉龍中 学校説明会（R8.11.8）当日告知ストーリー

Instagram ストーリー用の縦型アニメーション動画（1080×1920 / 30fps / 17秒）。

- 完成動画: `out/gyokuryu_setsumeikai_story_20261108.mp4`
- 構成: ① いよいよ本日開催！ → ② 日時・場所 → ③ 説明会の内容＋教育活動写真＋願書配付 → ④ 持ち物・駐車場の注意＋マスコット
- 主要情報は IG の UI に隠れない y=240〜1626 に配置。下部のティッカーで要点を常時表示。
- 音声は無音トラックのみ。投稿時に Instagram の音楽スタンプで BGM を付ける想定。

## 再書き出し

```sh
npm install          # フォント（@fontsource）を取得
node render.mjs      # out/ に MP4 を出力（Playwright + ffmpeg）
node render.mjs --stills 2.6,6.5,16.9   # 指定秒の静止画を out/stills/ に出力
```

`index.html` をブラウザで直接開くとループ再生でプレビューできる。
