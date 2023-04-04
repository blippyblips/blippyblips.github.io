const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.sortObjects = false;
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowCameraNear = camera.near;
renderer.shadowCameraFar = camera.far;
renderer.shadowCameraFov = camera.fov;

renderer.shadowMapBias = 0.0039;
renderer.shadowMapDarkness = 0.5;
renderer.shadowMapWidth = 1024;
renderer.shadowMapHeight = 1024;

renderer.shadowMapEnabled = true;
renderer.shadowMapSoft = true;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
scene.add(ambientLight);

let modelFiles = [];
const loader = new THREE.GLTFLoader();
let modelUrls = 1;

requestAnimationFrame(animate);

function loadModelFromUrl(url) {
  const currentProgress = document.getElementById('current-progress');
  const totalProgress = document.getElementById('total-progress');

  loader.load(
    url,
    (gltf) => {
      displayModel(gltf);
    },
    (xhr) => {
      const currentPercentage = (xhr.loaded / xhr.total) * 100;
      currentProgress.value = currentPercentage;

      const loadedFiles = modelUrls - modelFiles.length - 1; // Subtract 1 to account for the currently loading file
      const totalPercentage = (loadedFiles / modelUrls) * 100;
      totalProgress.value = totalPercentage + (currentPercentage / modelUrls);

    },
    (error) => {
      console.error('An error occurred while loading the model:', error);
    }
  );
}

function loadModelUrls() {
  const textarea = document.getElementById('model-urls');
  const urls = textarea.value.split('\n').map((url) => url.trim());
  modelFiles.push(...urls);
  return urls.length;
}

function loadModel(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const data = event.target.result;
    loader.parse(data, '', (gltf) => {
      displayModel(gltf);
    });
  };
  reader.readAsArrayBuffer(file);
}

function loadNextModel() {
  if (modelFiles.length === 0) {
    if (isRecording) {
      capturer.stop();
      capturer.save();
      isRecording = false;
      recordButton.innerText = 'Start Recording';
    }
    return;
  }

  const item = modelFiles.shift();

  if (typeof item === 'string') {
    loadModelFromUrl(item);
  } else {
    loadModel(item);
  }
}

function handleDrop(event) {
  event.preventDefault();

  modelFiles = Array.from(event.dataTransfer.files).filter((file) =>
    file.name.toLowerCase().endsWith('.glb')
  );

  if (!isRecording && modelFiles.length > 0) {
    const file = modelFiles.shift();
    loadModel(file);
  }
}

document.body.addEventListener('drop', handleDrop);
document.body.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

const loadUrlsButton = document.getElementById('load-urls');
loadUrlsButton.addEventListener('click', () => {
  modelUrls = loadModelUrls();
  if (!isRecording && modelFiles.length > 0 && !currentModel) {
    loadNextModel();
  }
});

//
let currentModel = null;
let startTime = 0;
let rotationPerFrame;

function displayModel(gltf) {
  if (currentModel) scene.remove(currentModel);

  currentModel = gltf.scene;
  scene.add(currentModel);

  const bb = new THREE.Box3().setFromObject(currentModel);
  const size = bb.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  currentModel.scale.setScalar(1 / maxDimension);

  startTime = Date.now();
  rotationPerFrame = (2 * Math.PI) / 6; // Assuming 60 FPS
  animate();
}

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  let deltaTime = clock.getDelta();

  if (isRecording) {
    currentModel.rotation.y += rotationPerFrame * deltaTime;
    renderer.render(scene, camera);
    capturer.capture(renderer.domElement);
  }

  if (currentModel && Date.now() - startTime >= 6000) {
    loadNextModel();
  } else {}
}

const controls = new THREE.OrbitControls(camera, renderer.domElement);
camera.position.set(0, 0, 2); // Set initial camera position
controls.update();

const capturer = new CCapture({
  format: 'webm',
  framerate: 60,
  timeLimit: 0,
  display: true,
  frameLimit: 0,
  motionBlurFrames: 16,
  quality: 100,
  verbose: false
});

let isRecording = false;
const recordButton = document.getElementById('startRecord');
recordButton.innerText = 'Start Recording';

recordButton.addEventListener('click', () => {
  if (isRecording) {
    isRecording = false;
    recordButton.innerText = 'Start Recording';
  } else {
    if (modelFiles.length === 0 && !currentModel) {
      alert('Please drag and drop GLB files first.');
    } else {
      isRecording = true;
      capturer.start();
      recordButton.innerText = 'Stop Recording';
      startTime = Date.now();
      animate();
    }
  }
});