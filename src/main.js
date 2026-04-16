// main.js – Seamless single-map soulslike game
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { Physics } from './physics.js';
import { InputManager } from './utils/InputManager.js';
import { Effects } from './utils/Effects.js';
import { Player } from './player/Player.js';
import { PlayerController } from './player/PlayerController.js';
import { World } from './world/World.js';
import { BossAI } from './boss/BossAI.js';
import { HUD3D } from './ui/HUD3D.js';
import { HUD } from './ui/HUD.js';

/* ── Constants ── */
const CAMERA_OFFSET = new THREE.Vector3(0, 7, 9); // fixed isometric-ish view
const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 0.5, 0);
const CAMERA_LERP = 0.06;

/* ── State ── */
let renderer, composer, outlinePass, camera, scene, clock;
let player, controller, world, bossAI, hud, hud3d;
let gameState = 'title'; // title | playing | gameover | victory
let bossDoorOpen = false;

/* ── Cel-shading shader ── */
const CelShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2() } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // Posterize to 4 levels for cel look
      float grey = dot(c.rgb, vec3(0.299,0.587,0.114));
      float q = floor(grey * 4.0 + 0.5) / 4.0;
      float factor = grey > 0.01 ? q / grey : 1.0;
      gl_FragColor = vec4(c.rgb * factor, c.a);
    }
  `,
};

/* ── Renderer + post-processing ── */
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x87ceeb);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 5, 10);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x9ec5d8, 0.012);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xfff4e6, 1.0);
  dir.position.set(10, 20, 10);
  dir.castShadow = true;
  scene.add(dir);
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a40, 0.35));

  // EffectComposer
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Outline pass (cartoon outlines)
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera
  );
  outlinePass.edgeStrength = 3.0;
  outlinePass.edgeGlow = 0.0;
  outlinePass.edgeThickness = 1.5;
  outlinePass.visibleEdgeColor.set(0x000000);
  outlinePass.hiddenEdgeColor.set(0x000000);
  composer.addPass(outlinePass);

  // Cel-shading pass
  const celPass = new ShaderPass(CelShader);
  celPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  composer.addPass(celPass);

  clock = new THREE.Clock();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    celPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    outlinePass.resolution.set(window.innerWidth, window.innerHeight);
  });
}

/* ── Build the world ── */
function startGame() {
  gameState = 'playing';
  hideAllScreens();

  // Physics
  Physics.reset();
  Physics.init();
  InputManager.reset();

  // Clear scene objects (keep lights)
  const keep = [];
  scene.traverse(c => { if (c.isLight) keep.push(c); });
  scene.clear();
  keep.forEach(l => scene.add(l));
  scene.fog = new THREE.FogExp2(0x9ec5d8, 0.012);

  // Sky
  const skyGeo = new THREE.SphereGeometry(90, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x3a7bd5) },
      bottomColor: { value: new THREE.Color(0xb5d4f0) },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos;
      void main(){ float h=normalize(vPos).y; gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.0)),1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Build seamless world
  world = new World(scene);
  world.build();

  // Player (size = 1 unit)
  player = new Player();
  player.create(scene);
  player.resetState();
  player.setPosition(0, 2, 0);

  controller = new PlayerController(player, null);
  controller.enabled = true;
  controller.canJump = false;
  controller.enableSkills(false);

  // 3D HUD (checkbox sprites)
  hud3d = new HUD3D(scene, camera);
  hud3d.init(world);

  // Outline objects
  const outlined = [];
  scene.traverse(c => { if (c.isMesh) outlined.push(c); });
  outlinePass.selectedObjects = outlined;

  // HTML HUD
  hud.show();
  hud.showBossHp(false);
  hud.setStage('튜토리얼: 다리 건너기');
  hud.setInstruction('방향키로 이동하세요!');
  hud.updatePlayerHp(player.hp, player.maxHp);

  // Camera
  camera.position.copy(player.group.position).add(CAMERA_OFFSET);

  bossDoorOpen = false;
}

/* ── Main loop ── */
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameState === 'title' || gameState === 'victory' || gameState === 'gameover') {
    renderer.render(scene, camera);
    return;
  }

  // Physics
  Physics.step(dt);

  // Player
  if (player && player.body) {
    controller.update(dt);
    player.update(dt);
    hud.updatePlayerHp(player.hp, player.maxHp);
  }

  // World triggers
  if (world && player && player.body) {
    const px = player.body.position.x;
    const pz = player.body.position.z;

    // ── Tutorial zones ──
    // Zone 1: Bridge (z < -5) → enable jump after crossing
    if (pz < -12 && !controller.canJump) {
      controller.canJump = true;
      hud.setStage('튜토리얼: 점프');
      hud.setInstruction('Space로 점프! 강을 건너세요');
      hud3d.checkOff('move');
    }

    // Zone 2: After river (z < -28) → enable skills
    if (pz < -28 && !controller.canUseSkills) {
      controller.enableSkills(true);
      hud.setStage('튜토리얼: 전투');
      hud.setInstruction('A(공격) S(방어) D(발차기) Shift(회피)');
      hud3d.checkOff('jump');
    }

    // Zone 3: All seaweed defeated → open boss door
    if (controller.canUseSkills && world.allSeaweedDead() && !bossDoorOpen) {
      bossDoorOpen = true;
      world.openBossDoor();
      hud.setInstruction('보스 문이 열렸다! 앞으로 진행하세요');
      hud3d.checkOff('combat');
      // Save tutorial completion
      localStorage.setItem('tutorialComplete', 'true');
    }

    // Zone 4: Entered boss room (z < -52)
    if (pz < -52 && !bossAI && world.hippo) {
      hud.setStage('⚔️ 보스: 하마');
      hud.showBossHp(true);
      hud.setInstruction('A키로 공격! S키로 방어!');
      hud.updateBossHp(world.hippo.hp, world.hippo.maxHp);

      bossAI = new BossAI(world.hippo, player, scene);
      bossAI.onVictory = () => {
        Effects.burst(scene, world.hippo.group.position.clone(), 0xffd700, 30, 5, 0.25, 2);
        hud.setInstruction('🎉 승리! 하마를 물리쳤습니다!');
        gameState = 'victory';
        setTimeout(() => {
          document.getElementById('end-screen').style.display = 'flex';
          hud.hide();
        }, 2500);
      };
      bossAI.onPlayerHit = () => hud.updatePlayerHp(player.hp, player.maxHp);
    }

    // Boss AI update
    if (bossAI) {
      bossAI.update(dt);
      if (world.hippo) {
        hud.updateBossHp(world.hippo.hp, world.hippo.maxHp);
        world.hippo.update(dt);
      }
      if (!player.isAlive && gameState === 'playing') {
        gameState = 'gameover';
        setTimeout(() => {
          document.getElementById('game-over-screen').style.display = 'flex';
          hud.hide();
        }, 1000);
      }
    }

    // World animations
    world.update(dt, player);

    // Seaweed collision (player attacks)
    if (player.isAttacking) {
      world.checkSeaweedHit(player);
    }
  }

  // Fixed-angle camera following player (no rotation)
  if (player && player.group) {
    const p = player.group.position;
    const targetX = p.x + CAMERA_OFFSET.x;
    const targetY = p.y + CAMERA_OFFSET.y;
    const targetZ = p.z + CAMERA_OFFSET.z;

    camera.position.x += (targetX - camera.position.x) * CAMERA_LERP;
    camera.position.y += (targetY - camera.position.y) * CAMERA_LERP;
    camera.position.z += (targetZ - camera.position.z) * CAMERA_LERP;
    camera.lookAt(p.x + CAMERA_LOOK_OFFSET.x, p.y + CAMERA_LOOK_OFFSET.y, p.z + CAMERA_LOOK_OFFSET.z);
  }

  // HUD3D
  if (hud3d) hud3d.update(dt);

  // Effects
  Effects.update(dt, camera);

  // Render with post-processing
  composer.render();
}

/* ── UI helpers ── */
function hideAllScreens() {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('end-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
}

function showTitle() {
  gameState = 'title';
  document.getElementById('title-screen').style.display = 'flex';
  document.getElementById('end-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
  if (hud) hud.hide();
}

/* ── Init ── */
function init() {
  initRenderer();
  Physics.init();
  InputManager.init();

  hud = new HUD();
  hud.init();
  hud.hide();

  // UI handlers
  document.getElementById('btn-start').addEventListener('click', () => startGame());
  document.getElementById('btn-info').addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'flex';
  });
  document.getElementById('btn-close-info').addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'none';
  });
  document.getElementById('btn-restart-end').addEventListener('click', () => {
    bossAI = null;
    showTitle();
  });
  document.getElementById('btn-restart-gameover').addEventListener('click', () => {
    bossAI = null;
    showTitle();
  });

  showTitle();
  gameLoop();
}

init();
