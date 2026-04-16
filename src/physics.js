// physics.js - Cannon-es physics wrapper
import * as CANNON from 'cannon-es';

export const Physics = {
  world: null,

  init() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.2;
  },

  step(dt) {
    if (this.world) {
      this.world.step(1 / 60, dt, 3);
    }
  },

  createBox(halfExtents, position, mass = 1) {
    const shape = new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z));
    const body = new CANNON.Body({
      mass,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    body.addShape(shape);
    this.world.addBody(body);
    return body;
  },

  createPlane(position = { x: 0, y: 0, z: 0 }) {
    const shape = new CANNON.Plane();
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.quaternion.setFromEulerAngles(-Math.PI / 2, 0, 0);
    body.position.set(position.x, position.y, position.z);
    this.world.addBody(body);
    return body;
  },

  removeBody(body) {
    if (body && this.world) {
      this.world.removeBody(body);
    }
  },

  reset() {
    if (this.world) {
      while (this.world.bodies.length > 0) {
        this.world.removeBody(this.world.bodies[0]);
      }
    }
  },
};
