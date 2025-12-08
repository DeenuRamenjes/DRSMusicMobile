module.exports = {
    dependencies: {
        'react-native-vector-icons': {
            platforms: {
                ios: null, // Disable automatic linking for iOS since we're not targeting it
            },
        },
    },
    assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
