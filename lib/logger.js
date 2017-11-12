/**
 *Intro:
 *Author:shine
 *Date:2017/11/11
 */

const log4js = require('log4js');
const fs = require('fs');

function getLine() {
    const e = new Error();
    // now magic will happen: get line number from callstack
    return e.stack.split('\n')[3].split(':')[1];
}


function getLogger(categoryName, ...args) {
    let prefix = '';
    for (let i = 0; i < args.length; i++) {
        if (i !== args.length - 1) {
            prefix = `${prefix + args[i]}] [`;
        } else {
            prefix += args[i];
        }
    }
    if (typeof categoryName === 'string') {
        // category name is __filename then cut the prefix path
        categoryName = categoryName.replace(process.cwd(), '');
    }
    const logger = log4js.getLogger(categoryName);
    const pLogger = {};
    for (const key in logger) {
        if (logger.hasOwnProperty(key)) {
            pLogger[key] = logger[key];
        }
    }

    ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach((item) => {
        pLogger[item] = (...args2) => {
            let p = '';
            if (!process.env.RAW_MESSAGE) {
                if (args.length > 0) {
                    p = `[${prefix}] `;
                }
                if (item === 'debug' || item === 'error') {
                    if (args.length > 0 && process.env.LOGGER_LINE) {
                        p += `line${getLine()} `;
                    }
                }
            }
            if (args2.length) {
                args2[0] = p + args2[0];
            }

            logger[item](...args2);
        };
    });
    return pLogger;
}

function doEnv(name) {
    return process.env[name];
}

function doArgs(name) {
    return process.argv[name];
}

function doOpts(name, opts) {
    return opts ? opts[name] : undefined;
}

const funcs = {
    env: doEnv,
    args: doArgs,
    opts: doOpts
};

function doReplace(src, opts) {
    if (!src) {
        return src;
    }

    const ptn = /\$\{(.*?)\}/g;
    let m;
    let pro;
    let ts;
    let scope;
    let name;
    let defaultValue;
    let func;
    let res = '';
    let lastIndex = 0;
    m = ptn.exec(src);
    while (m) {
        pro = m[1];
        ts = pro.split(':');
        if (ts.length !== 2 && ts.length !== 3) {
            res += pro;
        } else {
            scope = ts[0];
            name = ts[1];
            if (ts.length === 3) {
                defaultValue = ts[2];
            }

            func = funcs[scope];
            if (!func || typeof func !== 'function') {
                res += pro;
            } else {
                res += src.substring(lastIndex, m.index);
                lastIndex = ptn.lastIndex;
                res += (func(name, opts) || defaultValue);
            }
        }
        m = ptn.exec(src);
    }

    if (lastIndex < src.length) {
        res += src.substring(lastIndex);
    }
    return res;
}


function replaceProperties(configObj, opts) {
    if (configObj instanceof Array) {
        for (let i = 0, l = configObj.length; i < l; i++) {
            configObj[i] = replaceProperties(configObj[i], opts);
        }
    } else if (typeof configObj === 'object') {
        let field;
        for (const f in configObj) {
            if (configObj.hasOwnProperty(f)) {
                field = configObj[f];
                if (typeof field === 'string') {
                    configObj[f] = doReplace(field, opts);
                } else if (typeof field === 'object') {
                    configObj[f] = replaceProperties(field, opts);
                }
            }
        }
    }

    return configObj;
}

function loadConfigurationFile(filename) {
    if (filename) {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
    return undefined;
}

/**
 * Configure the logger.
 * Configure file just like log4js.json. And support ${scope:arg-name} format property setting.
 * It can replace the placeholder in runtime.
 * scope can be:
 *     env: environment variables, such as: env:PATH
 *     args: command line arguments, such as: args:1
 *     opts: key/value from opts argument of configure function
 *
 * @param  {String|Object} config configure file name or configure object
 * @param  {Object} opts   options
 */

function configure(config, opts) {
    config = config || process.env.LOG4JS_CONFIG;
    opts = opts || {};

    if (typeof config === 'string') {
        config = loadConfigurationFile(config);
    }

    if (config) {
        config = replaceProperties(config, opts);
    }

    if (config && config.lineDebug) {
        process.env.LOGGER_LINE = true;
    }

    if (config && config.rawMessage) {
        process.env.RAW_MESSAGE = true;
    }
    // config object could not turn on the auto reload configure file in log4js
    log4js.configure(config, opts);
}


module.exports = {
    getLogger: getLogger,
    getDefaultLogger: log4js.getDefaultLogger,
    configure: configure,
    levels: log4js.levels,
    setGlobalLogLevel: log4js.setGlobalLogLevel,

    layouts: log4js.layouts,
    appenders: log4js.appenders
};
