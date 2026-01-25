/**
 * Global Constants
 */
module.exports = {
    // Service Timing
    UPDATE_POOL_DELAY: 300,
    HUMAN_OVERRIDE_DELAY: 1000,
    LOCK_TIMEOUT: 5000,
    
    // Hazelcast Maps & Locks
    MAP_AGENT_STATES: 'agent_states',
    MAP_AGENT_STATUS: 'agent_status_map',
    MAP_AGENT_COMMANDS: 'agent_commands',
    MAP_ATC_METADATA: 'atc-metadata',
    LOCK_NAME: 'traffic-control-lock',
    
    // Status & Commands
    ADMIN_FENCE: 'ADMIN-SESSION',
    CMD_PAUSE: 'PAUSE',
    
    // Agent Loop
    AGENT_LOOP_DELAY: 1000,
    AGENT_YIELD_DELAY: 7000,
    AGENT_WORK_STEP_DELAY: 500,
    AGENT_WORK_STEPS: 4,
    
    // Agent Status Strings
    STATUS_GLOBAL_STOP: 'GLOBAL STOP',
    STATUS_PAUSED: 'PAUSED',
    STATUS_WAITING: 'WAITING',
    STATUS_ACTIVE: 'ACTIVE',
    STATUS_IDLE: 'IDLE',
    
    RESOURCE_NONE: 'None'
};
