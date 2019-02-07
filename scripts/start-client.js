const webpack = require('webpack');
const rimraf = require('rimraf');
const express = require('express');
const path = require('path');
const webpackConfig = require('../config/webpack.config.js')(process.env.NODE_ENV || 'development');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const paths = require('../config/paths');
const { logMessage, compilerPromise } = require('./utils');

const app = express();

const PORT = process.env.PORT || 8500;

const DEVSERVER_HOST = process.env.DEVSERVER_HOST || 'http://localhost';

const start = async () => {
    rimraf.sync(paths.clientBuild);
    rimraf.sync(paths.serverBuild);

    const [clientConfig] = webpackConfig;
    clientConfig.entry.bundle = [
        `webpack-hot-middleware/client?path=${DEVSERVER_HOST}:${PORT}/__webpack_hmr`,
        ...clientConfig.entry.bundle,
    ];

    clientConfig.output.hotUpdateMainFilename = 'updates/[hash].hot-update.json';
    clientConfig.output.hotUpdateChunkFilename = 'updates/[id].[hash].hot-update.js';

    const webpackCompiler = webpack([clientConfig]);
    const clientCompiler = webpackCompiler.compilers.find((compiler) => compiler.name === 'client');
    const clientPromise = compilerPromise('client', clientCompiler);

    const watchOptions = {
        ignored: /node_modules/,
        stats: clientConfig.stats,
    };

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        return next();
    });

    app.use(
        webpackDevMiddleware(clientCompiler, {
            publicPath: clientConfig.output.publicPath,
            stats: clientConfig.stats,
            watchOptions,
        })
    );

    app.use(webpackHotMiddleware(clientCompiler));

    app.use('/', express.static(path.join(paths.clientBuild, paths.publicPath)));

    app.listen(PORT);

    // wait until client and server is compiled
    try {
        await clientPromise;
    } catch (error) {
        logMessage(error, 'error');
    }
};

start();
