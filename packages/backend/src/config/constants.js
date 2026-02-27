// src/config/constants.js
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
    
    // Agent Loop & Timing
    AGENT_LOOP_DELAY: 1000,
    AGENT_YIELD_DELAY: 7000,
    AGENT_WORK_STEP_DELAY: 500,
    AGENT_WORK_STEPS: 4,
    MAX_AGENT_COUNT: 10,           
    MAX_CANDIDATE_NUMBER: 100,
    
    // 상세 제어 및 타임아웃
    TRANSFER_STABILIZATION: 2000, 
    PRIORITY_RANK_DELAY: 200,      
    NORMAL_BASE_DELAY: 500,        
    LOCK_TRY_WAIT_TARGET: 1000,   
    LOCK_TRY_WAIT_NORMAL: 200,    
    TRANSFER_TIMEOUT: 8000,
    
    // 안정성 및 백오프
    MIN_BACKOFF_DELAY: 1000,       
    MAX_BACKOFF_DELAY: 30000,      
    
    // Agent Status Strings
    STATUS_GLOBAL_STOP: 'GLOBAL STOP',
    STATUS_PAUSED: 'PAUSED',
    STATUS_WAITING: 'WAITING',
    STATUS_ACTIVE: 'ACTIVE',
    STATUS_IDLE: 'IDLE',
    
    RESOURCE_NONE: 'None'
};