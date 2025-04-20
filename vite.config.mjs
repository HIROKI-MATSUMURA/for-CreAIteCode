import { defineConfig } from "vite";
import sassGlobImports from "vite-plugin-sass-glob-import";
import viteImagemin from "vite-plugin-imagemin";
import handlebars from "vite-plugin-handlebars";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import autoprefixer from "autoprefixer";
import purgecss from "vite-plugin-purgecss";

export default defineConfig({
  root: "src",
  server: {
    port: process.env.VITE_PORT || 3000,
    open: '/pages/', // pagesディレクトリを開く
    strictPort: false,
    hmr: {
      // ホットモジュールリロード設定
      protocol: 'ws',
      host: 'localhost',
    },
    fs: {
      // Viteが/srcの外部のファイルにアクセスできるようにする
      allow: ['..']
    },
    // ルートURLへのアクセスをpages/index.htmlにリダイレクト
    middlewareMode: false,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // ルートへのアクセスをpages/index.htmlにリダイレクト
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/pages/index.html';
        }

        // イメージリクエストのデバッグ情報
        if (req.url && req.url.includes('images')) {
          console.log(`[server] 画像リクエスト: ${req.url}`);
        }

        // /images/から始まるリクエストを処理
        if (req.url && req.url.includes('/images/')) {
          const imageName = path.basename(req.url);

          // まずsrc/assets/imagesから探す
          const assetPath = path.resolve(__dirname, 'src/assets/images', imageName);
          if (fs.existsSync(assetPath)) {
            console.log(`[server] アセット画像が見つかりました: ${assetPath}`);
            req.url = `/assets/images/${imageName}`;
          }
          // なければpublicから探す（変更なし、そのままで良い）
        }

        next();
      });
    },
    watch: {
      // SCSSファイルの変更を検知するための設定を強化
      usePolling: true, // ポーリングを使用して確実に変更を検知
      interval: 100, // ポーリング間隔（ミリ秒）
    },
  },
  base: "./",
  plugins: [
    sassGlobImports(),
    // パス変換プラグイン（改良版）- すべての画像パスを処理
    {
      name: 'unified-image-paths',
      transformIndexHtml(html) {
        // HTML内の画像パスを統一形式に変換
        return html;
      }
    },
    handlebars({
      partialDirectory: path.resolve(__dirname, 'src/partsHTML'),
      context: {
        // テンプレートで使用できる変数
        imagePath: './images', // 全てのHTMLから同じパスで参照できるように
        assetsPath: './assets'
      },
      // ヘルパー関数の追加
      helpers: {
        // 画像パスを生成するヘルパー
        img: function (path) {
          return `./images/${path}`;
        }
      }
    }),
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 70 },
      pngquant: { quality: [0.6, 0.8], speed: 4 },
      webp: { quality: 75 },
      svgo: { plugins: [{ removeViewBox: false }] },
    }),
    // カスタムプラグイン：HTMLと画像のビルド出力を調整
    {
      name: 'custom-build-processing',
      apply: 'build',
      generateBundle(options, bundle) {
        // HTMLファイルの出力パスを調整
        Object.keys(bundle).forEach(fileName => {
          const asset = bundle[fileName];

          // HTMLファイルを検出してpages/ディレクトリから移動
          if (fileName.endsWith('.html') && fileName.includes('pages/')) {
            // 出力先を変更（pages/ファイル名.html → ファイル名.html）
            const newFileName = fileName.replace('pages/', '');
            console.log(`[build] HTML出力先を変更: ${fileName} → ${newFileName}`);

            // 新しいファイル名で同じ内容を追加
            bundle[newFileName] = {
              ...asset,
              fileName: newFileName
            };

            // 元のファイルを削除
            delete bundle[fileName];
          }

          // assets/images ディレクトリの画像を images ディレクトリに移動
          if (fileName.startsWith('assets/images/')) {
            const newFileName = fileName.replace('assets/images/', 'images/');
            console.log(`[build] 画像出力先を変更: ${fileName} → ${newFileName}`);

            // 新しいファイル名で同じ内容を追加
            bundle[newFileName] = {
              ...asset,
              fileName: newFileName
            };

            // 元のファイルを削除
            delete bundle[fileName];
          }
        });
      },
      closeBundle() {
        // ビルド後に実行される処理
        // src/assets/imagesのファイルをdist/imagesにコピー
        console.log('[build] 画像ファイルをコピーしています...');
        const srcImagesDir = path.resolve(__dirname, 'src/assets/images');
        const destImagesDir = path.resolve(__dirname, 'dist/images');

        // 出力ディレクトリがなければ作成
        if (!fs.existsSync(destImagesDir)) {
          fs.mkdirSync(destImagesDir, { recursive: true });
        }

        // 画像ファイルをコピー
        if (fs.existsSync(srcImagesDir)) {
          copyDir(srcImagesDir, destImagesDir);
        }

        console.log('[build] 画像ファイルのコピー完了');
      }
    },
    generateWebPPlugin(), // WebP生成
    replaceImagesWithPictureTag(), // HTML内でWebP反映
    // SCSSパーシャルファイルの変更検知を改善するプラグイン
    {
      name: 'scss-partial-watcher',
      handleHotUpdate({ file, server }) {
        // SCSSファイルが変更された場合
        if (file.endsWith('.scss')) {
          // パーシャルファイル（_から始まるファイル）かどうかを確認
          const isPartial = path.basename(file).startsWith('_');

          if (isPartial) {
            console.log(`[scss-watcher] パーシャルファイルが変更されました: ${file}`);
            // style.scssを含むすべてのSCSSファイルを探して再読み込み
            const mainScssFiles = [
              path.resolve(__dirname, 'src/scss/style.scss')
            ];

            // style.scssファイルを実際に更新して変更を強制する
            try {
              // style.scssファイルの内容を読み込み
              const styleScssPath = path.resolve(__dirname, 'src/scss/style.scss');
              const content = fs.readFileSync(styleScssPath, 'utf8');
              // 同じ内容を書き込み直して更新日時を変更する
              fs.writeFileSync(styleScssPath, content);
              console.log(`[scss-watcher] style.scssファイルを更新しました`);
            } catch (error) {
              console.error(`[scss-watcher] style.scssファイルの更新に失敗しました:`, error);
            }

            // これらのファイルを変更があったと通知
            server.ws.send({
              type: 'update',
              updates: mainScssFiles.map(f => ({
                type: 'js-update',
                path: f,
                acceptedPath: f,
                timestamp: new Date().getTime()
              }))
            });

            // すべてのHTMLファイルに変更を通知して再読み込み
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });

            return []; // 既定のHMRハンドラを使用しない
          }
        }
      }
    },
    // 未使用CSSを削除
    purgecss({
      content: ['./src/**/*.html', './src/**/*.js'],
      safelist: ['html', 'body'],
      variables: true,
    }),
    // HTML出力先を修正するプラグイン
    {
      name: 'modify-html-output',
      enforce: 'post',
      apply: 'build',
      generateBundle(options, bundle) {
        // バンドル内のすべてのアセットを処理
        Object.keys(bundle).forEach(fileName => {
          const asset = bundle[fileName];

          // HTMLファイルを検出
          if (fileName.endsWith('.html') && fileName.includes('pages/')) {
            // 出力先を変更（pages/ファイル名.html → ファイル名.html）
            const newFileName = fileName.replace('pages/', '');
            console.log(`[build] HTML出力先を変更: ${fileName} → ${newFileName}`);

            // 新しいファイル名で同じ内容を追加
            bundle[newFileName] = {
              ...asset,
              fileName: newFileName
            };

            // 元のファイルを削除
            delete bundle[fileName];
          }
        });
      }
    },
    // HTML内の画像パスを自動修正するプラグイン
    fixImagePathsPlugin(),  // 新しいプラグインを追加
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getHtmlFiles(), // HTMLファイルをエントリーポイントとして取得
      output: {
        assetFileNames: `assets/[name]-[hash][extname]`,
        entryFileNames: `assets/[name]-[hash].js`,
        // HTMLファイルの出力パスをカスタマイズ
        chunkFileNames: `assets/[name]-[hash].js`,
      },
    },
    // ソースマップの有効化（デバッグのため）
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [path.resolve(__dirname, "src/scss")],
      },
    },
    // CSSモジュールのハッシュ名を無効化（開発時のデバッグを容易に）
    modules: {
      generateScopedName: '[local]_[hash:base64:5]',
    },
    // ソースマップを有効化
    devSourcemap: true,
    postcss: {
      plugins: [
        autoprefixer({ grid: true }) // ベンダープレフィックスを自動追加
      ]
    }
  },
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: {
      // エイリアスを設定して、インポートパスを簡略化
      '@': path.resolve(__dirname, 'src'),
      '@styles': path.resolve(__dirname, 'src/scss'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@utils': path.resolve(__dirname, 'src/js/utils'),
      '@components': path.resolve(__dirname, 'src/js/components'),
      '@images': path.resolve(__dirname, 'public/images'),
    },
    extensions: [".mjs", ".js", ".json"]
  },
});

