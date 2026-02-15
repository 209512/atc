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
    
    // Agent Loop & Timing
    AGENT_LOOP_DELAY: 1000,
    AGENT_YIELD_DELAY: 7000,
    AGENT_WORK_STEP_DELAY: 500,
    AGENT_WORK_STEPS: 4,
    
    // 상세 제어
    TRANSFER_STABILIZATION: 2000, // 이양 후 최소 점유 보장 시간
    PRIORITY_RANK_DELAY: 150,     // 우선순위 에이전트 순위별 지연(ms)
    NORMAL_BASE_DELAY: 250,       // 일반 에이전트 기본 대기 계수
    LOCK_TRY_WAIT_TARGET: 10000,  // 이양 대상자 락 시도 타임아웃
    LOCK_TRY_WAIT_NORMAL: 2000,   // 일반 에이전트 락 시도 타임아웃
    
    // Agent Status Strings
    STATUS_GLOBAL_STOP: 'GLOBAL STOP',
    STATUS_PAUSED: 'PAUSED',
    STATUS_WAITING: 'WAITING',
    STATUS_ACTIVE: 'ACTIVE',
    STATUS_IDLE: 'IDLE',
    
    RESOURCE_NONE: 'None'
};