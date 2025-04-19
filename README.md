# コーディング用開発環境 for CreAIteCode

このプロジェクトはViteを使った最新のコーディング環境です。SCSS、Handlebars、画像最適化など、モダンなWeb開発に必要な機能を備えています。

## 主な機能

- ✅ **SCSSサポート**: ネスト、変数、ミックスイン、関数などを使用可能
- ✅ **Handlebarsテンプレート**: 再利用可能なコンポーネントを作成可能
- ✅ **画像最適化**: 自動WebP変換、画像圧縮
- ✅ **自動ホットリロード**: ファイル変更時に自動更新
- ✅ **リンター/フォーマッター**: ESLint、StyleLint、Prettierでコード品質を維持
- ✅ **CSSの最適化**: 未使用CSSの削除、ベンダープレフィックスの自動追加
- ✅ **開発/本番環境の分離**: 環境別の設定ファイル

## 必要条件

- Node.js v18以上
- npm v7以上

## インストール

```bash
# 依存関係のインストール
npm install
```

## 使用方法

### 開発サーバーの起動

```bash
# 標準開発サーバー（基本これを利用）
npm run dev

# ポーリング監視（SCSSパーシャル変更検知に有効）
npm run dev:poll

# ポート指定
npm run dev:port --port=8080
```

### ビルド

```bash
# 標準ビルド（リント + クリーン + ビルド）
## 開発完了時は以下のコマンドを入力し、dist内に生成されたものを納品する
npm run build

# 高速ビルド（リント・クリーンなし）
npm run build:quick

# 環境別ビルド
npm run build:dev   # 開発環境向け
npm run build:prod  # 本番環境向け
```

### その他のコマンド

```bash
# コード整形
npm run format

# リントのみ実行
npm run lint

# ビルド結果のプレビュー
npm run preview
```

## ディレクトリ構造

```
/
├── src/                  # ソースコード（開発環境）
│   ├── assets/           # 処理が必要なアセット
│   │   ├── images/       # 最適化される画像
│   │   └── fonts/        # フォント
│   ├── js/               # JavaScriptファイル
│   │   ├── main.js       # メインJS
│   │   ├── utils/        # ユーティリティ関数
│   │   └── components/   # JSコンポーネント
│   ├── pages/            # HTMLページ
│   │   └── index.html
│   ├── partsHTML/        # Handlebarsパーシャル
│   └── scss/             # SCSSスタイル
│       ├── style.scss    # メインスタイル
│       ├── base/         # 基本スタイル
│       ├── global/       # グローバル設定（変数、ミックスイン、関数）
│       └── object/       # コンポーネントスタイル
│           ├── AI_Component/ # CreAIte Codeから自動挿入されるコンポーネント
│           └── custom/   # 自分でデザインするカスタムコンポーネント
├── dist/                 # ビルド出力（自動生成）
└── .*rc, *.config.js     # 設定ファイル
```

## SCSSの構造

SCSSは以下の構造で整理されています：

- **base/**: リセットやベーススタイル
- **global/**: プロジェクト全体で使用する変数、ミックスイン、関数
- **object/**: 具体的なコンポーネント
  - **AI_Component/**: CreAIte Codeから自動的に挿入されるコンポーネント
  - **custom/**: 自分で設計・実装するカスタムコンポーネント

## 画像最適化

画像は以下の場所に配置できます：

1. **src/assets/images/**: ビルドプロセスで最適化される画像

どちらの場所に配置した画像も、ビルド時にWebP形式に変換され、`<picture>`タグで出力されます。

## 備考
開発環境（src）は納品先へは提出を絶対にしない。
distのみの納品で問題ない。

## 著者

- 合同会社CodeUps 代表 HIROKI
