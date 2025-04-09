import { defineConfig } from "vite";
import sassGlobImports from "vite-plugin-sass-glob-import";
import viteImagemin from "vite-plugin-imagemin";
import handlebars from "vite-plugin-handlebars";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import autoprefixer from "autoprefixer";
import { VitePluginPurgecss as purgecss } from "vite-plugin-purgecss";

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
    handlebars({
      partialDirectory: path.resolve(__dirname, 'src/partsHTML'),
    }),
    viteImagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 70 },
      pngquant: { quality: [0.6, 0.8], speed: 4 },
      webp: { quality: 75 },
      svgo: { plugins: [{ removeViewBox: false }] },
    }),
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
            const htmlFiles = getHtmlFilePaths();
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
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: getHtmlFiles(), // HTMLファイルをエントリーポイントとして取得
      output: {
        assetFileNames: `assets/[name]-[hash][extname]`,
        entryFileNames: `assets/[name]-[hash].js`,
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
    },
    extensions: [".mjs", ".js", ".json"]
  },
});

// HTMLファイルのパスを収集する補助関数
function getHtmlFilePaths() {
  const srcDirPath = path.resolve(__dirname, "src");
  const pagesPath = path.resolve(srcDirPath, "pages");
  const result = [];

  function findHtmlFiles(dir) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => {
      const fullPath = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        findHtmlFiles(fullPath);
      } else if (dirent.isFile() && dirent.name.endsWith(".html")) {
        result.push(fullPath);
      }
    });
  }

  findHtmlFiles(srcDirPath);
  return result;
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
          // 出力パスを決定（ディレクトリ構造を保持）
          const isPublicDir = dir.includes("public");
          const relativeDir = isPublicDir ? "images/common" : "assets/images";
          const fileName = `${relativeDir}/${file}`;
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

      return html.replace(
        /<img\s+[^>]*src=["']([^"']+\.(png|jpe?g))["'][^>]*>/gi,
        (match, src) => `
          <picture>
            <source srcset="${src.replace(imageExtensions, ".webp")}" type="image/webp">
            ${match}
          </picture>
        `
      );
    },
  };
}

// HTMLファイルの動的取得
function getHtmlFiles() {
  const htmlFiles = {};
  const srcDirPath = path.resolve(__dirname, "src");
  const pagesPath = path.resolve(srcDirPath, "pages");
  // ビルド対象から除外するディレクトリ
  const excludeDirs = ['partsHTML'];

  console.log('getHtmlFiles: HTMLファイルを検索します');

  // ページディレクトリを探索してHTMLファイルを収集
  function findHtmlFiles(dir, basePath = "") {
    if (!fs.existsSync(dir)) return;

    // ディレクトリ名を取得
    const dirName = path.basename(dir);

    // 除外リストにあるディレクトリならスキップ
    if (excludeDirs.includes(dirName)) {
      console.log(`getHtmlFiles: 除外ディレクトリのためスキップします: ${dir}`);
      return;
    }

    fs.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => {
      const fullPath = path.join(dir, dirent.name);
      const relativePath = path.join(basePath, dirent.name);

      if (dirent.isDirectory()) {
        // 再帰的に探索（除外ディレクトリでない場合）
        if (!excludeDirs.includes(dirent.name)) {
          findHtmlFiles(fullPath, relativePath);
        } else {
          console.log(`getHtmlFiles: 除外ディレクトリのためスキップします: ${fullPath}`);
        }
      } else if (dirent.isFile() && dirent.name.endsWith(".html")) {
        // pagesディレクトリ内のHTMLファイルの場合
        if (dir.includes('pages')) {
          // index.htmlは特別扱い - ルートとpages/両方に登録
          if (dirent.name === 'index.html') {
            htmlFiles['index'] = path.resolve(dir, dirent.name);
            console.log(`getHtmlFiles: 登録: index -> ${path.resolve(dir, dirent.name)}`);
          }

          // 通常のページファイル
          const name = relativePath.replace(".html", "").replace(/\//g, "-");
          const pagePath = path.resolve(dir, dirent.name);
          htmlFiles[name] = pagePath;
          console.log(`getHtmlFiles: 登録: ${name} -> ${pagePath}`);
        } else {
          // pages以外のディレクトリ（partsHTMLは既にスキップされている）
          const name = `${path.relative(srcDirPath, dir).replace(/\//g, "-")}-${dirent.name.replace(".html", "")}`;
          htmlFiles[name] = path.resolve(dir, dirent.name);
          console.log(`getHtmlFiles: 登録: ${name} -> ${path.resolve(dir, dirent.name)}`);
        }
      }
    });
  }

  // pagesディレクトリを検索
  findHtmlFiles(pagesPath, "");

  // 他のHTMLファイル（partsHTML以外）も検索
  fs.readdirSync(srcDirPath, { withFileTypes: true }).forEach((dirent) => {
    if (dirent.isDirectory() && dirent.name !== 'pages' && !excludeDirs.includes(dirent.name)) {
      const dirPath = path.join(srcDirPath, dirent.name);
      findHtmlFiles(dirPath, dirent.name);
    }
  });

  console.log('getHtmlFiles: 最終エントリーポイント:', Object.keys(htmlFiles));
  return htmlFiles;
}
