"use strick";

(class BoxThing extends SimThing { 

  initPrototype () {
    this.newSerializableSlot("label", null)
    this.newSerializableSlot("width", 2)
    this.newSerializableSlot("height", 2)
    this.newSerializableSlot("depth", 2)
  }

  init () {
    super.init()
  }

  setup () {
    super.setup()
  }

  // --- rendering ---

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
    const mesh = new CubicVR.primitives.box({
      size: [this.width()*2, this.height()*2, this.depth()*2],
      material: this.material(),
      uvmapper: this.uvMapper()
    }).calcNormals().triangulateQuads().compile().clean();
    this.setMesh(mesh)
  }

  setupSceneObject () {
    const sceneObject = new CubicVR.SceneObject({ mesh: this.mesh(), position: [0, 0, 0] });
    this.setSceneObject(sceneObject)
  }

  // --- physics ---

  setupShape () {
    const v = new Ammo.btVector3(this.width(), this.height(), this.depth())
    const boxShape = new Ammo.btBoxShape(v)
    this.setShape(boxShape); // correct?
  }

  setupBodyDef () {
    const startTransform = new Ammo.btTransform();
    startTransform.setIdentity();
    startTransform.setOrigin(new Ammo.btVector3(0, 0, 0));

    const localInertia = new Ammo.btVector3(0, 0, 0);
    this.shape().calculateLocalInertia(this.mass(), localInertia);

    const myMotionState = new Ammo.btDefaultMotionState(startTransform);
    const bodyDef = new Ammo.btRigidBodyConstructionInfo(this.mass(), myMotionState, this.shape(), localInertia);
    this.setBodyDef(bodyDef)
  }

  setupBody () {
    const body = new Ammo.btRigidBody(this.bodyDef());
    this.setBody(body)
  }  

  addToWorld () {
    const body = this.body()
    this.physicsEngine().dynamicsWorld().addRigidBody(body);
  }

  // ---------

  pickDimensions () {
    if (this.body()) {
      throw new Error("can't change body dimensions")
    }

    this.setWidth(Math.random()*2 + 0.1)
    this.setHeight(Math.random()*2 + 0.1)
    this.setDepth(Math.random()*2 + 0.1)
    return this
  }

  pickPosition () {
    const s = 3
    const x = s*(Math.random() - 0.5)*2;
    const y = s*(Math.random() - 0.5)*2;
    const z = s*(Math.random() - 0.5)*2;

    this.setPosXYZ(x, 30 + y, z)

    //this.setRotationArray([1, 0, 0, 1])
    return this
  }

}.initThisClass());


