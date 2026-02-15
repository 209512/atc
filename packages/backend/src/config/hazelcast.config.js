const fs = require('fs');
const path = require('path');

const getHazelcastConfig = (agentIdOrName = 'ATC-Client') => {
  const isLocalEnv = process.env.USE_LOCAL_HZ === 'true';

  const config = {
    clusterName: 'dev', 
    network: {
      connectionTimeout: 10000
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
        key: fs.readFileSync(path.join(__dirname, '../../certs/client-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../../certs/client-cert.pem')),
        ca: fs.readFileSync(path.join(__dirname, '../../certs/ca-cert.pem')),
        rejectUnauthorized: false,
        passphrase: process.env.HAZELCAST_PASSWORD
      }
    };
  } else {
    // 현재 사용자가 타겟팅하는 모드
    console.log('🏠 Connecting to Local/Docker Hazelcast Mode (Target Cluster: atc)...');
    
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