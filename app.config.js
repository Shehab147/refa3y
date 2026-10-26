module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapPlugin = googleMapsApiKey
    ? [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: googleMapsApiKey,
        },
      ]
    : 'react-native-maps';

  return {
    ...config,
    plugins: [...(config.plugins ?? []), mapPlugin],
  };
};
