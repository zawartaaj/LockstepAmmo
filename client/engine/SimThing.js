"use strict";

(class SimThing extends Serializable {

  initPrototype () {
    this.newSlot("simEngine", null)

    // sim
    this.newSlot("bodyDef", null)
    this.newSlot("shape", null)
    this.newSerializableSlot("mass", 1) // 0 for static fixtures
    this.newSlot("body", null)

    // view
    this.newSlot("material", null)
    this.newSlot("texturePath", "client/images/cube4.jpg")
    this.newSlot("textureScale", 2)
    this.newSlot("mesh", null)
    this.newSlot("sceneObject", null)

    /*
    this.newSerializableSlot("position", null) // wraps physics object
    this.newSerializableSlot("rotationArray", null) // wraps physics object
    this.newSerializableSlot("linearVelocityArray", null) // wraps physics object
    this.newSerializableSlot("angularVelocityArray", null) // wraps physics object
    */
    this.newSerializableSlot("motionStateMap", null) // calc for serialization, apply after deserialization
    this.newSerializableSlot("age", 0) 
  }

  // --- serialization ---

  calcMotionStateMap () {
    const m = new Map()
    m.set("position", this.position())
    m.set("rotationArray", this.rotationArray())
    m.set("linearVelocityArray", this.linearVelocityArray())
    m.set("angularVelocityArray", this.angularVelocityArray())
    this.setMotionStateMap(m)
    return this
  }

  applyMotionStateMap () {
    const m = this.motionStateMap()
    this.setPosition(m.get("position"))
    this.setRotationArray(m.get("rotationArray"))
    this.setLinearVelocityArray(m.get("linearVelocityArray"))
    this.setAngularVelocityArray(m.get("angularVelocityArray"))
    return this
  }

  asJson (loopCheck, refCreater) {
    // calc motion state slot, so it can be serialized
    this.calcMotionStateMap()
    return super.asJson(loopCheck, refCreater)
  }

  fromJson (json, refResolver) {
    const result = super.fromJson(json, refResolver)
    // update motion state from motion state slot
    this.setup()
    this.applyMotionStateMap()
    return result
  }

  // --- hash ---

  simHash () {
    this.calcMotionStateMap()
    return super.simHash()
  }

  // --- helpers ---

  scene () {
    return this.simEngine().graphicsEngine().scene()
  }

  physicsEngine () {
    return this.simEngine().physicsEngine()
  }

  // ----

  init () {
    super.init()
  }

  setup () {
    this.setupSimBody()
    this.setupView()
  }

  // --- physics ---

  setupSimBody () {
    this.setupShape()
    this.setupBodyDef()
    this.setupBody()
  }

  setupShape () {
    // subclasses should override
    /*
    const shapeClass = this.shapeClass()
    const shape = new shapeClass();
    this.setShape(shape)
    */
  }

  setupBodyDef () {

  }

  setupBody () {

  }
  
  awaken () {
    this.body().activate();
  }

  // --- view ---

  setupView () {
    this.setupMaterial()
    this.setupMesh()
    this.setupSceneObject()
  }

  setupMaterial () {
    const material = new CubicVR.Material({
      textures: {
        color: new CubicVR.Texture(this.texturePath())
      }
    });
    this.setMaterial(material)
  }

  uvMapper () {
    const s = this.textureScale()
    const uv = {
      projectionMode: CubicVR.enums.uv.projection.CUBIC,
      scale: [s, s, s]
    }
    return uv
  }

  setupMesh () {
    // subclasses should override
  }

  setupSceneObject () {
    const sceneObj = new CubicVR.SceneObject({ 
      mesh: this.mesh(), 
      position: [0, 0, 0] 
    });
    this.setSceneObject(sceneObj)
  }

  addToScene () {
    this.scene().bindSceneObject(this.sceneObject(), true);
  }

  // --- create & destroy ---

  create () {
    // sim
    this.addToWorld()
    this.awaken();

    this.syncViewFromSim()

    // view
    this.addToScene()
  }

  willDestroy () {
    this.destroy()
  }

  destroy () {
    assert(this.body())
    this.scene().removeSceneObject(this.sceneObject())

    const dw = this.physicsEngine().dynamicsWorld()
    const body = this.body()
    dw.removeRigidBody(body); // is destroy() method correct?

    // destroy any contained ammo objects like transform with Ammo.destroy()?
    Ammo.destroy(this.bodyDef())
    Ammo.destroy(this.shape())
    Ammo.destroy(this.body())
    this.setBody(null)
  }

  // --- update ---

  syncViewFromSim () {
    const sceneObject = this.sceneObject();

    const transform = this.physicsEngine().transform();
    this.body().getMotionState().getWorldTransform(transform);

    const origin = transform.getOrigin();
    sceneObject.position[0] = origin.x() 
    sceneObject.position[1] = origin.y() 
    sceneObject.position[2] = origin.z()

    const rot = transform.getRotation();
    const q = this.simEngine().physicsEngine().quaternion();
    q.x = rot.x();
    q.y = rot.y();
    q.z = rot.z();
    q.w = rot.w(); 
    sceneObject.rotation = q.toEuler();

    /*
    if (this.mass() && !this.body().isActive()) {
      console.log("inactive")
      this.pickPosition()
      this.awaken()
    }
    */

    if (origin.y() < -100) {
      this.simEngine().scheduleRemoveThing(this)
    }
  }

  isAwake () {
    throw new Error("unimplemented")
    //return this.body().IsAwake()
  }

  // --- position ---
  // the physics position is the "real position" - we just wrap it with these methods

  position () {
    const p = this.body().getWorldTransform().getOrigin();
    return Vector.clone().setXYZ(p.x(), p.y(), p.z())
  }

  setPosition (v) {
    this.setPosXYZ(v.x(), v.y(), v.z())
    return this
  }

  setPosXYZ (x, y, z) {
    const transform = this.physicsEngine().transform();
    const origin = this.body().getWorldTransform().getOrigin();
    origin.setX(x);
    origin.setY(y);
    origin.setZ(z);
    
    this.body().getMotionState().getWorldTransform(transform);
    transform.setOrigin(origin);
    this.body().getMotionState().setWorldTransform(transform);

    this.syncViewFromSim()
    return this
  }

  // --- rotation ---

  rotationArray () {
    const transform = this.physicsEngine().transform();
    this.body().getMotionState().getWorldTransform(transform);
    const r = transform.getRotation();
    return [r.x(), r.y(), r.z(), r.w()]
  }

  setRotationArray (array) {
    const transform = this.physicsEngine().transform();
    const rot = transform.getRotation();
    rot.setX(array[0])
    rot.setY(array[1])
    rot.setZ(array[2])
    rot.setW(array[3])
    
    this.body().getMotionState().getWorldTransform(transform);
    transform.setRotation(rot);
    this.body().getMotionState().setWorldTransform(transform);
  }

  // --- velocity ---

  linearVelocityArray () {
    /*
    const transform = this.physicsEngine().transform();
    this.body().getMotionState().getWorldTransform(transform);
    const v = transform.getLinearVelocity();
    */
    const v = this.body().getLinearVelocity();
    return [v.x(), v.y(), v.z()]
  }

  setLinearVelocityArray (array) {
    //const transform = this.physicsEngine().transform();
    //const v = transform.getLinearVelocity();
    const v = this.body().getLinearVelocity();
    v.setX(array[0])
    v.setY(array[1])
    v.setZ(array[2])
    this.body().setLinearVelocity(v);
    /*
    this.body().getMotionState().getWorldTransform(transform);
    transform.setLinearVelocity(av);
    this.body().getMotionState().setWorldTransform(transform);
    */
  }

  // --- angular velocity ---

  angularVelocityArray () {
    /*
    const transform = this.physicsEngine().transform();
    this.body().getMotionState().getWorldTransform(transform);
    const av = transform.getAngularVelocity();
    */
    const av = this.body().getAngularVelocity();
    return [av.x(), av.y(), av.z()]
  }

  setAngularVelocityArray (array) {
    const transform = this.physicsEngine().transform();
    //const v = transform.getAngularVelocity();
    const v = this.body().getAngularVelocity();

    v.setX(array[0])
    v.setY(array[1])
    v.setZ(array[2])
    this.body().setAngularVelocity(v);

    /*
    this.body().getMotionState().getWorldTransform(transform);
    transform.setAngularVelocity(v);
    this.body().getMotionState().setWorldTransform(transform);
    */
  }

  // ---

  setAngle (a) {
    throw new Error("no implementation")
  }

  showPosition () {
    const origin = this.body().getWorldTransform().getOrigin();
    console.log("thing origin: ", origin.x(), origin.y(), origin.z())
  }

  timeStep () {
    // for subclasses to override
  }

}.initThisClass());

