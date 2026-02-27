// src/core/LockDirector.js
const hazelcastManager = require('./HazelcastManager');
const CONSTANTS = require('../config/constants');

class LockDirector {
    constructor(atcService) {
        this.atcService = atcService;
        this.transferTimeoutRef = null;
    }

    refreshResourceId() {
        this.atcService.state.resourceId = `${CONSTANTS.LOCK_NAME}-${Date.now()}`;
        console.log(`🔄 [Director] Resource ID Refreshed: ${this.atcService.state.resourceId}`);
    }

    async humanOverride() {
        console.log('🚨 [Admin] Initiating Emergency Administrative Override...');
        this.atcService.state.overrideSignal = true;
        this.atcService.state.forcedCandidate = null; 
        this.atcService.state.holder = 'Human (Admin)';
        
        this.atcService.emitState();

        try {
            const cp = hazelcastManager.getClient().getCPSubsystem();
            const lock = await cp.getLock(this.atcService.state.resourceId);
            await lock.unlock().catch(() => {}); 
        } catch (e) {
            console.error('Director: Human override unlock failed', e.message);
        }
        
        return { success: true };
    }

    async releaseHumanLock() {
        console.log('🔓 [Admin] Releasing Control...');
        
        this.atcService.state.overrideSignal = false;
        this.atcService.state.holder = null;
        this.atcService.state.fencingToken = null;
        this.atcService.state.forcedCandidate = null;

        try {
            const cp = hazelcastManager.getClient().getCPSubsystem();
            const lock = await cp.getLock(this.atcService.state.resourceId);
            await lock.unlock().catch(() => {});
        } catch (e) {}

        this.refreshResourceId();

        console.log('✅ [Admin] System Reset Complete. Resuming Agent activity.');
        this.atcService.emitState();
        return { success: true };
    }

    async transferLock(targetId) {
        if (this.atcService.state.forcedCandidate) {
            console.warn(`⚠️ [Director] Transfer already in progress for ${this.atcService.state.forcedCandidate}.`);
            return { success: false, error: 'Transfer in progress' };
        }

        const isPaused = await this.atcService.isAgentPaused(targetId);
        if (isPaused) {
            return { success: false, error: 'Target agent is paused' };
        }
        
        if (this.transferTimeoutRef) {
            clearTimeout(this.transferTimeoutRef);
        }

        const displayId = decodeURIComponent(targetId);
        console.log(`⚡ [Director] Initiating Fast-Transfer to ${displayId}...`);
        
        this.atcService.state.overrideSignal = false;
        this.atcService.state.forcedCandidate = targetId;
        this.atcService.state.holder = null; 

        const oldResourceId = this.atcService.state.resourceId;
        this.refreshResourceId();
        
        this.atcService.emitState(); 

        try {
            const cp = hazelcastManager.getClient().getCPSubsystem();
            const oldLock = await cp.getLock(oldResourceId);
            await oldLock.unlock().catch(() => {}); 
        } catch (e) {}

        this.transferTimeoutRef = setTimeout(() => {
            if (this.atcService.state.forcedCandidate === targetId) {
                console.warn(`⚠️ [Director] TRANSFER TIMEOUT - ${displayId} failed to grab the lock.`); 
                this.atcService.state.forcedCandidate = null;
                this.atcService.state.holder = null;
                this.refreshResourceId();
                this.atcService.emitState();
            }
        }, CONSTANTS.TRANSFER_TIMEOUT);
        
        return { success: true };
    }
}

module.exports = LockDirector;