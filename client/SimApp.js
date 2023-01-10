"use strict";

/*


*/

(class SimApp extends Serializable {
    static launch () {
        getGlobalThis().app = this.clone()
        SimEngine.load(() => app.run())
    }

    initPrototype () {
        this.newSerializableSlot("simEngine", null)

        this.newSlot("isRunning", false)
        this.newSlot("isInTimeStep", false)

        // sim tick
        this.newSlot("lastSimTickDate", 0)
        this.newSerializableSlot("simTick", 0)
        this.newSerializableSlot("syncTick", 0)
        //this.newSlot("simTicksPerSyncTick", 10)
        this.newSlot("actionOffset", 2) // offset between syncTick actions were sent on, and syncTick they are applied to
        this.newSlot("syncsPerSecond", 10) // must be smaller than fps
        this.newSlot("fps", 60) // desired frames per second, which currently equals the simTicks per second

        // ui
        this.newSlot("element", null)
        //this.newSlot("statusElement", null)

        // connection
        this.newSlot("connection", null)
        this.newSlot("relayClient", null)
        this.newSlot("channel", null)

        // sim hash
        this.newSerializableSlot("simHashes", null) // time to simHash map 

        this.newSlot("rng", null) // RandomNumberGenerator

        // users
        this.newSlot("localUser", null) // User
        this.newSlot("users", null) // Array
        this.newSlot("usersToAdd", null) // Array
        //this.newSlot("usersToRemove", []) // Array
        this.newSlot("usersTimeout", null)  // timeout id

        this.newSlot("stateRequestQueue", null) // Array of user ids
        this.newSlot("actionGroupQueue", null) // Array of ActionGroups
        this.newSlot("hasSentActionGroup", false) //
        this.newSlot("phase", "noopPhase") //
    }

    simTicksPerSyncTick () {
        return Math.ceil(this.fps()/this.syncsPerSecond())
    }

    init () {
        super.init()
        this.setIsDebugging(true)
        this.setSimHashes(new Map())
        this.setRng(RandomNumberGenerator.clone())

        // users
        this.setUsers([])
        this.setUsersToAdd([])
        //this.setUsersToRemove([])

        this.setStateRequestQueue([])
        this.setActionGroupQueue([])
    }

    setup () {
        this.setLocalUser(User.clone().setWorld(this))
        this.addUser(this.localUser())
        this.setElement(document.body)
        //this.element().style.userSelect = "none"
        this.localUser().userPointer().setElement(this.element()).startListening()
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

    currentSimHash () {
        return this.simHashes().get(this.syncTick())
    }

    currentApplySyncTick () {
        const t = this.syncTick() - this.actionOffset()
        return t
    }

    applySimHash () {
        return this.simHashes().get(this.currentApplySyncTick())
    }

    updateCurrentSimHash () {
        this.simHashes().set(this.syncTick(), this.simEngine().simHash())
        this.simHashes().delete(this.currentApplySyncTick() - 1)
        return this
    }

    // --- run ---

    showBasis(b) {
        let s = "["
        for (let i = 0; i < 3; i++) {
            const row = b.getRow(i)
            s += "[" + row.x() + ", " + row.y() + ", " + row.z() + "]"
        }
        s += "]"
        console.log("basis: ", s)
    }

    truncateNum (n) {
        const digits = 8
        const pow = Math.pow(10, digits)
        const result = Math.floor(n * pow) / pow
        return result
    }

    truncateArray (array) {
        for (let i = 0; i < array.length; i++) {
            array[i] = this.truncateNum(array[i])
        }
        return array
    }

    test () {
        let a = [-0.0000064798259700182825, -0.0013201627880334854, 0.0000027575993044592906, 0.9999991059303284]
        const t = new Ammo.btTransform();
        t.setIdentity();
        //a = this.truncateArray(a)
        const q = new Ammo.btQuaternion(a[0], a[1], a[2], a[3])
        
        assert(a[0] === q.x())
        assert(a[1] === q.y())
        assert(a[2] === q.z())
        assert(a[3] === q.w())

        q.normalize()
        a = [q.x(), q.y(), q.z(), q.w()]
        /*
        assert(a[0] === q.x())
        assert(a[1] === q.y())
        assert(a[2] === q.z())
        assert(a[3] === q.w())
        */
        t.setRotation(q)
        const r = t.getRotation()
        r.normalize()
        assert(a[0] === r.x())
        assert(a[1] === r.y())
        assert(a[2] === r.z())
        assert(a[3] === r.w())
    }

    run () {
        this.test()
        this.setup()
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
        }
        return this
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
        const array = future.result()
        const channel = array[0]
        const clientSet = array[1]
        this.setChannel(channel)
        this.setupWithClientSet(clientSet)
    }

    onError_addSubscription (future) {
        this.setStatus("remote error connecting to channel: " + future.error())
    }

    setupWithClientSet (clientsSet) {
        this.debugLog(" setupWithClientSet (" + clientsSet.size + " users)")
        clientsSet.forEach(client => this.addUserForClient(client))
        if (clientsSet.size === 1) {
            this.localUser().setHasState(true)
            this.setIsRunning(true)
            this.simEngine().addGround()
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

        if (!existingUser) {
            const user = User.clone()
            user.setClient(aClient)
            user.setWorld(this)
            this.queueUserToAdd(user)
            //user.setJoinedAtSyncTick(this.syncTick()+1) // hack
            user.userPointer().setElement(this.element())
            this.localUser().userPointer().sharePosition()

            this.debugLog(this.localUser().shortId() + " addUserForClient(" + user.shortId() + ")")


            if (this.localUser().hasState()) {
                this.sendHasStateToClient(aClient)
            }
        }
    }

    queueUserToAdd (user) {
        assert(!this.users().includes(user))
        assert(!this.usersToAdd().includes(user))
        this.usersToAdd().push(user)
    }

    onRemoteMessage_onChannelDidRemoveClient (aClient) {
        //debugger;
        const id = aClient.distantObjectForProxy().remoteId()
        const user = this.userForId(id)
        this.debugLog("removing client " + id)
        if (user) {
            assert(user !== this.localUser())
            this.debugLog("removing user " + user.id())
            this.usersToAdd().remove(user)
            user.willDestroy()
            this.users().remove(user)
            this.doPhase()
        }
    }

    processUserChanges () {
        const q = this.usersToAdd()
        q.slice().forEach(user => {
            if (user.hasState()) {
                this.addUser(user)
                q.remove(user)
            }
        })
    }

    processedAllUserChanges () {
        return this.usersToAdd().length === 0
    }

    // --- state ---

    getStateString () {
        const aString = this.connection().serializedValue(this)
        return aString
    }

    copySerializableSlotFrom (slotName, obj) {
        const privateName = "_" + slotName
        const newValue = obj[privateName]

        
        if (slotName === "users") {
            const newUsers = newValue
            newUsers.forEach(newUser => {
                const oldUser = this.userForId(newUser.id())
                assert(oldUser)
                oldUser.copySerializableSlotsFrom(newUser)
            })
        } else if (slotName === "simEngine") {
            const newSimEngine = newValue
            this.simEngine().setNewThings(newSimEngine.things())
        } else {
            super.copySerializableSlotFrom(slotName, obj)
        }
    }

    diffStrings(a, b) {
        let max = Math.max(a.length, b.length)
        const longer = a/length > b.length ? a : b

        for (let i = 0; i < longer.length; i++) {
         if (a[i] !== b[i] || i === a.length) {
             return longer.slice(0, i) + " \n...//... \n" + longer.slice(i, longer.length)
         }
        }
        return "";
    }

    setStateString (aString) {
        const simApp = this.connection().unserializedValue(aString)
        this.copySerializableSlotsFrom(simApp)

        
        const s = this.getStateString()
        if(s !== aString) {
            const j1 = JSON.parse(aString).slots._simEngine.slots._things.items
            const j2 = JSON.parse(s).slots._simEngine.slots._things.items
            if( JSON.stringify(j1) !== JSON.stringify(j2) ) {
                assert(j1.length === j2.length)
                for (let i = 0; i < j1.length; i++ ) {
                    const o1 = j1[i]
                    const o2 = j2[i]
                    
                    const s1 = JSON.stringify(o1)
                    const s2 = JSON.stringify(o2)
                    if (s1 !== s2) {
                        console.log("before:", s1)
                        console.log(" after:", s2)
                        //const diff = this.diffStrings(s1, s2)
                        //console.log("diff:" + diff)
                        debugger;
                    }
                }
            }
        }
        

        return this
    }

    // --- syncing state ---

    requestStateFromAnotherUser () {
        //this.debugLog(this.localUser().id() + " requestStateFromAnotherUser()")
        const otherUser = this.usersToAdd().first()
        const aClient = otherUser.client()
        this.requestStateFromClient(aClient)
    }

    requestStateFromClient (aClient) {
        const id = aClient.distantObjectForProxy().remoteId()
        const newUser = this.userForId(id)

        this.debugLog(this.localUser().shortId() + " requestStateFromClient(" + newUser.shortId() + ")")
        const rm = RemoteMessage.creationProxy().requestStateFor(this.localUser().id())
        aClient.asyncReceiveMessage(rm).ignoreResponse()
    }

    onRemoteMessage_requestStateFor (id) {
        const user = this.userForId(id)
        this.debugLog(this.localUser().shortId() + " onRemoteMessage_requestSendStateToClientId(" + user.shortId() + ")")
        this.stateRequestQueue().push(id)
        this.doPhase()
    }

    processStateRequestQueue () {
        const q = this.stateRequestQueue()
        while (q.length) {
            const id = q.pop()
            this.sendStateToClientId(id)
        }
    }

    sendStateToClientId (id) {
        this.debugLog(" sendStateToClient(" + id + ") on syncTick: " + this.syncTick())
        const newUser = this.userForId(id)
        assert(newUser)
        if (newUser) {
            const client = newUser.client()
            const rm = RemoteMessage.creationProxy().setStateAtSyncTick(this.getStateString(), this.syncTick(), this.simTick())
            client.asyncReceiveMessage(rm).ignoreResponse()
        } else {
            this.debugLog("newUser '" + id + "' removed before accepting response to state request")
        }

        //this.users().forEach(user => user.sharePosition()) // TODO: only send to new client 
        this.users().forEach(user => {
            if (user !== newUser) {
                user.onNewUserStateRequest(newUser) // will send mouse positions
            }
        })
        this.doPhase()
    }

    onRemoteMessage_setStateAtSyncTick (stateString, syncTick, newSimTick) {
        this.debugLog(this.localUser().shortId() + " onRemoteMessage_setStateAtSyncTick(" + syncTick + ")")

        this.setStateString(stateString)
        this.setSimTick(syncTick * this.simTicksPerSyncTick())
        this.setSyncTick(syncTick)

        this.localUser().setHasState(true)
        this.localUser().setJoinedAtSyncTick(syncTick)
        this.debugLog("this.localUser().setJoinedAtSyncTick(" + this.localUser().joinedAtSyncTick() + ")")

        this.updateCurrentSimHash()
        this.broadcastHasState()

        assert(!this.isRunning())
        this.setIsRunning(true)
    }

    hasStateRemoteMessage () {
        const id = this.localUser().id()
        const t = this.localUser().joinedAtSyncTick()
        const rm = RemoteMessage.creationProxy().userHasStateForSyncTick(id, t)
        return rm
    }

    broadcastHasState () {
        const rm = this.hasStateRemoteMessage()
        this.debugLog(" BROADCASTING " + rm.description())
        this.channel().asyncRelayMessageFrom(rm, this.localUser().client()) //.ignoreResponse()
    }

    sendHasStateToClient (aClient) {
        const rm = this.hasStateRemoteMessage()
        this.debugLog(" SENDING " + rm.description() + " to " + aClient.distantObjectForProxy().remoteId())
        aClient.asyncReceiveMessage(rm)
    }

    onRemoteMessage_userHasStateForSyncTick(userId, syncTick) {
        this.debugLog(" RECEIVED onRemoteMessage_userHasStateForSyncTick(" + userId + ", " + syncTick + ")")
        const user = this.userForId(userId)
        
        if (user) {
            user.setHasState(true)
            user.setJoinedAtSyncTick(syncTick)
        } else {
            this.debugLog("no user found for onRemoteMessage_userHasState " + userId)
            debugger
        }
        this.doPhase()
    }

    onRemoteMessage_updateUserPointer (userId, x, y) {
        const user = this.userForId(userId)
        //this.debugLog("onRemoteMessage_updateUserPointer " + userId + " " + x + " " + y)

        if (user) {
            user.userPointer().setPosition(Vector.clone().setX(x).setY(y))
        } else {
            this.debugLog("WARNING: no user found for onRemoteMessage_updateUserPointer " + userId)
        }
    }

    // --- status ---

    setStatus (s) {
        //this.debugLog("STATUS: " + s)
        //this.statusElement().innerText = s
        return this
    }

    appendStatus (s) {
        //this.debugLog("STATUS: " + s)
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
        if (this.isRunning() && (!this.isInTimeStep()) && this.readyForSimStep()) {
            this.lastSimTickDate(Date.now())
            this.timeStep()
        }

        /*
        const phaseMethod = this.phase()
        this[phaseMethod].apply(this)
        */
    }

    timeStep () {
        this.setIsInTimeStep(true)
        this.simEngine().timeStep() // processes things queues, steps physics, sends timeStep to things
        this.localUser().timeStep() // shares pointer changes

        const newSyncTick = Math.floor(this.simTick() / this.simTicksPerSyncTick())
        if (newSyncTick !== this.syncTick()) {
            this.setSyncTick(newSyncTick)
            this.onSyncTick()
        } else {
            this.onCompleteTimeStep()
        }
    }

    onCompleteTimeStep () {
        assert(this.isInTimeStep())
        this.setSimTick(this.simTick() + 1)
        this.setIsInTimeStep(false)
    }

    // --- sync tick ---

    setAndDoPhase (name) {
        this.setPhase(name)
        //this.debugLog("setAndDoPhase('" + name + "')")
        this.doPhase()
    }

    doPhase() {
        const method = this[this.phase()]
        assert(method)
        method.apply(this)
    }

    onSyncTick () {
        //this.debugLog(".onSyncTick() -------------------------------")
        assert(this.isInTimeStep())

        this.updateCurrentSimHash()
        this.localUser().onSyncTick() // sends pointer update
        this.startUsersTimeout()
        this.setAndDoPhase("syncUsersPhase")
    }

    // --- phases ----

    noopPhase () {
        // nothing to do
    }

    noopPhaseState () {
        return "complete"
    }

    syncUsersPhase () {
        this.processStateRequestQueue()
        this.processUserChanges() 

        // we only add a user after getting it's hasState, 
        // user only sends it after being added and requesting, and receiving it
        if (this.processedAllUserChanges()) {
            this.localUser().sendActionGroup()
            this.setAndDoPhase("syncActionsPhase")
        }
    }

    syncUsersPhaseStatus () {
        if (this.usersToAdd().length) {
            //const names = this.usersToAdd().map(user => user.shortId()).join(", ")
            let s = "waiting on usersToAdd:\n"
            this.usersToAdd().forEach(user => {
                s += "   " + user.shortId() 
                s += " joinedAtSyncTick:" + user.joinedAtSyncTick()
                s += " hasState:" + user.hasState() + "\n"
            })
            return s
        }
        return "complete"
    }

    syncActionsPhase () {
        // we've sent our actions, waiting on others now
        this.processActionGroupQueue() 
        if (this.hasAllUserActions()) {
            this.clearUsersTimeout()
            this.applyUserActions()
            this.setAndDoPhase("noopPhase")
            this.onCompleteTimeStep()
        }
    }

    syncActionsPhaseStatus () {
        if (!this.hasAllUserActions()) {
            let s = ""
            const agSyncTick = (this.syncTick() - this.actionOffset())
            s += " waiting on action ag" + agSyncTick + " from:\n"
            this.usersStillWaiting().forEach(user => s += user.summary() + "\n")
            return s
        }
        return "complete"
    }

    showPhaseStatus () {
        const method = this.phase() + "Status"
        const s = this[method].apply(this)
        console.log(method + ": " + s)
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

    */
        

    // --- user actions ---

    userForId (id) {
        const user = this.users().detect(user => user.id() === id)
        if (user) {
            return user
        }
        return this.usersToAdd().detect(user => user.id() === id)
    }

    // -------------------

    onRemoteMessage_addActionGroup (ag) {
        this.debugLog("onRemoteMessage_addActionGroup(" + ag.shortId() + ")")
        const q = this.actionGroupQueue()
        q.push(ag)
        this.doPhase()
    } 

    showActionGroupQueue () {
        const q = this.actionGroupQueue()
        const names = q.map(ag => ag.shortId()).join(", ")
        //this.debugLog("processActionGroupQueue(" + names + ")")
    }

    processActionGroupQueue () { 
        this.showActionGroupQueue()
        const q = this.actionGroupQueue()
        while (q.length) {
            const ag = q.shift()
            this.addActionGroup(ag)
        }
        assert(q.length === 0)
    }
            
    addActionGroup (ag) {
        assert(typeof(ag) !== "string")

        const user = this.userForId(ag.clientId())

        if (user) {
            if (user === this.localUser()) {
                this.debugLog("SECURITY ERROR: external client attempted to set local user actions")
            } else {
                //this.debugLog("got action group for user " + user.shortId())
                user.receiveActionGroup(ag)
            }
        } else {
            this.debugLog("WARNING: got action group (synyTick " + ag.syncTick() + ") for missing user")

            this.userForId(ag.clientId())
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
        this.showPhaseStatus()
        this.doPhase()
        //this.startUsersTimeout()
    }

    // ---

    usersStillWaiting () {
        assert(this.users().includes(this.localUser()))
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

    debugLog (s) {
        console.log("t" + this.syncTick() + " " + this.type() + " " + s)
    }

}.initThisClass());



