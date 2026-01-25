/**
 * Hazelcast Configuration Module - Node.js Client Version
 */
const fs = require('fs');
const path = require('path');

const getHazelcastConfig = (agentIdOrName = 'ATC-Client') => {
  return {
    clusterName: 'atc',
    instanceName: agentIdOrName,
    network: {
      hazelcastCloud: {
        discoveryToken: process.env.HAZELCAST_DISCOVERY_TOKEN || 'TM8xTl9BXmJxk7ytHDpf8ONpqLNYBVteCEocBAuvNskVtv4MUx'
      },
      ssl: {
        enabled: true,
        sslOptions: {
          key: fs.readFileSync(path.join(__dirname, '../../certs/client-key.pem')),
          cert: fs.readFileSync(path.join(__dirname, '../../certs/client-cert.pem')),
          ca: fs.readFileSync(path.join(__dirname, '../../certs/ca-cert.pem')),
          rejectUnauthorized: false,
          passphrase: process.env.HAZELCAST_PASSWORD || '7a0846ec34c'
        }
      }
    },
    connectionStrategy: {
      connectionRetry: {
        clusterConnectTimeoutMillis: 30000,
        maxBackoffMillis: 5000
      }
    }
  };
};

module.exports = getHazelcastConfig;
