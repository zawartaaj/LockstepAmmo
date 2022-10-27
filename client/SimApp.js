"use strict";

/*


*/

(class SimApp extends Base {
    static launch () {
        getGlobalThis().app = this.clone()
        SimEngine.load(() => app.run())
    }

    initPrototype () {
        this.newSlot("simEngine", null)

        this.newSlot("isRunning", false)
        this.newSlot("isInTimeStep", false)

        // sim tick
        this.newSlot("lastSimTickDate", 0)
        this.newSlot("simTick", 0)
        this.newSlot("syncTick", 0)
        //this.newSlot("simTicksPerSyncTick", 10)
        this.newSlot("syncsPerSecond", 10) // must be smaller than fps
        this.newSlot("fps", 60) // desired frames per second, which currently equals the simTicks per second

        /*
        // things 
        this.newSlot("things", null)
        this.newSlot("thingsToAdd", null)
        this.newSlot("thingsToRemove", null)
        */

        // ui
        this.newSlot("element", null)
        //this.newSlot("statusElement", null)

        // connection
        this.newSlot("connection", null)
        this.newSlot("relayClient", null)
        this.newSlot("channel", null)
        //this.newSlot("clientsSet", null)

        // sim hash
        this.newSlot("simHashes", null) // time to simHash map 

        this.newSlot("rng", null) // RandomNumberGenerator

        // users
        this.newSlot("localUser", null) // User
        this.newSlot("users", null) // Array
        this.newSlot("usersToAdd", null) // Array
        //this.newSlot("usersToRemove", []) // Array
        this.newSlot("usersTimeout", null)  // timeout id
        this.newSlot("isWaitingForUserActions", false) // Boolean

        this.newSlot("stateRequestQueue", null) // Array of user ids
    }

    simTicksPerSyncTick () {
        return Math.ceil(this.fps()/this.syncsPerSecond())
    }

    init () {
        super.init()

        this.setIsDebugging(true)
        // things
        this.setSimHashes(new Map())
        /*
        this.setThings([]) // use an array to keep order the same across clients - not sure if this is necessary as Set may have consistent ordering
        this.setThingsToAdd([])
        this.setThingsToRemove([])
        */

        this.setRng(RandomNumberGenerator.clone())

        // users
        this.setLocalUser(User.clone().setWorld(this))
        this.setUsers([])
        this.setUsersToAdd([])
        //this.setUsersToRemove([])
        this.addUser(this.localUser())
        this.setElement(document.body)
        this.localUser().userPointer().setElement(this.element()).startListening()
        this.setStateRequestQueue([])
    }

    addUser (aUser) {
        this.users().push(aUser)
        this.sortUsers()
        return this
    }

    sortUsers () {
        // is the "en" setting sufficient to make sure all locales do the same thing?
        this.users().sort((a, b) => a.id().localeCompare(b.id(), "en")) 
    }

    /*
    processAddQueue () {
        // add queue
        this.thingsToAdd().forEach(thing => this.addThing(thing))
        this.setThingsQueuedToAdd([])
    }

    processRemoveQueue () {
        // remove queue
        this.thingsToRemove().forEach(thing => thing.willDestroy())
        this.thingsToRemove().forEach(thing => this.things().remove(thing))
        this.thingsToRemove().clear()
    }

    scheduleRemoveThing (thing) {
        if (this.thingsToRemove().indexOf(thing) === -1) {
            this.thingsToRemove().push(thing)
        }
        return this
    }

    setThings (things) {
        if (this._things) {
            this._things.forEach(thing => thing.willDestroy())
            things.forEach(thing => thing.setWorld(this))
        }
        this._things = things
        return this
    }    
    */


    currentSimHash () {
        return this.simHashes().get(this.syncTick())
    }

    applySimHash () {
        return this.simHashes().get(this.syncTick() - this.localUser().actionOffset())
    }

    updateCurrentSimHash () {
        this.simHashes().set(this.syncTick(), this.simEngine().simHash())
        this.simHashes().delete(this.syncTick() - this.localUser().actionOffset() - 1)
        return this
    }

    // --- run ---

    run () {
        this.setSimEngine(SimEngine.clone().setApp(this).setup()) 
        this.connect()
        this.simEngine().mainLoop()
    }

    pause () {
        if (this.isRunning()) {
            this.setIsRunning(false)
            this.appendStatus("paused")
        }
        return this
    }

    resume () {
        if (!this.isRunning()) {
            this.setIsRunning(true)
            this.appendStatus("running")
            this.timeStep()
        }
        return this
    }

    startSim () {
        this.resume()
    }

    stopSim () {
        this.appendStatus("stopped")
        this.setIsRunning(false)
    }

    // --- connect to server ---

    connect () {
        const conn = DOConnection.clone();
        conn.setRootObject(this)
        this.setConnection(conn)
        conn.setServerHost(window.location.hostname)
        //conn.setServerHost("z7762064.eero.online")
        conn.setServerPort(443)
        this.appendStatus("connecting...")
        conn.connectToServer()
        return this
    }

    // --- connection delgate methods ---

    onDOConnectionDidOpen (conn) {
        this.appendStatus("connection opened")
        this.getClientRelay()
    }

    onDOConnectionDidClose (conn) {
        this.setStatus("connection closed")
    }

    // --- get RelayClient ---

    getClientRelay () {
        this.appendStatus("getting relayClient")
        this.connection().proxy().self().setResponseTarget(this)
    }

    onComplete_self (future) {
        this.appendStatus("got relayClient")
        const client = future.result()
        this.localUser().setClient(client)
        this.setRelayClient(client)
        this.subscribeToChannel()
    }

    onError_self (future) {
        this.setStatus("error getting relayClient")
    }

    onTimeout_self (future) {
        this.setStatus("timeout getting relayClient")
    }

    // --- subscribeToChannel ---

    subscribeToChannel () {
        this.appendStatus("subscribing to channel")
        this.connection().proxy().addSubscription("test channel").setResponseTarget(this)
    }

    onComplete_addSubscription (future) {
        this.appendStatus("got channel")
        this.setChannel(future.result())
        this.getChannelClientsSet()
    }

    onError_addSubscription (future) {
        this.setStatus("remote error connecting to channel: " + future.error())
    }

    // --- getChannelClients --

    getChannelClientsSet () {
        this.channel().clientsSet().setResponseTarget(this)
    }

    onComplete_clientsSet (future) {
        const clientsSet = future.result()
        this.appendStatus("got clientsSet (" + clientsSet.size + " users)")
        clientsSet.forEach(client => this.addUserForClient(client))
        if (clientsSet.size === 1) {
            this.startSim()
        } else {
            this.requestStateFromAnotherUser()
            // wait for setState
        }
    }

    onError_clientsSet (future) {
        this.setStatus("onError_clientsSet " + future.error())
    }

    onTimeout_clientsSet (future) {
        this.setStatus("onTimeout_clientsSet")
    }

    // --- tracking channel clients ---

    onRemoteMessage_onChannelDidAddClient(aClient) {
        this.addUserForClient(aClient)
    }

    addUserForClient (aClient) {
        const id = aClient.distantObjectForProxy().remoteId()
        const existingUser = this.userForId(id)
        console.log(" addUserForClient(" + id + ")")

        if (!existingUser) {
            const user = User.clone()
            user.setClient(aClient)
            user.setWorld(this)
            user.userPointer().setElement(this.element())
            this.usersToAdd().push(user)
            user.setJoinedAtSyncTick(this.syncTick())
            this.localUser().userPointer().sharePosition()
        }
    }

    onRemoteMessage_onChannelDidRemoveClient (aClient) {
        //debugger;
        const id = aClient.distantObjectForProxy().remoteId()
        const user = this.userForId(id)
        console.log("removing client " + id)
        if (user) {
            console.log("removing user " + user.id())
            this.usersToAdd().remove(user)
            user.willDestroy()
            this.users().remove(user)
            this.completeSyncTickIfReady()
        }
    }

    processUserChanges () {
        this.usersToAdd().forEach(user => this.addUser(user))
        this.usersToAdd().clear()
    }

    // --- state ---

    getStateString () {
        const aString = this.connection().serializedValue(this.simEngine().things())
        return aString
    }

    setStateString (aString) {
        const things = this.connection().unserializedValue(aString)
        this.simEngine().setNewThings(things)
        return this
    }

    // --- syncing state ---

    requestStateFromAnotherUser () {
        //console.log(this.localUser().id() + " requestStateFromAnotherUser()")
        const otherUser = this.usersToAdd().first()
        const aClient = otherUser.client()
        this.requestStateFromClient(aClient)
    }

    requestStateFromClient (aClient) {
        const id = aClient.distantObjectForProxy().remoteId()
        const newUser = this.userForId(id)

        console.log(this.localUser().id() + " requestStateFromClient(" + id + ")")
        const rm = RemoteMessage.creationProxy().requestStateFor(this.localUser().id())
        aClient.asyncReceiveMessage(rm).ignoreResponse()
    }

    onRemoteMessage_requestStateFor (id) {
        console.log(this.localUser().id() + " onRemoteMessage_requestSendStateToClientId(" + id + ")")
        this.stateRequestQueue().push(id)
    }

    processStateRequestQueue () {
        const q = this.stateRequestQueue()
        while (q.length) {
            const id = q.pop()
            this.sendStateToClientId(id)
        }
    }

    sendStateToClientId (id) {
        console.log(" sendStateToClient(" + id + ") on syncTick: " + this.syncTick())
        const newUser = this.userForId(id)
        if (newUser) {
            const client = newUser.client()
            const rm = RemoteMessage.creationProxy().setThingsAtSyncTick(this.getStateString(), this.syncTick(), this.simTick())
            client.asyncReceiveMessage(rm).ignoreResponse()
        } else {
            console.log("newUser '" + id + "' removed before accepting response to state request")
        }

        //this.users().forEach(user => user.sharePosition()) // TODO: only send to new client 
        this.users().forEach(user => {
            if (user !== newUser) {
                user.onNewUserStateRequest(newUser)
            }
        }) 
    }

    onRemoteMessage_setThingsAtSyncTick (serializedThings, syncTick, newSimTick) {
        this.localUser().setJoinedAtSyncTick(syncTick)
        this.setStateString(serializedThings)
        this.setSimTick(syncTick * this.simTicksPerSyncTick())
        this.setSyncTick(syncTick)
        console.log(this.localUser().shortDescription() + " onRemoteMessage_setThingsAtSyncTick(<things>, " + syncTick + ") simTick:", this.simTick())

        assert(!this.isRunning())
        //debugger;
        this.setIsRunning(true)
        this.processUserChanges()
        this.onSyncTick()
    }

    onRemoteMessage_updateUserPointer (userId, x, y) {
        const user = this.userForId(userId)
        //console.log("onRemoteMessage_updateUserPointer " + userId + " " + x + " " + y)

        if (user) {
            user.userPointer().setPosition(Vector.clone().setX(x).setY(y))
        } else {
            console.log("no user found for onRemoteMessage_updateUserPointer " + userId)
        }
    }

    // --- status ---

    setStatus (s) {
        console.log("STATUS: " + s)
        //this.statusElement().innerText = s
        //console.log("status: ", s)
        return this
    }

    appendStatus (s) {
        console.log("STATUS:: " + s)
        //this.statusElement().innerHTML = this.statusElement().innerHTML + "<br>" + s
        return this
    }

    // --- time steps ---

    readyForSimStep () {
        const now = Date.now()
        const dt = now - this.lastSimTickDate()
        return dt >= 1000/this.fps()
    }

    mainLoop () { // called by SimEngine mainLoop each render frame
        if (this.isRunning() && (!this.isInTimeStep()) &&this.readyForSimStep()) {
            this.lastSimTickDate(Date.now())
            this.timeStep()
        }
    }

    timeStep () {
        this.setIsInTimeStep(true)
        //console.log("simTick: " + this.simTick() + " syncTick:" + this.syncTick())
        //this.processRemoveQueue()
        this.simEngine().timeStep()
        this.localUser().timeStep()
        //this.things().forEach(thing => thing.timeStep())

        const newSyncTick = Math.floor(this.simTick() / this.simTicksPerSyncTick())
        if (newSyncTick !== this.syncTick()) {
            this.setSyncTick(newSyncTick)
            this.onSyncTick()
        } else {
            this.onCompleteTimeStep()
        }
    }

    onCompleteTimeStep () {
        if (this.isRunning()) {
            this.setSimTick(this.simTick() + 1)
            this.setIsInTimeStep(false)
        }
    }

    // --- sync tick ---

    onSyncTick () {
        //console.log("syncTick: " + this.syncTick())
        this.setIsWaitingForUserActions(true)
        this.updateCurrentSimHash()
        this.processStateRequestQueue()
        this.processUserChanges()
        this.localUser().onSyncTick()
        this.localUser().sendActionGroup()
        this.startUsersTimeout()
        this.completeSyncTickIfReady()
    }

    // --- user actions ---

    userForId (id) {
        const user = this.users().detect(user => user.id() === id)
        if (user) {
            return user
        }
        return this.usersToAdd().detect(user => user.id() === id)
    }

    onRemoteMessage_addActionGroup (ag) {
        assert(typeof(ag) !== "string")

        const user = this.userForId(ag.clientId())
        if (user) {
            //console.log(this.localUser().shortId() + " received action group for " + user.shortId() + " syncTick: ", ag.syncTick())
            if (user === this.localUser()) {
                console.log("SECURITY ERROR: external client attempted to set local user actions")
            } else {
                //console.log("got action group for user " + user.shortId())
                user.receiveActionGroup(ag)
            }
        } else {
            console.log("ERROR: got action group for missing user")
            debugger;
        }
        this.completeSyncTickIfReady()
    } 

    /*

        Every so many simTicks, we pause to do a "syncTick".
        This involves:
        
        - calc the current state hash
        - send state to any users who have requested it (since last simTick)
        - send other active users our actions (since last simTick)
        - wait to get actions from all other users before proceeding

        Once all actions are received, or users we were still waiting on leave:
        - apply all user actions locally
        - processes new user queue

        PROBLEMS:

        - lockup situation: new client requests state but existing client never sends it
        -- existing client is past processStateRequestQueue and waiting for user actions
        --- fix by sending state during wait for users
        ----- now we see non matching syncTick
    */

    completeSyncTickIfReady () {
        if (this.isWaitingForUserActions() && this.hasAllUserActions()) {
            this.clearUsersTimeout()
            this.setIsWaitingForUserActions(false)
            this.applyUserActions()
            this.processUserChanges()
            this.onCompleteTimeStep()
        }
    }

    // --- wait-on-users-input timeout --- 

    startUsersTimeout () {
        assert(!this.usersTimeout())
        this.setUsersTimeout(setTimeout(() => {
            this.setUsersTimeout(null)
            this.onUsersTimeout()
        }, 1000))
    }

    clearUsersTimeout () {
        if (this.usersTimeout()) {
            clearTimeout(this.usersTimeout())
            this.setUsersTimeout(null)
        }
    }

    onUsersTimeout () {
        console.log("EXCEPTION: onUsersTimeout: syncTick " + this.syncTick() + " waiting on users for syncTick: ", this.syncTick() - this.localUser().actionOffset() )
        this.usersStillWaiting().forEach(user => {
            console.log(user.shortId() + ":")
            console.log("  canHaveActionGroup:", user.canHaveActionGroup())
            console.log("  hasActionGroup:", user.hasActionGroup())
            console.log("  actionGroups:" + JSON.stringify(Array.from(user.actionGroups().keys())))
        })
        //throw new Error("onUsersTimeout")
        console.log("will wait for user actions or disconnect")
        //this.startUsersTimeout()
    }

    // ---

    usersStillWaiting () {
        return this.users().filter(user => {
            return user.canHaveActionGroup() && !user.hasActionGroup()
        })
    }

    hasAllUserActions () {
        return this.usersStillWaiting().length === 0
    }

    applyUserActions () {
        this.users().forEach(user => {
            user.applyActionGroup()
        })
    }

    // --- hash ---

    showHash () {
        console.log(this.localUser().shortId() + " syncTick:" +  this.syncTick() + " hash:" + this.currentSimHash() + " users:" + this.users().length)
    }

}.initThisClass());