// HTMLファイルのパスを収集する補助関数
function getHtmlFiles() {
  const srcDirPath = path.resolve(__dirname, "src");
  const pagesPath = path.resolve(srcDirPath, "pages");
  const htmlFiles = {};
  // ビルド対象から除外するディレクトリ
  const excludeDirs = ['partsHTML'];

  console.log("getHtmlFiles: HTMLファイルを検索します");

  function findHtmlFiles(dir) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => {
      const fullPath = path.join(dir, dirent.name);

      if (dirent.isDirectory() && !excludeDirs.includes(dirent.name)) {
        findHtmlFiles(fullPath);
      } else if (dirent.isFile() && dirent.name.endsWith(".html")) {
        // ページのIDを取得 (ファイル名)
        const id = path.basename(dirent.name, ".html");
        // pagesディレクトリ内のHTMLファイルのパスをカスタマイズ
        if (fullPath.includes(pagesPath)) {
          // pages/example.html → dist/example.html に出力するため、
          // エントリーポイントの相対パスを調整
          const relativePath = path.relative(srcDirPath, fullPath);
          // pages/フォルダ名を除去して、直接ファイル名のみにする
          const outputPath = relativePath.replace('pages/', '');
          htmlFiles[id] = fullPath;
          console.log(`getHtmlFiles: 登録: ${id} -> ${fullPath}`);
        } else {
          // その他のHTMLファイルは通常通り処理
          htmlFiles[id] = fullPath;
          console.log(`getHtmlFiles: 登録: ${id} -> ${fullPath}`);
        }
      }
    });
  }

  // HTMLファイルを検索
  findHtmlFiles(srcDirPath);
  console.log(`getHtmlFiles: 最終エントリーポイント: ${Object.keys(htmlFiles)}`);
  return htmlFiles;
}

