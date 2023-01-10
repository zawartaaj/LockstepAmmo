"use strict";

/*
    
    User

*/

(class User extends Serializable {
    initPrototype () {
        this.newSlot("world", null)
        this.newSlot("client", null)
        this.newSlot("userPointer", null)
        this.newSlot("actions", null)
        this.newSlot("actionGroup", null)
        this.newSerializableSlot("id", "?") 
        this.newSlot("actionGroups", null)
        this.newSlot("joinedAtSyncTick", 0) // so we know when it's possible to have input (can't have input prior to joining)
        this.newSlot("hasState", false) // so we know when we can start sending it actions
    }

    init () {
        super.init()
        this.setActions([])
        this.setUserPointer(UserPointer.clone().setDelegate(this).setUser(this))
        this.setActionGroups(new Map())
    }

    isLocal () {
        return this.world().localUser() === this
    }

    shortId () {
        const s = this.id()
        const short = s.slice(s.length - 3)
        const tag = this.isLocal() ? "local" : ""
        return tag + "usr" + short
    }

    getName () {
        return this.id().split("_")[1].substring(0, 3)
    }

    setClient (aClient) {
        this._client = aClient
        this.setId(aClient.distantObjectForProxy().remoteId())

        this.userPointer().view().setName(this.getName())
        return this
    }

    shortDescription () {
        return this.type() + "_" + this.id()
    }

    addAction (anAction) {
        this.actions().push(anAction)
        return this
    }

    // --- actions groups ---

    
    deleteOldActionGroups () {
        const t = this.world().syncTick() - this.world().actionOffset() - 2
        const ags = this.actionGroups()
        const ag = ags.get(t)
        if (ag) {
            this.debugLog("-- deleted " + ag.shortId() + " ")
            this.actionGroups().delete(t)
        }
    }
    
    /*
    deleteOldActionGroups () {
        const old = this.world().syncTick() - this.world().actionOffset() - 1
        const map = this.actionGroups()
        Array.from(map.keys()).forEach(key => {
            if (key < old) {
                map.delete(key)
            }
        })
    }
    */

    actionGroupForTick (tick) {
        return this.actionGroups().get(tick)
    }

    prepareActionGroup () {
        const hash = this.world().currentSimHash()
        const ag = ActionGroup.clone()
        ag.setClientId(this.id())
        ag.setSyncTick(this.world().syncTick())
        ag.setHash(hash)
        ag.setActions(this.actions())
        this.setActions([])
        return ag
    }

    currentSendActionGroup () {
        const t = this.world().syncTick()
        return this.actionGroupForTick(t)
    }

    sendActionGroup () {
        //  We send T action group but will apply (T - actionOffset) actionGroup
        const ag = this.prepareActionGroup()
        this.receiveActionGroup(ag)
        //this.debugLog(">> sent " + ag.shortId())
        //const ag = this.currentSendActionGroup()
        //if (this.world().users().length > 1) {
        //}
        const rm = RemoteMessage.creationProxy().addActionGroup(ag)
        this.world().channel().asyncRelayMessageFrom(rm, this.client()) //.ignoreResponse()
        assert (this.actionGroups().has(this.world().syncTick()))

    }

    receiveActionGroup (ag) {
        if (!this.isLocal()) {
            this.debugLog("<< received " + ag.shortId())
        }
        const t = ag.syncTick()
        //assert(!this.actionGroups().has(t)) // it might have it after setState
        if (this.actionGroups().has(t)) {
      //      debugger;
        }
        this.actionGroups().set(t, ag)
        this.debugLog(this.summary())
        return this
    }

    onNewUserStateRequest (user) {
        this.debugLog(".onNewUser(" + user.shortId() + ")")
        // send any action groups we have
        //this.debugLog("sending " + this.actionGroups().size + " ag")
        this.actionGroups().forEach(ag => {
            this.debugLog("   >> sending " + ag.shortId() + " to " + user.shortId())
            const rm = RemoteMessage.creationProxy().addActionGroup(ag)
            const future = user.client().asyncReceiveMessage(rm)
            future.setResponseTarget(this)
            //this.debugLog("future: ", future)
        })
        this.sharePosition()
    }

    onComplete_addActionGroup (future) {
        debugger
    }

    onError_addActionGroup (future) {
        debugger

    }

    onTimeout_addActionGroup (future) {
        debugger
    }

    hasActionGroup () {
        return this.currentApplyActionGroup() !== undefined
    }

    currentApplySyncTick () {
        return this.world().currentApplySyncTick()
    }

    currentApplyActionGroup () {
        return this.actionGroupForTick(this.currentApplySyncTick())
    }

    canHaveActionGroup () {
        if (!this.hasState()) {
            return false
        }

        if (this.world().syncTick() > this.joinedAtSyncTick() + this.world().actionOffset()) {
            return true
        }
        return false
    }

    canHaveLocalUserActionGroup () {
        if (this.world().syncTick() > this.world().localUser().joinedAtSyncTick() + this.world().actionOffset()) {
            return true
        }
        return false
    }

    applyActionGroup () {
        if (!this.world().isRunning()) {
            return
        }

        if (!this.canHaveActionGroup()) {
            // skip if we couldn't have inputs yet
            return
        }

        const ag = this.currentApplyActionGroup()
        assert(ag)
        const hash = this.world().applySimHash()

        if (this.canHaveLocalUserActionGroup()) {
            assert(this.currentApplySyncTick() === ag.syncTick())

            if (hash === null || hash === undefined) {
                console.warn("local simHash is missing (" + hash + ") for syncTick " + ag.syncTick())
                console.warn("              syncTick:" + this.world().syncTick())
                console.warn("  currentApplySyncTick:" + this.currentApplySyncTick())
                console.warn("      joinedAtSyncTick:" + this.joinedAtSyncTick())
                debugger;
                this.world().applySimHash()
                throw new Error("simHash is missing")
            }
        }

        if (hash !== ag.hash()) {
            this.debugLog("ERROR: simHashes don't match on tick " + this.world().syncTick() + " local " + hash + " !== other " + ag.hash())
            //throw new Error("simHashes don't match")
          //  debugger;
        }

        const actions = ag.actions()
        actions.forEach(rm => rm.sendTo(this))
        this.deleteOldActionGroups()
        this.debugLog("currently " + this.actionGroups().size + " action groups")
    }

    // --- mouse down ---

    onMouseDown (event) {
        const thing = BoxThing.clone().setSimEngine(this.world().simEngine())
        thing.pickDimensions()
        thing.setup()
        thing.pickPosition()

        const rm = RemoteMessage.creationProxy().addThingString(JSON.stringify(thing.asJson()))
        this.addAction(rm)
        event.stopPropagation()
    }

    onRemoteMessage_addThingString (s) {
        const json = JSON.parse(s)
        const thing = BoxThing.clone().setSimEngine(this.world().simEngine())
        thing.fromJson(json, this.world().connection())
        
        // need to read dimensions before creating shape
        // need to create body, before setting it's pos, rot, vel, rotVel

        this.world().simEngine().scheduleAddThing(thing)
    }

    // --- mouse move ---

    onMouseMove (event) {

    }

    timeStep () {
        this.userPointer().timeStep()
    }

    onSyncTick () {
        this.userPointer().onSyncTick()
    }

    sharePosition () {
        this.userPointer().sharePosition()
    }

    willDestroy () {
        this.userPointer().willDestroy()
    }

    debugLog (s) {
        console.log("t" + this.world().syncTick() + " " + this.type() + " " + s)
    }

    summary () {
        let s = " " + this.shortId() + " "
        s += " joined: " + this.joinedAtSyncTick()
        s += " canHaveAgs: " + this.canHaveActionGroup()
        s += " ags: " + JSON.stringify(Array.from(this.actionGroups().keys())) 
        return s
    }

}.initThisClass());

