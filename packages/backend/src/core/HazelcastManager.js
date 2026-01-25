const { Client } = require('hazelcast-client');
const getHazelcastConfig = require('../config/hazelcast.config');
const CONSTANTS = require('../config/constants');

class HazelcastManager {
  constructor() {
    this.client = null;
    this.cpSubsystem = null;
    this.sessionService = null;
    this.map = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      console.log('🔌 Connecting to Hazelcast Cloud...');
      const config = getHazelcastConfig('ATC-Admin');
      
      this.client = await Client.newHazelcastClient(config);
      this.cpSubsystem = this.client.getCPSubsystem();
      
      // Access Session Management Service (Safe check for v5.3+)
      if (typeof this.cpSubsystem.getCPSessionManagementService === 'function') {
        this.sessionService = this.cpSubsystem.getCPSessionManagementService();
      } else {
        // Fallback for different minor versions
        this.sessionService = this.cpSubsystem.sessionManagementService || this.cpSubsystem.getCPSessionManager();
      }

      this.map = await this.client.getMap(CONSTANTS.MAP_ATC_METADATA);
      
      this.isInitialized = true;
      console.log('✅ Hazelcast Admin Connected & CP Subsystem Ready.');
    } catch (err) {
      console.error('❌ Hazelcast Connection Failed:', err);
      throw err;
    }
  }

  getClient() {
    if (!this.isInitialized) throw new Error('HazelcastManager not initialized');
    return this.client;
  }

  getCPSubsystem() {
    if (!this.isInitialized) throw new Error('HazelcastManager not initialized');
    return this.cpSubsystem;
  }

  getSessionService() {
    return this.sessionService;
  }

  async getMetadataMap() {
    if (!this.isInitialized) throw new Error('HazelcastManager not initialized');
    return this.map;
  }

  async shutdown() {
    if (this.client) {
      await this.client.shutdown();
      this.isInitialized = false;
      console.log('🔌 Hazelcast Disconnected.');
    }
  }
}

module.exports = new HazelcastManager();
