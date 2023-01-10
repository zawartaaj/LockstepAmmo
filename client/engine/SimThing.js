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
    this.newSerializableSlot("texturePath", "client/resources/images/cube4.jpg")
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

  applyMotionStateMapIfPresent () {
    const m = this.motionStateMap()
    if (m) {
      //this.setPosition(m.get("position"))
      //this.setRotationArray(m.get("rotationArray"))

      // ------------------------

      const p = m.get("position")
      const ra = m.get("rotationArray")
      
      //-0.00001229102326760767 -0.0039023959543555975 0.0005776874022558331 0.9999921917915344
      //-0.000012291025086597074 -0.0039023966528475285 0.000577687518671155 0.9999921917915344

      const t = new Ammo.btTransform();
      t.setIdentity();
      t.setOrigin(new Ammo.btVector3(p._x, p._y, p._z));
      t.setRotation(new Ammo.btQuaternion(ra[0], ra[1], ra[2], ra[3]));
      //const motionState = new Ammo.btDefaultMotionState(t);

      {
        const rot = t.getRotation();

        //console.log(ra[0], ra[1], ra[2], ra[3])
        //console.log(rot.x(), rot.y(), rot.z(), rot.w())

        assert(ra[0] === rot.x())
        assert(ra[1] === rot.y())
        assert(ra[2] === rot.z())
        assert(ra[3] === rot.w())
        }

      this.body().getMotionState().setWorldTransform(t);

      // verify
      const t2 = new Ammo.btTransform();

      this.body().getMotionState().getWorldTransform(t2);

      const origin = t2.getOrigin();
      assert(p._x === origin.x())
      assert(p._y === origin.y())
      assert(p._z === origin.z())
  
      {
      const rot = t2.getRotation();
      assert(ra[0] === rot.x())
      assert(ra[1] === rot.y())
      assert(ra[2] === rot.z())
      assert(ra[3] === rot.w())
      }
    // -----------


      this.setLinearVelocityArray(m.get("linearVelocityArray"))
      this.setAngularVelocityArray(m.get("angularVelocityArray"))
      this.setMotionStateMap(null)
    }
    return this
  }

  verifyJson () {
    let json = this.asJson();
    let s = JSON.stringify(json)
    let j = JSON.parse(s)
    //this.assertArraysEqual(this.rotationArray(), j.slots._motionStateMap.entries[1][1].items)
    
    let instance = new (this.constructor)();
    instance.fromJson(j)
    this.assertArraysEqual(this.rotationArray(), instance.motionStateMap().get("rotationArray"))
    instance.setSimEngine(this.simEngine())
    instance.applyMotionStateMapIfPresent() 
    this.assertArraysEqual(this.rotationArray(), instance.rotationArray())

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
    //this.applyMotionStateMap()
    return result
  }

  // --- hash ---

  simHash () {
    const m = this.motionStateMap()
    this.calcMotionStateMap()
    const hash = super.simHash()
    this.setMotionStateMap(m)
    return hash
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
    this.applyMotionStateMapIfPresent() 

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

    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform);

    const origin = transform.getOrigin();
    sceneObject.position[0] = origin.x() 
    sceneObject.position[1] = origin.y() 
    sceneObject.position[2] = origin.z()

    const rot = transform.getRotation();
    const gQuat = this.simEngine().graphicsEngine().tmpQuaternion();
    gQuat.x = rot.x();
    gQuat.y = rot.y();
    gQuat.z = rot.z();
    gQuat.w = rot.w(); 
    sceneObject.rotation = gQuat.toEuler();

    const e = sceneObject.rotation
    //this.setEulerZYX(e[2], e[1], e[0]) 
    //this.verifyRotation()

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
    const origin = this.body().getWorldTransform().getOrigin();
    origin.setX(x);
    origin.setY(y);
    origin.setZ(z);
    
    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform);
    transform.setOrigin(origin);
    this.body().getMotionState().setWorldTransform(transform);

    //this.syncViewFromSim()
    return this
  }

  // --- helpers ---

  tmpQuaternion () {
    return this.physicsEngine().tmpQuaternion()
  }

  getWorldTransform () {
    const t = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(t);
    return t
  }

  // --- rotation test ---

  /*
  setRotationArray(array) {
    const x = array[0]
    const y = array[1]
    const z = array[2]
    const gQuat = this.graphicsEngine().tmpQuaternion() //.set(0, 0, 0, 1)
    gQuat.setFromEuler(x, y, z)

    this.tmpBtQuaternion().setValue(0, 0, 0, 1)
    const ammoQuat = this.tmpQuaternion()
    ammoQuat.setValue(gQuat.x, gQuat.y, gQuat.z, gQuat.w)

    const t = this.worldTransform()
    t.setRotation(ammoQuat)
  }


=  getRotationArray () {
    // https://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm

    const t = this.worldTransform()
    const ammoQuat = t.getRotation()

    let q1 = this.tmpQuaternion().set(ammoQuat.x(), ammoQuat.y(), ammoQuat.z(), ammoQuat.w())
    if (q1.w > 1) {
      q1 = q1.normalize() // if w>1 acos and sqrt will produce errors, this cant happen if quaternion is normalized
    }

    const angle = 2 * Math.acos(q1.w)
    const s = Math.sqrt(1 - q1.w * q1.w) // assuming quaternion normalized then w is less than 1, so term always positive.

    let x, y, z;
    if (s < 0.001) {
      // test to avoid divide by zero, s is always positive due to sqrt
      // if s close to zero then direction of axis not important
      x = q1.x // if it is important that axis is normalized then replace with x=1; y=z=0;
      y = q1.y
      z = q1.z
    } else {
      x = q1.x / s // normalized axis
      y = q1.y / s
      z = q1.z / s
    }
    return [x * angle, y * angle, z * angle ]
  }
  */


  // --- rotation ---

  assertArraysEqual (a1, a2) {
    assert(a1.length === a2.length)
    for (let i = 0; i < a1.length; i ++) {
      if(a1[i] !== a2[i]) {
        console.log("a1:", a1)
        console.log("a2:", a2)
        debugger;
      }
    }
  }

  verifyRotation () {
    const before = this.rotationArray()
    this.setRotationArray(before)
    const after = this.rotationArray()
    this.assertArraysEqual(before, after)
  }

  rotationArray () {
    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform); 
    const r = transform.getRotation()
    //r.normalize()
    return [r.x(), r.y(), r.z(), r.w()]
  }


  test () {
      const a = [-0.0000064798259700182825, -0.0013201627880334854, 0.0000027575993044592906, 0.9999991059303284]
      const q = transform.getRotation()
      q.setX(a[0])
      q.setY(a[1])
      q.setZ(a[2])
      q.setW(a[3])
      transform.setRotation(q);
      const q1 = transform.getRotation()
      let qa = [q1.x(), q1.y(), q1.z(), q1.w()]
      console.log(qa)
      //output: [-0.000006479827334260335,  -0.001320163020864129,  0.0000027575997592066415, 0.9999991059303284]
  }

  setRotationArray (array) {
    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform); 

    const q = transform.getRotation()
    q.setValue(array[0], array[1], array[2], array[3])
    /*
    q.setX(array[0])
    q.setY(array[1])
    q.setZ(array[2])
    q.setW(array[3])
    */
    // array = [-0.0000064798259700182825, -0.0013201627880334854, 0.0000027575993044592906, 0.9999991059303284]
   //     qa = [-0.000006479827334260335,  -0.001320163020864129,  0.0000027575997592066415, 0.9999991059303284]

    assert(q.x() === array[0])
    assert(q.y() === array[1])
    assert(q.z() === array[2])
    assert(q.w() === array[3])
    
    transform.setRotation(q);

    const q1 = transform.getRotation()
    let qa = [q1.x(), q1.y(), q1.z(), q1.w()]
    assert(q1.x() === array[0])
    assert(q1.y() === array[1])
    assert(q1.z() === array[2])
    assert(q1.w() === array[3])

    this.body().getMotionState().setWorldTransform(transform);

    const ra = this.rotationArray()
    this.assertArraysEqual(array, ra)
  }

  // --- velocity ---

  linearVelocityArray () {
    /*
    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform);
    const v = transform.getLinearVelocity();
    */
    const v = this.body().getLinearVelocity();
    return [v.x(), v.y(), v.z()]
  }

  setLinearVelocityArray (array) {
    //const transform = this.physicsEngine().tmpTransform();
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
    const transform = this.physicsEngine().tmpTransform();
    this.body().getMotionState().getWorldTransform(transform);
    const av = transform.getAngularVelocity();
    */
    const av = this.body().getAngularVelocity();
    return [av.x(), av.y(), av.z()]
  }

  setAngularVelocityArray (array) {
    const transform = this.physicsEngine().tmpTransform();
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
    this.verifyJson()
    // for subclasses to override
  }

}.initThisClass());

