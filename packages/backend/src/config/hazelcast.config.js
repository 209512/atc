// src/config/hazelcast.config.js
const fs = require('fs');
const path = require('path');

const getHazelcastConfig = (agentIdOrName = 'ATC-Client') => {
  const isLocalEnv = process.env.USE_LOCAL_HZ === 'true';

  const config = {
    clusterName: process.env.HZ_CLUSTER_NAME || 'dev', 
    network: {
      connectionTimeout: 10000
    },
    properties: {
      'hazelcast.client.heartbeat.interval': 5000,
      'hazelcast.client.heartbeat.timeout': 60000,
      'hazelcast.client.invocation.timeout.millis': 120000,
      'hazelcast.client.cloud.url': 'https://api.viridian.hazelcast.com'
    },
    connectionStrategy: {
        reconnectMode: 'ON',
        connectionRetry: {
            initialBackoffMillis: 1000,
            maxBackoffMillis: 30000,
            multiplier: 2,
            clusterConnectTimeoutMillis: -1 
        }
    }
  };

  if (!isLocalEnv && process.env.HAZELCAST_DISCOVERY_TOKEN) {
    console.log('🔗 Connecting to Hazelcast Cloud Mode...');
    config.network.hazelcastCloud = {
      discoveryToken: process.env.HAZELCAST_DISCOVERY_TOKEN
    };
    config.network.ssl = {
      enabled: true,
      sslOptions: {
        key: fs.readFileSync(process.env.HZ_CERT_KEY_PATH || path.join(__dirname, '../../certs/client-key.pem')),
        cert: fs.readFileSync(process.env.HZ_CERT_PATH || path.join(__dirname, '../../certs/client-cert.pem')),
        ca: fs.readFileSync(process.env.HZ_CA_PATH || path.join(__dirname, '../../certs/ca-cert.pem')),
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        passphrase: process.env.HAZELCAST_PASSWORD
      }
    };
  } else {
    console.log('🏠 Connecting to Local/Docker Hazelcast Mode...');
    
    config.network.clusterMembers = [
      process.env.HZ_ADDRESS || 'hazelcast:5701'
    ];
    
    config.network.ssl = {
      enabled: false
    };
  }

  return config;
};

module.exports = getHazelcastConfig;