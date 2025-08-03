const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      'content-scripts/notnot-content': './content-scripts/main.js',
      'popup/popup': './popup/popup.js',
      'sidebar/sidebar': './sidebar/sidebar.js',
      'dashboard/dashboard': './dashboard/dashboard.js',
      'options/options': './options/options.js',
      'background/service-worker': './background/service-worker.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: false // Don't clean dist folder to preserve other assets
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-transform-runtime']
            }
          }
        }
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: true,
              pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : []
            },
            mangle: true,
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ],
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      }
    },
    resolve: {
      extensions: ['.js'],
      alias: {
        '@': path.resolve(__dirname, 'content-scripts')
      }
    },
    devtool: isProduction ? false : 'inline-source-map',
    watch: !isProduction,
    watchOptions: {
      ignored: /node_modules/
    }
  };
};