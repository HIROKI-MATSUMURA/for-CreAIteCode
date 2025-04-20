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

```
/src/scss/
├── base/              # リセットやベーススタイル
│   ├── _base.scss     # 基本スタイル設定
│   └── _reset.scss    # ブラウザリセット
├── globals/           # プロジェクト全体で使用する変数、ミックスイン、関数
│   ├── _breakpoints.scss  # ブレイクポイント設定
│   ├── _function.scss     # 汎用関数
│   ├── _mixins.scss       # ミックスイン
│   └── _setting.scss      # 変数設定
├── object/            # 具体的なコンポーネント
│   ├── AI_Component/  # CreAIte Codeから自動的に挿入されるコンポーネント
│   │   └── *.scss
│   └── custom/        # 自分で設計・実装するカスタムコンポーネント
│       └── *.scss
└── style.scss         # メインのSCSSファイル（エントリーポイント）
```

## 画像最適化

画像は以下の場所に配置できます：

1. **src/assets/images/**: ビルドプロセスで最適化される画像

どちらの場所に配置した画像も、ビルド時にWebP形式に変換され、`<picture>`タグで出力されます。

## 備考
開発環境（src）は納品先へは提出を絶対にしない。
distのみの納品で問題ない。

## パスの参照方法と構成

### HTML内での参照方法

#### 画像の参照
```html
<!-- 画像ファイルの参照 -->
<img src="./images/logo.png" alt="説明" width="200" height="100">

<!-- パーシャルHTMLファイル内でも同じパスで参照可能 -->
<img src="./images/サムネイル.jpg" alt="説明">
```

#### CSSの参照（src/pages内から）
```html
<!-- 正しいパス：../で参照 -->
<link rel="stylesheet" href="../scss/style.scss">
```

#### JSの参照（src/pages内から）
```html
<!-- 正しいパス：../で参照 -->
<script src="../js/main.js"></script>
```

### SCSS内での参照
```scss
// 背景画像など
.element {
  background-image: url('../images/bg.jpg');
}
```

### ビルド後（dist）のディレクトリ構造
```
/dist/
├── assets/           # CSS/JSファイルの出力先
│   ├── index-*.css   # 最適化されたCSSファイル
│   └── index-*.js    # 最適化されたJSファイル
├── images/           # すべての画像ファイルが統合される
│   ├── logo.png      # オリジナル画像
│   ├── bg.jpg        # オリジナル画像
│   └── logo.webp     # 自動生成されたWebP画像
├── index.html        # HTMLファイル（直接ルートに出力）
└── about.html        # その他のHTMLファイル
```

### 重要なポイント

1. **HTML内からのパス参照**：
   - **画像**: `./images/` または `../assets/images/`
   - **CSS**: `../scss/style.scss`（src/pages内から）
   - **JS**: `../js/main.js`（src/pages内から）

2. **パーシャルHTMLからの参照**：
   - 画像: `./images/logo.png`

3. **ビルド後のパス**：
   - すべて相対パスに変換：`./assets/`, `./images/`

4. **自動変換**：
   - `../scss/style.scss` → `./assets/index-*.css`
   - `../js/main.js` → `./assets/index-*.js`
   - 画像パスも自動的に適切な形式に修正

このシンプルなルールに従うことで、開発・ビルド両方で一貫性のあるファイル参照が可能になり、どのような環境にデプロイしても正しく動作します。

## トラブルシューティング

### SCSSの変更が反映されない場合
- パーシャルファイル（_で始まるファイル）を編集した場合、style.scssを開いて保存すると変更が反映されます
- ポーリング監視モード（`npm run dev:poll`）で起動すると変更検知が改善される場合があります

### 画像パスが正しく表示されない場合
- 画像パスが`./images/`で始まっているか確認してください
- パーシャルHTML内からも同じパス形式を使用してください
- 画像が`src/assets/images/`に正しく配置されているか確認してください

### ビルドエラーが発生する場合
- `npm run lint`でエラーを確認してください
- 構文エラーやパス指定の誤りがないか確認してください
- Node.jsとnpmのバージョンが要件を満たしているか確認してください

## Handlebarsの使用方法

### パーシャルの呼び出し方
```html
<!-- src/pages/index.html内で -->
{{> header }}  <!-- src/partsHTML/header.htmlを挿入 -->

<!-- パラメータ付きでパーシャルを呼び出す -->
{{> card title="カードタイトル" description="説明文が入ります" }}

<!-- パスを指定してパーシャルを呼び出す（ネストしたフォルダ構造の場合） -->
{{> components/button label="送信する" }}
```

### 変数とコンテキストの使用方法
```html
<!-- src/partsHTML/header.html内で -->
<header class="c-header">
  <!-- シンプルな変数 -->
  <h1>{{pageTitle}}</h1>
  
  <!-- オブジェクトのプロパティ -->
  <div class="user-info">{{user.name}}（{{user.role}}）</div>
  
  <!-- コンテキスト変数（vite.config.mjsで設定） -->
  <img src="{{imagePath}}/logo.png" alt="ロゴ">
</header>
```

### 条件分岐の使用方法
```html
<!-- 条件に応じて表示を切り替え -->
{{#if isLoggedIn}}
  <p>ようこそ、{{userName}}さん</p>
{{else}}
  <p>ログインしてください</p>
{{/if}}

<!-- 否定条件 -->
{{#unless isClosed}}
  <p>営業中です</p>
{{/unless}}
```

### 繰り返し処理
```html
<!-- 配列データの繰り返し -->
<ul class="menu-list">
  {{#each menuItems}}
    <li class="menu-item">
      <!-- this は現在の要素を参照 -->
      <span class="menu-name">{{this.name}}</span>
      <span class="menu-price">{{this.price}}円</span>
    </li>
  {{/each}}
</ul>
```

### カスタムヘルパーの使用
```html
<!-- カスタムヘルパー例（vite.config.mjsで定義） -->
<p>{{formatDate createdAt "YYYY年MM月DD日"}}</p>

<!-- 条件ヘルパー -->
<div class="status {{statusClass type}}">{{type}}</div>
```

### 実装例：商品カードコンポーネント
```html
<!-- src/pages/index.html -->
<div class="product-list">
  {{#each products}}
    {{> product-card 
      title=this.title 
      price=this.price 
      imageUrl=this.image
      isNew=this.isNewArrival
    }}
  {{/each}}
</div>

<!-- src/partsHTML/product-card.html -->
<div class="c-card {{#if isNew}}c-card--new{{/if}}">
  <div class="c-card__image">
    <img src="{{imageUrl}}" alt="{{title}}の画像">
  </div>
  <div class="c-card__body">
    <h3 class="c-card__title">{{title}}</h3>
    <p class="c-card__price">{{price}}円</p>
    {{#if isNew}}
      <span class="c-card__badge">NEW</span>
    {{/if}}
  </div>
</div>
```

## パフォーマンス最適化のヒント

- 大きな画像は`src/assets/images/`に配置して最適化
- 未使用のCSSは自動的に削除されますが、明示的に保持したい場合は`safelist`を編集
- ビルド時の圧縮設定はvite.config.mjsで調整可能

## 動作確認済み環境

### ブラウザ
- Google Chrome（最新版）
- Safari（最新版）
- Firefox（最新版）
- Microsoft Edge（最新版）

### 開発環境
- macOS / Windows 10以降
- Node.js v18以上
- npm v7以上

## 著者

- 合同会社CodeUps 代表 HIROKI

## 更新履歴

### v1.0.0 (2025-4-20)
- 初回リリース
