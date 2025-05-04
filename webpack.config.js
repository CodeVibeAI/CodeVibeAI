/**
 * CodeVibeAI Custom Webpack Configuration
 * Extends Theia's webpack configuration with custom settings for development and production
 */
// @ts-check
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * Return extended webpack config for CodeVibeAI
 * @param {*} config - original config from Theia
 * @param {boolean} isProduction - whether to optimize for production
 * @param {object} options - additional options
 * @returns {*} - extended webpack config
 */
module.exports = (config, isProduction = process.env.NODE_ENV === 'production', options = {}) => {
    const bundleAnalyzer = process.env.ANALYZE_BUNDLE === 'true';
    const devtool = isProduction ? 'source-map' : 'eval-source-map';
    
    // Extend the config for both frontend and backend
    const webConfig = config[0];
    const nodeConfig = config[1];

    // Base extension for all configs
    const baseExtension = {
        mode: isProduction ? 'production' : 'development',
        devtool,
        plugins: [
            new webpack.DefinePlugin({
                'process.env.CODEVIBEAI_VERSION': JSON.stringify(require('./package.json').version),
                'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
            }),
            new CircularDependencyPlugin({
                exclude: /node_modules/,
                failOnError: false,
                allowAsyncCycles: true,
                cwd: process.cwd(),
            }),
        ],
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.svg'],
            alias: {
                '@codevibeai/core': path.resolve(__dirname, 'packages/core/src'),
                '@codevibeai/claude-integration': path.resolve(__dirname, 'packages/claude-integration/src'),
                '@codevibeai/context7-integration': path.resolve(__dirname, 'packages/context7-integration/src'),
                '@codevibeai/ui': path.resolve(__dirname, 'packages/ui/src'),
                '@codevibeai/extension-system': path.resolve(__dirname, 'packages/extension-system/src'),
            }
        },
        optimization: {
            minimize: isProduction,
            minimizer: isProduction ? [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        ecma: 2020,
                        keep_classnames: true,
                        keep_fnames: true,
                    },
                }),
            ] : [],
        },
        stats: {
            warnings: true,
            errors: true,
            errorDetails: true,
        },
    };

    // Apply extensions specifically to the frontend config
    webConfig.mode = baseExtension.mode;
    webConfig.devtool = baseExtension.devtool;
    webConfig.plugins.push(...baseExtension.plugins);
    webConfig.resolve.extensions = [...new Set([...webConfig.resolve.extensions || [], ...baseExtension.resolve.extensions])];
    webConfig.resolve.alias = { ...webConfig.resolve.alias || {}, ...baseExtension.resolve.alias };
    
    if (isProduction) {
        webConfig.optimization = {
            ...webConfig.optimization,
            ...baseExtension.optimization,
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: Infinity,
                minSize: 10000,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name(module) {
                            // Get the package name from the path
                            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                            // Group packages to reduce the number of chunks
                            if (/^@theia/.test(packageName)) {
                                return 'theia-vendor';
                            }
                            if (/^@codevibeai/.test(packageName)) {
                                return 'codevibeai-vendor';
                            }
                            if (/react|redux|mobx/.test(packageName)) {
                                return 'react-vendor';
                            }
                            return 'vendor';
                        },
                    },
                },
            },
        };
        
        // Add compression for production
        webConfig.plugins.push(
            new CompressionPlugin({
                algorithm: 'gzip',
                test: /\.(js|css|html|svg)$/,
                threshold: 10240,
                minRatio: 0.8,
            })
        );
    }

    // Add support for CSS/SCSS modules
    const cssRules = {
        test: /\.s?css$/,
        oneOf: [
            {
                test: /\.module\.s?css$/,
                use: [
                    isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: !isProduction,
                            modules: {
                                localIdentName: isProduction
                                    ? '[hash:base64:8]'
                                    : '[name]__[local]--[hash:base64:5]',
                            },
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: !isProduction,
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                ],
                            },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: !isProduction,
                        },
                    },
                ],
            },
            {
                use: [
                    isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: !isProduction,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: !isProduction,
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                ],
                            },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: !isProduction,
                        },
                    },
                ],
            },
        ],
    };

    // Find existing CSS rule and replace it with our enhanced version
    const cssRuleIndex = webConfig.module.rules.findIndex(rule => 
        rule.test && rule.test.toString().includes('.css'));
    if (cssRuleIndex !== -1) {
        webConfig.module.rules.splice(cssRuleIndex, 1, cssRules);
    } else {
        webConfig.module.rules.push(cssRules);
    }

    // Add SVG support as React components
    webConfig.module.rules.push({
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        use: [
            {
                loader: '@svgr/webpack',
                options: {
                    svgoConfig: {
                        plugins: [
                            {
                                name: 'preset-default',
                                params: {
                                    overrides: {
                                        removeViewBox: false,
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            'url-loader',
        ],
    });

    // Add plugins for both development and production
    webConfig.plugins.push(
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
        }),
        new MiniCssExtractPlugin({
            filename: isProduction ? 'css/[name].[contenthash:8].css' : 'css/[name].css',
            chunkFilename: isProduction ? 'css/[id].[contenthash:8].css' : 'css/[id].css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'resources/icons'),
                    to: 'icons',
                },
                {
                    from: path.resolve(__dirname, 'resources/images'),
                    to: 'images',
                },
            ],
        })
    );

    // Add bundle analyzer in analyze mode
    if (bundleAnalyzer) {
        webConfig.plugins.push(
            new BundleAnalyzerPlugin({
                analyzerMode: 'static',
                reportFilename: 'bundle-report.html',
                openAnalyzer: false,
            })
        );
    }

    // Apply similar extensions to the node config
    nodeConfig.mode = baseExtension.mode;
    nodeConfig.devtool = baseExtension.devtool;
    nodeConfig.plugins.push(...baseExtension.plugins.filter(p => !(p instanceof MiniCssExtractPlugin)));
    nodeConfig.resolve.extensions = [...new Set([...nodeConfig.resolve.extensions || [], ...baseExtension.resolve.extensions])];
    nodeConfig.resolve.alias = { ...nodeConfig.resolve.alias || {}, ...baseExtension.resolve.alias };

    if (isProduction) {
        nodeConfig.optimization = {
            ...nodeConfig.optimization,
            ...baseExtension.optimization,
        };
    }

    return [webConfig, nodeConfig];
};