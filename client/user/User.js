"use strict";

/*
    
    User

*/

(class User extends Base {
    initPrototype () {
        this.newSlot("world", null)
        this.newSlot("client", null)
        this.newSlot("userPointer", null)
        this.newSlot("actions", null)
        this.newSlot("actionGroup", null)
        this.newSlot("actionGroups", null)
        this.newSlot("actionOffset", 2) // offset between syncTick actions were sent on, and syncTick they are applied to
        this.newSlot("joinedAtSyncTick", 0) // so we know when it's possible to have input (can't have input prior to joining)
    }

    init () {
        super.init()
        this.setActions([])
        this.setUserPointer(UserPointer.clone().setDelegate(this).setUser(this))
        this.setActionGroups(new Map())
    }

    id () {
        return this.client() ? this.client().distantObjectForProxy().remoteId() : "?"
    }

    shortId () {
        const s = this.id()
        return s.slice(s.length - 3)
    }

    getName () {
        /*
        const hashName = window.location.hash
        if (hashName) {
            return hashName
        }
        */

        const clientIdName = this.id().split("_")[1].substring(0, 3)
        return clientIdName
    }

    setClient (aClient) {
        this._client = aClient

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
        const t = this.world().syncTick() - this.actionOffset() - 5
        this.actionGroups().delete(t)
    }

    /*
    clearOldActioGroups () {
        const old = this.world().syncTick() - this.actionOffset() - 1
        const map = this.actionGroups()
        Array.from(map.keys()).forEach(key => {
            if (key < old) {
                map.delete(key)
            }
        })
    }
    */

    receiveActionGroup (ag) {
        const t = ag.syncTick()
        assert(!this.actionGroups().has(t))
        this.actionGroups().set(t, ag)
        return this
    }

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
        this.receiveActionGroup(ag)
        return this
    }

    sendActionGroup () {
        //  We send T action group but will apply (T - actionOffset) actionGroup
        this.prepareActionGroup()
        const ag = this.currentReceiveActionGroup()
        //console.log("user " + this.shortId() + " sending action group " + this.world().syncTick())
        const rm = RemoteMessage.creationProxy().addActionGroup(ag)
        this.world().channel().asyncRelayMessageFrom(rm, this.client()) //.ignoreResponse()
    }

    onNewUserStateRequest (user) {
        console.log(this.id() + ".onNewUser(" + user.shortId() + ")")
        // send any action groups we have
        //console.log("sending " + this.actionGroups().size + " ag")
        this.actionGroups().forEach(ag => {
            console.log("sending ag " + ag.syncTick() + " for user " + this.shortId() + " to user " + user.shortId())
            const rm = RemoteMessage.creationProxy().addActionGroup(ag)
            const future = user.client().asyncReceiveMessage(rm)
            future.setResponseTarget(this)
            //console.log("future: ", future)
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

    currentReceiveActionGroup () {
        const t = this.world().syncTick()
        return this.actionGroupForTick(t)
    }

    currentApplyActionGroup () {
        const t = this.world().syncTick() - this.actionOffset()
        return this.actionGroupForTick(t)
    }

    canHaveActionGroup () {
        if (this.world().syncTick() > this.joinedAtSyncTick() + this.actionOffset()) {
            return true
        }
    }

    /*
    hasCurrentReceiveActionGroup () {
        return this.currentReceiveActionGroup() !== undefined
    }
    */

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

        if (this.world().syncTick() - this.actionOffset() !== ag.syncTick()) {
            console.warn("syncTicks don't match " + this.world().syncTick() + " !== " + ag.syncTick())
            debugger;
            throw new Error("syncTicks don't match")
            return
        }

        if (hash === null) {
            debugger;
            console.warn("simHash is null")
            throw new Error("simHash is null")
            return
        }

        if (hash !== ag.hash()) {
            console.warn("simHashs don't match local " + hash + " !== other " + ag.hash())
            //throw new Error("simHashs don't match")
            //return
        }

        const actions = ag.actions()
        actions.forEach(rm => rm.sendTo(this))
        this.deleteOldActionGroups()
        //console.log("currently2 " + this.actionGroups().size + " action groups")
    }

    // --- mouse down ---

    /*
    onMouseDown (event) {
        const thing = Thing.clone()
        thing.setPosition(this.userPointer().position())
        thing.pickVelocity()
        const rm = RemoteMessage.creationProxy().addThingString(JSON.stringify(thing.asJson()))
        this.addAction(rm)
        event.stopPropagation()
    }
    */

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

}.initThisClass());