// 画像をWebPに変換するプラグイン
function generateWebPPlugin() {
  return {
    name: "generate-webp",
    enforce: "post",
    apply: "build",
    async generateBundle(_, bundle) {
      // 画像ディレクトリのリスト
      const directories = [
        path.resolve(__dirname, "public/images/common"),
        path.resolve(__dirname, "src/assets/images")
      ];
      const imageExtensions = /\.(png|jpe?g)$/i;

      for (const dir of directories) {
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter((file) => imageExtensions.test(file));

        for (const file of files) {
          const filePath = path.join(dir, file);
          // すべての画像を統一して images/ ディレクトリに出力
          const fileName = `images/${file}`;
          console.log(`Processing image: ${fileName}`);

          try {
            const buffer = fs.readFileSync(filePath);
            const webpBuffer = await sharp(buffer).webp({ quality: 75 }).toBuffer();
            const webpFileName = fileName.replace(imageExtensions, ".webp");

            bundle[webpFileName] = {
              type: "asset",
              source: webpBuffer,
              fileName: webpFileName,
            };
            console.log(`Generated WebP: ${webpFileName}`);
          } catch (error) {
            console.error(`Failed to convert ${fileName} to WebP:`, error);
          }
        }
      }
    },
  };
}

// HTML内の<img>を<picture>に変換するプラグイン
function replaceImagesWithPictureTag() {
  return {
    name: "replace-images-with-picture",
    enforce: "post",
    apply: "build",
    transformIndexHtml(html) {
      const imageExtensions = /\.(png|jpe?g)$/i;

      // CSSとJSの参照パスを修正（../assets → ./assets）
      html = html.replace(
        /(href|src)=["']\.\.\/assets\//g,
        '$1="./assets/'
      );

      // assets/images の参照を修正
      html = html.replace(
        /src=["'](\.\/)?assets\/images\/([^"']+)["']/g,
        'src="./images/$2"'
      );

      // 画像パスをすべて ./images/ に統一
      html = html.replace(
        /src=["']([^"']*\/)?images\/([^"']+)["']/g,
        'src="./images/$2"'
      );

      // picture要素に変換
      html = html.replace(
        /<img\s+([^>]*)src=["']\.\/images\/([^"']+\.(png|jpe?g))["']([^>]*)>/gi,
        (match, prefix, imgPath, ext, suffix) => {
          return `
          <picture>
            <source srcset="./images/${imgPath.replace(imageExtensions, ".webp")}" type="image/webp">
            <img ${prefix}src="./images/${imgPath}"${suffix}>
          </picture>
        `;
        }
      );

      return html;
    },
  };
}

// HTML内の画像パスを自動修正するプラグイン
function fixImagePathsPlugin() {
  return {
    name: 'fix-image-paths',
    configureServer(server) {
      // ミドルウェアを追加して画像パスを処理
      server.middlewares.use((req, res, next) => {
        // ./images/ または /images/ で始まるリクエストを処理
        if (req.url && (req.url.includes('/images/') || req.url.includes('./images/'))) {
          const normalizedUrl = req.url.replace('./images/', '/images/');

          // まずsrc/assets/imagesから探す
          const assetPath = path.resolve(__dirname, 'src/assets/images', path.basename(normalizedUrl));
          if (fs.existsSync(assetPath)) {
            console.log(`[image-paths] 画像が見つかりました: ${assetPath}`);
            req.url = `/assets/images/${path.basename(normalizedUrl)}`;
            return next();
          }

          // 見つからなければpublicから探す
          const publicPath = path.resolve(__dirname, 'public/images', path.basename(normalizedUrl));
          if (fs.existsSync(publicPath)) {
            console.log(`[image-paths] 画像が見つかりました: ${publicPath}`);
            req.url = `/images/${path.basename(normalizedUrl)}`;
            return next();
          }
        }
        next();
      });
    },
    transformIndexHtml(html, { filename }) {
      console.log(`[image-paths] HTMLファイルを処理: ${filename}`);

      // すべてのHTMLファイルの画像パスを処理
      // 相対パスの画像を修正
      html = html.replace(
        /<img\s+[^>]*src=["']\.\/images\/([^"']+)["'][^>]*>/gi,
        (match, imgPath) => {
          console.log(`[image-paths] 画像パスを修正: ./images/${imgPath}`);
          // 画像が存在するか確認
          const assetPath = path.resolve(__dirname, `src/assets/images/${imgPath}`);
          const publicPath = path.resolve(__dirname, `public/images/${imgPath}`);
          const exists = fs.existsSync(assetPath) || fs.existsSync(publicPath);

          console.log(`[image-paths] 画像の存在: ${exists ? 'あり' : 'なし'}`);
          return match; // 相対パスの場合はそのまま
        }
      );

      // アセット画像のパスも修正
      html = html.replace(
        /<img\s+[^>]*src=["']\.\.\/assets\/images\/([^"']+)["'][^>]*>/gi,
        (match, imgPath) => {
          return match.replace('../assets/images/', './images/');
        }
      );

      // 絶対パスの画像を相対パスに修正
      html = html.replace(
        /<img\s+[^>]*src=["']\/images\/([^"']+)["'][^>]*>/gi,
        (match, imgPath) => {
          return match.replace('/images/', './images/');
        }
      );

      return html;
    }
  };
}

// ディレクトリを再帰的にコピーする関数
function copyDir(src, dest) {
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // サブディレクトリの場合
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      // ファイルの場合
      fs.copyFileSync(srcPath, destPath);
      console.log(`[build] コピー: ${srcPath} → ${destPath}`);
    }
  }
}
