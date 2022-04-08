/* @flow */

module.exports = {
    'extends': './node_modules/@krakenjs/grumbler-scripts/config/.eslintrc-node.js',
    'rules':   {
        'const-immutable/no-mutation': 'off'
    },
    'globals': {
        'jest':   true,
        'expect': true
    }
};
