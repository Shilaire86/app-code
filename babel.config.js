module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['transform-define', {
                'import.meta.env': 'process.env',
            }]
        ],
    };
};
