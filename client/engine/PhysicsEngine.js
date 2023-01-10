"use strick";

var Module = { TOTAL_MEMORY: 512 * 1024 * 1024 };

(class PhysicsEngine extends Base { 

  static load (doneCallback) {
    //console.log("loading Ammo")
    Ammo().then((Ammo) => { 
      //console.log("loaded Ammo")
      getGlobalThis().Ammo = Ammo
      doneCallback()
    });
  }

  initPrototype () {
    this.newSlot("collisionConfiguration", null)
    this.newSlot("dispatcher", null)
    this.newSlot("overlappingPairCache", null)
    this.newSlot("solver", null)
    this.newSlot("dynamicsWorld", null)
    this.newSlot("tmpTransform", null)
    this.newSlot("tmpQuaternion", null)
    //this.newSlot("tmpEuler", null)
    this.newSlot("isPaused", false)
  }

  init () {
    super.init()
    //this.setTmpEuler(new Ammo.btEuler())
    this.setTmpTransform(new Ammo.btTransform());
    this.setTmpQuaternion(new Ammo.btQuaternion());
  }

  setup () {
    //console.log(this.type() + ".setup()")

    this.setCollisionConfiguration(new Ammo.btDefaultCollisionConfiguration());
    this.setDispatcher(new Ammo.btCollisionDispatcher(this.collisionConfiguration()));
    
    const overlappingPairCache = new Ammo.btDbvtBroadphase();
    this.setOverlappingPairCache(overlappingPairCache)
    
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.setSolver(solver)

    const dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher(), overlappingPairCache, solver, this.collisionConfiguration());
    this.setDynamicsWorld(dynamicsWorld)

    this.dynamicsWorld().setGravity(new Ammo.btVector3(0, -10, 0));
    return this
  }


  destroy () {
    Ammo.destroy(this.collisionConfiguration())
    Ammo.destroy(this.dispatcher())
    Ammo.destroy(this.overlappingPairCache())
    Ammo.destroy(this.solver())
    Ammo.destroy(this.dynamicsWorld())
    Ammo.destroy(this.tmpTransform())
    Ammo.destroy(this.tmpQuaternion())
  }

  simulate (dt) {
    dt = dt || 1;
    this.dynamicsWorld().stepSimulation(dt, 2);
  }

}.initThisClass());


