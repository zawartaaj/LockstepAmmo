"use strick";

(class SimEngine extends Serializable {

  static load (doneCallback) {
    PhysicsEngine.load(() => { doneCallback() })
  }

  initPrototype () {
    this.newSlot("app", null)

    this.newSerializableSlot("things", null)        
    this.newSlot("thingsToAdd", null)
    this.newSlot("thingsToRemove", null)

    this.newSlot("physicsEngine", null)
    this.newSlot("graphicsEngine", null)
  }

  init () {
    super.init()
    this.setThings([]) // use an array to keep order the same across clients - not sure if this is necessary as Set may have consistent ordering
    this.setThingsToAdd([])
    this.setThingsToRemove([])
  }

  simHash () {
    return this.things().simHash()
  }

  setup () {  
    //console.log(this.type() + ".setup()")
    this.setPhysicsEngine(PhysicsEngine.clone().setup()) 
    this.setGraphicsEngine(GraphicsEngine.clone().setup().setApp(this)) 
    //this.addBoxThing()
    return this
  }

  // --- things ---

  setNewThings (newThings) {
    if (this._things) {
      this.things().forEach(thing => this.scheduleRemoveThing(thing))
      this.processRemoveQueue()
    }

    newThings.forEach(thing => this.scheduleAddThing(thing))
    this.processAddQueue()
    return this
  }

  // --- adding things ---

  scheduleAddThing (thing) {
    const q = this.thingsToAdd()
      if (q.indexOf(thing) === -1) {
          q.push(thing)
      }
      return this
  }

  processAddQueue () {
    const q = this.thingsToAdd()
    q.forEach(thing => this.addThing(thing))
    q.clear()
  }

  addThing (thing) { 
    thing.setSimEngine(this)
    this.things().push(thing)
    thing.create()
    return thing
  }

  // --- removing things ---

  scheduleRemoveThing (thing) {
    const q = this.thingsToRemove()
      if (q.indexOf(thing) === -1) {
          q.push(thing)
      }
      return this
  }

  processRemoveQueue () {
      // remove queue
      const q = this.thingsToRemove()
      q.forEach(thing => this.removeThing(thing))
      q.clear()
  }

  removeThing (thing) {
    thing.willDestroy()
    this.things().remove(thing)
    return this
  }

  // ---------------

  addBoxThing () {
    const thing = BoxThing.clone().setSimEngine(this)
    thing.pickDimensions()
    thing.setup()
    thing.pickPosition()
    this.scheduleAddThing(thing)
  }

  addGround () {
    const thing = BoxThing.clone().setSimEngine(this)
    thing.setLabel("ground")
    thing.setTexturePath("client/resources/images/cube3.jpg")
    thing.setMass(0)
    thing.setWidth(10)
    thing.setHeight(0.2)
    thing.setDepth(10)
    thing.setup()
    thing.setPosXYZ(0, -10, 0)
    this.scheduleAddThing(thing)
  }
    
  mainLoop () {
    //console.log(this.type() + ".mainLoop()")

    CubicVR.MainLoop((timer, gl) => {
      //const dt = timer.getLastUpdateSeconds();
      this.app().mainLoop()
      /*
      this.processRemoveQueue()
      this.timeStepPhysics()
      this.graphicsEngine().render()
      
      if (Math.random() < 0.1) {
        this.addBoxThing()
      }
      */
      this.graphicsEngine().render()
    })
  }

  timeStep () {
    this.processAddQueue()
    this.processRemoveQueue()
    this.timeStepPhysics()
    //this.graphicsEngine().render()
    
    /*
    if (Math.random() < 0.1) {
      this.addBoxThing()
    }
    */
  }

  timeStepPhysics () {
    if (!this.physicsEngine().isPaused()) {
      this.physicsEngine().simulate(1/20)
      this.timeStepThings() // deal with collisions or behaviors
      this.syncViewsFromSim()
    }
  }

  timeStepThings () {
    this.things().forEach(thing => {
      thing.timeStep()
    })
  }

  syncViewsFromSim () {
    this.things().forEach(thing => {
      thing.syncViewFromSim()
    })
  }

}.initThisClass());

