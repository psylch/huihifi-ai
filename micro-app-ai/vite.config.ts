// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';
// import qiankun from 'vite-plugin-qiankun';
// import { copyFileSync, existsSync, mkdirSync } from 'fs';

// // 微应用名称与主应用注册时保持一致
// const microAppName = 'ai-assistant';
// const useDevMode = process.env.NODE_ENV === 'development';
// const isProduction = process.env.NODE_ENV === 'production';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [
//     // 基础React插件
//     react({
//       // 禁用快速刷新以避免qiankun沙箱冲突
//       babel: {
//         // 添加额外的babel插件
//         plugins: [
//           // 可以添加额外的babel插件处理
//         ]
//       }
//     }),
//     // qiankun插件配置 - 只使用插件支持的标准选项
//     qiankun(microAppName, {
//       useDevMode: !isProduction
//     }),
//     // 自定义插件，将scripts目录复制到构建目录
//     {
//       name: 'copy-scripts',
//       closeBundle() {
//         const srcDir = path.resolve(__dirname, 'scripts');
//         const destDir = path.resolve(__dirname, 'dist/scripts');
        
//         // 创建目录如果不存在
//         if (!existsSync(destDir)) {
//           mkdirSync(destDir, { recursive: true });
//         }
        
//         try {
//           // 复制qiankun-helper.js到构建目录
//           copyFileSync(
//             path.resolve(srcDir, 'qiankun-helper.js'),
//             path.resolve(destDir, 'qiankun-helper.js')
//           );
//           console.log('Successfully copied qiankun-helper.js to dist/scripts');
//         } catch (err) {
//           console.error('Error copying qiankun-helper.js:', err);
//         }
//       }
//     }
//   ],
//   // 开发服务器配置
//   server: {
//     port: 8081,
//     cors: true,
//     origin: 'http://localhost:8081',
//     headers: {
//       // 允许跨域加载JS模块
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       'Access-Control-Allow-Credentials': 'true',
//     },
//     // 支持通过IP访问
//     host: '0.0.0.0',
//     // 预构建优化
//     force: true,
//   },
//   // 路径解析配置
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src')
//     }
//   },
//   // 构建配置
//   build: {
//     outDir: 'dist',
//     sourcemap: !isProduction,
//     // 不再使用lib模式，改为标准模式以支持独立访问
//     rollupOptions: {
//       // 如果需要，可以在这里定义额外的Rollup选项
//       output: {
//         manualChunks: {
//           // 可以自定义代码分割策略
//           vendor: ['react', 'react-dom'],
//         },
//       },
//     },
//   },
//   // 确保在微应用中可以正确引用React和ReactDOM
//   optimizeDeps: {
//     include: ['react', 'react-dom'],
//   },
//   // 定义全局常量
//   define: {
//     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
//   },
// });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// 微应用名称与主应用注册时保持一致
const microAppName = 'ai-assistant';
const isProduction = process.env.NODE_ENV === 'production';

// 生产环境的完整URL
//const PRODUCTION_BASE_URL = 'http://localhost:8081/';
const PRODUCTION_BASE_URL = 'https://ai.huihifi.com/aituning/';

// https://vitejs.dev/config/
export default defineConfig({
  // 重要：设置base路径，确保所有资源都使用绝对路径
  base: isProduction ? PRODUCTION_BASE_URL : '/',
  
  plugins: [
    react(),
    // qiankun插件配置
    qiankun(microAppName, {
      useDevMode: !isProduction,
      // 关键：告诉qiankun插件在生产环境使用我们的URL
      ...(isProduction && { 
        prodPublicPath: PRODUCTION_BASE_URL 
      })
    }),
    // 自定义插件：处理HTML文件中的路径
    {
      name: 'fix-qiankun-paths',
      transformIndexHtml: {
        enforce: 'post',
        transform(html, ctx) {
          if (isProduction) {
            // 确保所有相对路径都被替换为绝对路径
            return html
              .replace(/src="\.\/public-path\.js"/g, `src="${PRODUCTION_BASE_URL}public-path.js"`)
              .replace(/src="\.\/scripts\/qiankun-helper\.js"/g, `src="${PRODUCTION_BASE_URL}scripts/qiankun-helper.js"`)
              .replace(/src="\/main-standalone\.js/g, `src="${PRODUCTION_BASE_URL}main-standalone.js`)
              // 修复import语句
              .replace(/import\('\/assets\//g, `import('${PRODUCTION_BASE_URL}assets/`)
              .replace(/href="\/assets\//g, `href="${PRODUCTION_BASE_URL}assets/`);
          }
          return html;
        }
      }
    },
    // 复制脚本文件
    {
      name: 'copy-scripts',
      closeBundle() {
        const srcDir = path.resolve(__dirname, 'scripts');
        const destDir = path.resolve(__dirname, 'dist/scripts');
        
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        
        try {
          copyFileSync(
            path.resolve(srcDir, 'qiankun-helper.js'),
            path.resolve(destDir, 'qiankun-helper.js')
          );
          console.log('✓ 复制 qiankun-helper.js 成功');
        } catch (err) {
          console.error('✗ 复制 qiankun-helper.js 失败:', err);
        }
      }
    }
  ],
  
  server: {
    port: 8081,
    cors: true,
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: !isProduction,
    rollupOptions: {
      output: {
        // 稳定的文件名，避免hash变化
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // 定义全局变量供public-path.js使用
    '__MICRO_APP_BASE_URL__': JSON.stringify(isProduction ? PRODUCTION_BASE_URL : '/')
  }
});