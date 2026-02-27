// src/core/HazelcastManager.js
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
      console.log('🔌 Initializing Shared Hazelcast Client...');
      const config = getHazelcastConfig('ATC-Admin');
      
      this.client = await Client.newHazelcastClient(config);
      this.cpSubsystem = this.client.getCPSubsystem();
      
      if (typeof this.cpSubsystem.getCPSessionManagementService === 'function') {
        this.sessionService = this.cpSubsystem.getCPSessionManagementService();
      } else {
        this.sessionService = this.cpSubsystem.sessionManagementService || this.cpSubsystem.getCPSessionManager();
      }

      this.map = await this.client.getMap(CONSTANTS.MAP_ATC_METADATA);
      
      this.isInitialized = true;
      console.log('✅ Hazelcast Shared Client & CP Subsystem Ready.');
    } catch (err) {
      console.error('❌ Hazelcast Connection Failed:', err);
      this.isInitialized = false;
      throw err;
    }
  }

  getClient() {
    if (!this.isInitialized) {
      console.warn('⚠️ HazelcastManager accessed before initialization. Call init() first.');
    }
    return this.client;
  }

  getCPSubsystem() {
    if (!this.isInitialized) throw new Error('HazelcastManager not initialized');
    return this.cpSubsystem;
  }

  getSessionService() {
    if (!this.isInitialized) return null;
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
      this.client = null;
      console.log('🔌 Hazelcast Shared Client Disconnected.');
    }
  }
}

module.exports = new HazelcastManager();