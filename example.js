const DreamixLog = require('./index');

const logger = DreamixLog.getLogger('tests', __filename);

DreamixLog.configure({
    appenders: {
        console: { type: 'console' },
        tests: {
            type: 'file',
            filename: 'logs/tests.log', // eslint-disable-line
            layout: {
                type: 'coloured'
            }
        }
    },
    categories: {
        default: { appenders: ['console'], level: 'info' },
        tests: { appenders: ['tests'], level: 'debug' }
    },
    replaceConsole: true,
    rawMessage: false,
    lineDebug: true
});

// logger.level = 'debug';
logger.debug('debug');
logger.info('test-info');
logger.warn('test-warn');
logger.error('test-error %j abc=%j', { a: 123, b: 456 }, [1, 2, 3, 4, 5, 6]);
