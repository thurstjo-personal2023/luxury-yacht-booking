const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'my-ey-data-connect',
  location: 'asia-south1'
};
exports.connectorConfig = connectorConfig;

