# さがせ！画像ジェネレーター

Vercel公開用の構成です。

## ファイル構成

- `index.html` 画面
- `style.css` 見た目
- `script.js` ブラウザ内の画像生成処理
- `api/verify-license.js` ライセンス認証API
- `vercel.json` Vercel設定

## 重要

画像処理はブラウザ内だけで完結します。画像ファイルはサーバーへ送信しません。

ライセンスキー本体はコードに書かず、Vercelの環境変数 `LICENSE_KEY` に設定します。

## Vercelの環境変数

Name: `LICENSE_KEY`
Value: `SECRET-TSUBUO-2026`

