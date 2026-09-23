# mellow — 体重記録PWA

毎日の体重を記録し、月ごとの推移を確認できる個人向けWebアプリです。iPhone、Android、Macに対応し、ホーム画面へ追加後はオフラインでも利用できます。

## 主な機能

- 体重の登録・同日更新・編集・確認付き削除
- 月別グラフ、月間集計、目標体重
- JSONバックアップ・復元、CSV書き出し
- ライト／ダーク／OS連動テーマ
- PWAインストール、オフライン起動・記録

## 技術・プライバシー

HTML、CSS、Vanilla JavaScript、Canvas、localStorage、Web App Manifest、Service Worker、Cache APIを使用しています。外部ライブラリ、外部API、AI、解析、広告、トラッキングはありません。体重データは端末のブラウザ内だけに保存され、GitHub等のサーバーへ送信されません。

## ホーム画面へ追加

PWA版は、HTTPSで公開されたURLから利用してください。

### iPhone / iPad

1. Safariで公開URLを開きます。
2. 共有ボタンから「ホーム画面に追加」を選びます。
3. ホーム画面のmellowから起動します。

### Android

1. Chromeで公開URLを開きます。
2. メニューから「アプリをインストール」または「ホーム画面に追加」を選びます。
3. ホーム画面のmellowから起動します。

### Mac

SafariまたはChromeで公開URLへアクセスします。対応ブラウザでは共有メニューやアドレスバーからアプリとして追加できます。

## オフライン動作

初回はオンラインで公開URLを最後まで読み込んでください。初回読み込み後はキャッシュを優先して起動するため、通信がなくてもホーム画面から起動し、既存記録の確認と新規登録ができます。記録はオンライン復帰後も端末内に残ります。起動時に体重データを外部へ送信することはありません。

## データ・旧版との互換性

保存キーとデータ構造は旧版から変更していません。

```text
mellow.weightRecords.v1  # [{ date: "YYYY-MM-DD", weight: 67.2 }, ...]
mellow.goalWeight.v1     # 目標体重
mellow.theme.v1          # auto / light / dark
```

JSONバックアップも旧版と同じversion 1です。

```json
{
  "app": "mellow",
  "version": 1,
  "exportedAt": "2026-08-20T00:00:00.000Z",
  "records": [{ "date": "2026-08-19", "weight": 65.8 }],
  "goalWeight": 63.0
}
```

旧版のversion 1バックアップはPWA版でも復元できます。復元前には、現在の記録と目標体重を置き換える確認が表示されます。不正なJSON、存在しない日付、不正な目標体重は保存前に拒否され、確認をキャンセルした場合も既存データと画面表示は変更されません。

## バックアップ・復元・CSV

- 「バックアップを作成」で `mellow-backup-日付.json` を保存します。
- 「バックアップから復元」で旧版またはPWA版のJSONを選びます。
- 「CSVで書き出す」で `date,weight` 形式のCSVを保存します。

通常、AndroidとMacではダウンロードフォルダへ保存されます。iPhoneではダウンロード後の共有・保存画面から「ファイルに保存」を選択します。大切な記録は定期的にJSONバックアップしてください。

## 旧ローカル版からの移行

1. 旧版でJSONバックアップを作成します。
2. 公開URLからPWA版をホーム画面へ追加します。
3. PWA版で「バックアップから復元」を選びます。
4. 件数、日付、体重、目標体重を確認します。

ローカルHTMLと公開URLでは保存領域が異なるため、自動移行は行いません。`mellow.html`は旧Android向けローカル単一ファイル版として残しています。iPhoneの正式な利用方法はPWA版です。

## ローカルテスト

Service Workerは `file://` や `content://` では動作しません。フォルダ内で次を実行します。

```sh
python3 -m http.server 8000
```

`http://localhost:8000/` を開き、開発者ツールでManifest、Service Worker、Cache Storageを確認してください。

## GitHub Pagesへの公開

GitHub Freeでは、公開用リポジトリをPublicにします。公開されるのはアプリ本体だけです。

1. [GitHub](https://github.com/)でアカウントを用意します。
2. 「New repository」で例として `mellow` というPublicリポジトリを作ります。
3. このフォルダの全ファイルと `icons` フォルダをリポジトリ直下へ登録します。
4. 「Settings」→「Pages」を開きます。
5. Sourceを「Deploy from a branch」にします。
6. Branchを `main`、フォルダを `/(root)` にして保存します。
7. `https://ユーザー名.github.io/mellow/` を開きます。
8. iPhone／Androidでホーム画面へ追加します。

バックアップJSON、CSV、テスト用個人データはリポジトリへ登録しないでください。`.gitignore`にも標準ファイル名を設定済みです。

## 更新方法

1. コードを修正し、localhostで確認します。
2. キャッシュ対象を変更したら、`sw.js`の `CACHE_NAME` を次回の例では `mellow-cache-v4` のように更新します。現在のキャッシュ名は `mellow-cache-v3` です。
3. Gitへコミットし、GitHubの `main` へpushします。
4. GitHub Pages更新後、PWAをオンラインで一度起動します。
5. 次回起動で新版へ切り替わることを確認します。

新しいService Workerは古い `mellow-cache-*` を削除します。起動ページはキャッシュを優先し、キャッシュがない初回だけネットワークから取得します。大きな更新ダイアログは表示しません。

## 実機テスト

### iPhone

ホーム画面へ追加後、登録→終了→再起動で保存を確認します。次に機内モードで起動・登録・再起動を行い、記録が残ることを確認します。オンラインへ戻した後も記録が変わらないこと、旧版JSONの件数・日付・体重・目標体重が一致することを確認します。

### Android

Chromeからインストール後、登録、再起動後の保存、機内モードでの起動・登録、JSONバックアップ・復元、CSV書き出しを確認します。

## ファイル構成

```text
├── index.html                # PWAの正式な起動ページ
├── styles.css               # 既存UIとレスポンシブ表示
├── app.js                    # 記録・保存・バックアップ・PWA登録
├── manifest.webmanifest      # PWA設定
├── sw.js                     # オフラインキャッシュと更新
├── .nojekyll                 # GitHub Pages用
├── .gitignore                # 個人データの誤登録防止
├── icons/                    # 180／192／512pxアイコン
├── mellow.html               # 旧Androidローカル版
└── README.md
```

## 既知の制限・トラブルシューティング

- データは端末・ブラウザ・公開URLごとに独立し、PCとスマホ間で自動同期されません。
- URLやリポジトリ名を変える前にJSONバックアップを作成してください。
- ホーム画面へ追加できない場合は、HTTPS、manifest、Service Workerの配信を確認してください。
- オフライン起動できない場合は、オンラインで一度最後まで開いてください。
- 更新されない場合は `CACHE_NAME` を変更して再公開し、オンラインで起動してください。
- iPhoneでローカルHTMLを直接開く方法は正式サポート対象外です。

## バージョン

- PWA版: 1.0.0
- localStorage: v1
- JSONバックアップ: version 1（旧版互換）
