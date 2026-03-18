document.addEventListener('DOMContentLoaded', () => {
    let scene, camera, renderer, heart, particles, controls;
    let mouseX = 0, mouseY = 0;
    let isPulsating = false;
    let isPlaying = false;
    let currentTime = 0;
    let heartColors = [
        { main: 0xff2277, emissive: 0x660022, specular: 0xff6699 },
        { main: 0x22aaff, emissive: 0x002266, specular: 0x66ccff },
        { main: 0xffaa22, emissive: 0x664400, specular: 0xffcc66 },
        { main: 0x22ff88, emissive: 0x006633, specular: 0x66ffaa },
        { main: 0xff4466, emissive: 0x441122, specular: 0xff7799 },
        { main: 0x9966ff, emissive: 0x332244, specular: 0xbb88ff }
    ];
    let currentColorIndex = 0;

    // Animation intro variables
    let cameraIntroActive = true;
    let introProgress = 0;
    let cameraStartPosition = new THREE.Vector3(0, 12, 18);
    let cameraEndPosition = new THREE.Vector3(0, 0, 5);
    let textMesh;
    let lyricsIndex = 0;
    let lastLyricsTime = 0;
    let shownLyrics = new Set();
    let floatingTexts = []; // Array to store floating text meshes
    let loveText; // Special "I Love You" text near the heart

    // Song lyrics with timing (in milliseconds now for better precision)
    //HangOver
    const lyrics = [
        { time: 0, text: "🎵 PAR JABSE DEKHA TUJHE..." },
        { time: 2000, text: "💖 JO HUA NAHI" },
        { time: 3400, text: "❤️ WO HONE LAGA" },
        { time: 5300, text: "❤️ DIL MERA MUJHE JAGAKE..." },
        { time: 8000, text: "✨ KHUD SEENE ME SONE LAGA" }
    ];


    // // Do You Know
    // const lyrics = [
    //     { time: 400, text: "🎶✨ OH JAANEMAN... 💕" },
    //     { time: 1600, text: "💖🌹 DO YOU KNOW... 💫" },
    //     { time: 2600, text: "❤️❤️❤️" },
    //     { time: 3500, text: "💓💓💓" },
    //     { time: 5100, text: "💞" },
    //     { time: 6000, text: "✨🌙 HUME TUMSE MOHABBAT..." },
    //     { time: 8000, text: "🎵💫 HUII HAI... 💕" },
    //     { time: 9900, text: "🌹💖 OH JAANEMAN... 🎶" },
    //     { time: 12000, text: "💞💖 DO YOU KNOW... 🌟" }
    // ];

    // Audio variables
    let audio;
    let audioContext;
    let analyser;
    let dataArray;
    let source;

    // Font loader and font
    let fontLoader;
    let loadedFont;
    let lyricTimers = [];

    const body = document.body;
    const controlsElement = document.getElementById('controls');
    const lyricsContainer = document.getElementById('lyrics-container');
    const lyricsElement = document.getElementById('lyrics');
    const playButton = document.getElementById('playMusic');
    const pulseButton = document.getElementById('pulsateToggle');
    const themeButton = document.getElementById('themeToggle');
    const themeButtonLabel = themeButton ? themeButton.querySelector('.theme-toggle-text') : null;
    const letterModal = document.getElementById('letterModal');
    const themeDock = document.getElementById('themeDock');
    let currentTheme = 'dark';

    function clearLyricTimers() {
        lyricTimers.forEach((timerId) => clearTimeout(timerId));
        lyricTimers = [];
    }

    function clearLyrics() {
        clearLyricTimers();
        lyricsElement.innerHTML = '';
        shownLyrics.clear();
        lastLyricsTime = 0;
    }

    function pausePlayback(resetLine = true) {
        if (audio) {
            audio.pause();
        }

        isPlaying = false;
        body.classList.remove('music-on');
        playButton.innerHTML = '<span class="btn-icon">🎵</span><span class="btn-text">Play Music</span>';
        playButton.classList.remove('playing');
        lyricsContainer.classList.remove('show');

        if (resetLine) {
            clearLyrics();
        }
    }

    function syncThemeButton() {
        if (!themeButton) return;

        const isLight = currentTheme === 'light';
        themeButton.setAttribute('aria-pressed', String(isLight));
        themeButton.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');

        if (themeButtonLabel) {
            themeButtonLabel.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        }
    }

    function applyTheme(theme) {
        currentTheme = theme === 'light' ? 'light' : 'dark';
        body.classList.toggle('light-theme', currentTheme === 'light');
        syncThemeButton();

        if (scene && scene.fog) {
            scene.fog.color.set(currentTheme === 'light' ? 0xffeef1 : 0x000015);
        }

        if (renderer) {
            renderer.toneMappingExposure = currentTheme === 'light' ? 1.05 : 1.2;
        }

        try {
            window.localStorage.setItem('heart-theme', currentTheme);
        } catch (error) {
            console.warn('Theme preference could not be saved.', error);
        }
    }

    function toggleTheme() {
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    }

    // Initialize the scene
    function init() {
        // Create scene
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000015, 10, 100);

        // Create camera with dramatic starting position
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.copy(cameraStartPosition);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        // Create renderer with enhanced settings
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        document.getElementById('container').appendChild(renderer.domElement);

        // Add orbit controls but disable them initially
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 3;
        controls.maxDistance = 15;
        controls.maxPolarAngle = Math.PI;
        controls.enabled = false;

        // Initialize font loader
        fontLoader = new THREE.FontLoader();

        // Load font and create scene elements
        loadFont();

        // Create enhanced lighting
        createEnhancedLighting();

        // Create heart geometry
        createHeart();

        // Add heart-shaped particles
        createHeartParticles();

        // Create floating elements
        createFloatingElements();

        // Setup audio
        setupAudio();

        // Event listeners
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('mousemove', onMouseMove);

        // Add button event listeners
        pulseButton.addEventListener('click', togglePulsation);
        // document.getElementById('colorChange').addEventListener('click', changeHeartColor);
        playButton.addEventListener('click', toggleMusic);
        themeButton.addEventListener('click', toggleTheme);
        document.getElementById('resetCamera').addEventListener('click', resetCamera);
        document.getElementById('viewLetter').addEventListener('click', showLetter);
        document.getElementById('closeLetter').addEventListener('click', hideLetter);

        // Close letter when clicking outside
        letterModal.addEventListener('click', (e) => {
            if (e.target.id === 'letterModal') {
                hideLetter();
            }
        });

        // Close letter with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideLetter();
            }
        });

        // Show controls with reduced delay but NOT lyrics
        setTimeout(() => {
            controlsElement.classList.add('show');
            themeDock.classList.add('show');
        }, 1200);

        let savedTheme = 'dark';
        try {
            savedTheme = window.localStorage.getItem('heart-theme') || 'dark';
        } catch (error) {
            console.warn('Theme preference could not be loaded.', error);
        }
        applyTheme(savedTheme);

        // Start animation loop
        animate();
    }

    function loadFont() {
        // Load a built-in font (we'll create simple text geometry if font loading fails)
        fontLoader.load(
            'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
            function (font) {
                loadedFont = font;
                create3DTexts();
                createLoveText(); // Create the special "I Love You" text
            },
            function (progress) {
                console.log('Font loading progress: ', progress);
            },
            function (error) {
                console.log('Font loading error, using simple geometry:', error);
                // Create simple text using CSS3D or basic geometry
                createSimple3DTexts();
                createSimpleLoveText(); // Create simple version
            }
        );
    }

    function createLoveText() {
        if (!loadedFont) return;

        const loveTextGeometry = new THREE.TextGeometry("I Love You", {
            font: loadedFont,
            size: 0.5, // Increased size for better mobile visibility
            height: 0.12, // Increased depth
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.04,
            bevelSize: 0.03,
            bevelOffset: 0,
            bevelSegments: 8
        });

        loveTextGeometry.computeBoundingBox();
        loveTextGeometry.translate(
            -(loveTextGeometry.boundingBox.max.x - loveTextGeometry.boundingBox.min.x) * 0.5,
            -(loveTextGeometry.boundingBox.max.y - loveTextGeometry.boundingBox.min.y) * 0.5,
            -(loveTextGeometry.boundingBox.max.z - loveTextGeometry.boundingBox.min.z) * 0.5
        );

        const loveTextMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff1155, // Brighter, more contrasting color
            emissive: 0x550011,
            metalness: 0.1,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            transparent: false, // Make it fully opaque for better visibility
            opacity: 1.0
        });

        loveText = new THREE.Mesh(loveTextGeometry, loveTextMaterial);

        // Position the text higher and closer for better mobile visibility
        loveText.position.set(0, -1.8, 0.5); // Moved up and forward

        // Animation properties
        loveText.userData = {
            originalPosition: loveText.position.clone(),
            originalScale: new THREE.Vector3(1, 1, 1),
            pulsePhase: 0
        };

        scene.add(loveText);
    }

    function createSimpleLoveText() {
        // Fallback: create simple "I Love You" text using basic geometry
        const loveTextGeometry = new THREE.BoxGeometry(2.5, 0.4, 0.2); // Increased size
        const loveTextMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff1155,
            emissive: 0x550011,
            metalness: 0.1,
            roughness: 0.1,
            transparent: false,
            opacity: 1.0
        });

        loveText = new THREE.Mesh(loveTextGeometry, loveTextMaterial);
        loveText.position.set(0, -1.8, 0.5); // Same positioning as 3D text

        loveText.userData = {
            originalPosition: loveText.position.clone(),
            originalScale: new THREE.Vector3(1, 1, 1),
            pulsePhase: 0
        };

        scene.add(loveText);
    }

    function create3DTexts() {
        if (!loadedFont) return;

        const textStrings = [
            "KuchuPuchu",
            "Forever",
            "My Heart",
            "Strawberry",
            "Darling"
        ];

        for (let i = 0; i < 12; i++) { // Reduced from 15 to 12 since we have special text now
            const textString = textStrings[Math.floor(Math.random() * textStrings.length)];

            const textGeometry = new THREE.TextGeometry(textString, {
                font: loadedFont,
                size: 0.3,
                height: 0.05,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.01,
                bevelOffset: 0,
                bevelSegments: 5
            });

            textGeometry.computeBoundingBox();
            textGeometry.translate(
                -(textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x) * 0.5,
                -(textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y) * 0.5,
                -(textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z) * 0.5
            );

            const textMaterial = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.85, 0.8, 0.7),
                emissive: new THREE.Color().setHSL(Math.random() * 0.1 + 0.85, 0.5, 0.3),
                metalness: 0.1,
                roughness: 0.3,
                transparent: true,
                opacity: 0.9
            });

            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // Position randomly around the scene (but not too close to the heart)
            const radius = Math.random() * 12 + 8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            textMesh.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );

            // Random rotation
            textMesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            // Scale variation
            const scale = Math.random() * 0.5 + 0.5;
            textMesh.scale.set(scale, scale, scale);

            // Animation properties
            textMesh.userData = {
                originalPosition: textMesh.position.clone(),
                originalRotation: textMesh.rotation.clone(),
                speed: Math.random() * 0.002 + 0.001,
                amplitude: Math.random() * 0.5 + 0.2,
                phase: Math.random() * Math.PI * 2,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                }
            };

            floatingTexts.push(textMesh);
            scene.add(textMesh);
        }
    }

    function createSimple3DTexts() {
        // Fallback: create simple 3D text using basic geometry
        for (let i = 0; i < 12; i++) {
            const textGeometry = new THREE.BoxGeometry(1, 0.2, 0.1);
            const textMaterial = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.85, 0.8, 0.7),
                emissive: new THREE.Color().setHSL(Math.random() * 0.1 + 0.85, 0.5, 0.3),
                metalness: 0.1,
                roughness: 0.3,
                transparent: true,
                opacity: 0.8
            });

            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // Position randomly around the scene
            const radius = Math.random() * 12 + 8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            textMesh.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );

            textMesh.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            const scale = Math.random() * 0.5 + 0.3;
            textMesh.scale.set(scale, scale, scale);

            textMesh.userData = {
                originalPosition: textMesh.position.clone(),
                originalRotation: textMesh.rotation.clone(),
                speed: Math.random() * 0.002 + 0.001,
                amplitude: Math.random() * 0.5 + 0.2,
                phase: Math.random() * Math.PI * 2,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                }
            };

            floatingTexts.push(textMesh);
            scene.add(textMesh);
        }
    }

    function createEnhancedLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        scene.add(ambientLight);

        // Main spotlight
        const mainLight = new THREE.SpotLight(0xff6699, 3, 100, Math.PI * 0.3, 0.5, 1);
        mainLight.position.set(0, 8, 8);
        mainLight.target.position.set(0, 0, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        scene.add(mainLight);
        scene.add(mainLight.target);

        // Rim lights for dramatic effect
        const rimLight1 = new THREE.PointLight(0x66ccff, 2, 50);
        rimLight1.position.set(-10, -3, 5);
        scene.add(rimLight1);

        const rimLight2 = new THREE.PointLight(0xffaa44, 1.5, 50);
        rimLight2.position.set(10, 3, -3);
        scene.add(rimLight2);

        // Color changing accent lights
        const accentLight1 = new THREE.PointLight(0xff4488, 1, 30);
        accentLight1.position.set(0, -5, 3);
        scene.add(accentLight1);

        // Store lights for animation
        scene.userData.lights = {
            main: mainLight,
            rim1: rimLight1,
            rim2: rimLight2,
            accent: accentLight1
        };
    }

    function createHeart() {
        // Enhanced heart shape with smoother curves
        const heartShape = new THREE.Shape();

        function heartCurve(t, scale = 0.045) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            return { x: x * scale, y: y * -scale };
        }

        const detail = 200;
        const firstPoint = heartCurve(0);
        heartShape.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i <= detail; i++) {
            const t = (i / detail) * Math.PI * 2;
            const pt = heartCurve(t);
            heartShape.lineTo(pt.x, pt.y);
        }

        const extrudeSettings = {
            steps: 6,
            depth: 0.9,
            bevelEnabled: true,
            bevelThickness: 0.15,
            bevelSize: 0.15,
            bevelSegments: 12,
            curveSegments: 40
        };

        const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
        geometry.computeVertexNormals();

        // Enhanced material with better reflections
        const material = new THREE.MeshPhysicalMaterial({
            color: heartColors[currentColorIndex].main,
            emissive: heartColors[currentColorIndex].emissive,
            metalness: 0.3,
            roughness: 0.2,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 0.95
        });

        heart = new THREE.Mesh(geometry, material);
        heart.scale.set(0.85, 0.85, 0.85);
        heart.rotation.x = Math.PI;
        heart.castShadow = true;
        heart.receiveShadow = true;
        scene.add(heart);
    }

    function createFloatingElements() {
        // Create floating musical notes and hearts
        const noteGeometry = new THREE.RingGeometry(0.05, 0.08, 8);
        const noteCount = 50;

        for (let i = 0; i < noteCount; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.85, 0.7, 0.8),
                transparent: true,
                opacity: Math.random() * 0.3 + 0.2
            });

            const note = new THREE.Mesh(noteGeometry, material);

            const radius = Math.random() * 8 + 5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            note.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );

            note.userData = {
                originalPosition: note.position.clone(),
                speed: Math.random() * 0.005 + 0.002,
                amplitude: Math.random() * 0.3 + 0.1,
                phase: Math.random() * Math.PI * 2
            };

            scene.add(note);
            scene.userData.floatingElements = scene.userData.floatingElements || [];
            scene.userData.floatingElements.push(note);
        }
    }

    function setupAudio() {
        // Create audio element for local file
        audio = new Audio();
        audio.src = './music.mp3';
        audio.loop = true;
        audio.preload = 'auto';

        // Set up Web Audio API for visualizations
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Connect audio to analyser when it's ready
        audio.addEventListener('canplaythrough', () => {
            if (!source) {
                source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
            }
        });

        // Handle audio events
        audio.addEventListener('timeupdate', () => {
            if (isPlaying) {
                currentTime = audio.currentTime * 1000;
                updateLyrics();
            }
        });

        audio.addEventListener('ended', () => {
            currentTime = 0;
            clearLyrics();
        });

        audio.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
            alert('Could not load audio file. Please make sure music.mp3 is in the same folder as your HTML file.');
        });
    }

    function createMiniHeartGeometry(scale = 0.008) {
        const heartShape = new THREE.Shape();

        function heartCurve(t, s = scale) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            return { x: x * s, y: y * -s };
        }

        const detail = 20;
        const firstPoint = heartCurve(0);
        heartShape.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i <= detail; i++) {
            const t = (i / detail) * Math.PI * 2;
            const pt = heartCurve(t);
            heartShape.lineTo(pt.x, pt.y);
        }

        const extrudeSettings = {
            depth: 0.004,
            bevelEnabled: false
        };

        return new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    }

    function createHeartParticles() {
        const miniHeartGeometry = createMiniHeartGeometry();
        const particleCount = 300;
        particles = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = Math.random() * 4 + 3;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const hue = Math.random() * 0.15 + 0.82;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.7);

            const material = new THREE.MeshPhysicalMaterial({
                color: color,
                emissive: color.clone().multiplyScalar(0.3),
                metalness: 0.1,
                roughness: 0.3,
                transparent: true,
                opacity: Math.random() * 0.6 + 0.4
            });

            const miniHeart = new THREE.Mesh(miniHeartGeometry, material);
            miniHeart.position.set(x, y, z);

            miniHeart.rotation.x = Math.random() * Math.PI * 2;
            miniHeart.rotation.y = Math.random() * Math.PI * 2;
            miniHeart.rotation.z = Math.random() * Math.PI * 2;

            miniHeart.userData = {
                originalPosition: new THREE.Vector3(x, y, z),
                speed: Math.random() * 0.01 + 0.005,
                amplitude: Math.random() * 0.25 + 0.1,
                phase: Math.random() * Math.PI * 2,
                colorSpeed: Math.random() * 0.5 + 0.5
            };

            particles.add(miniHeart);
        }

        scene.add(particles);
    }

    function updateCinematicIntro() {
        if (!cameraIntroActive) return;

        introProgress += 0.002;

        if (introProgress >= 1) {
            cameraIntroActive = false;
            controls.enabled = true;
            camera.position.set(0, 0, 5);
            return;
        }

        let eased;
        if (introProgress < 0.3) {
            const phase1 = introProgress / 0.3;
            eased = 1 - Math.pow(1 - phase1, 4);

            const spiralAngle = (1 - eased) * Math.PI * 2;
            const distance = THREE.MathUtils.lerp(18, 12, eased);
            const height = THREE.MathUtils.lerp(12, 6, eased);

            camera.position.x = Math.sin(spiralAngle) * distance * (1 - eased * 0.4);
            camera.position.y = height + Math.sin(introProgress * 8) * 0.2;
            camera.position.z = Math.cos(spiralAngle) * distance;

        } else if (introProgress < 0.7) {
            const phase2 = (introProgress - 0.3) / 0.4;
            eased = 1 - Math.pow(1 - phase2, 3);

            const sweepAngle = Math.PI * 1.8 * eased;
            const distance = THREE.MathUtils.lerp(12, 8, eased);
            const height = THREE.MathUtils.lerp(6, 2, eased);

            camera.position.x = Math.sin(sweepAngle) * distance;
            camera.position.y = height + Math.sin(introProgress * 10) * 0.1;
            camera.position.z = Math.cos(sweepAngle) * distance;

        } else {
            const phase3 = (introProgress - 0.7) / 0.3;
            eased = 1 - Math.pow(1 - phase3, 6);

            camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, eased * 0.9);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, eased * 0.9);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, 5, eased);
        }

        const lookTarget = new THREE.Vector3(
            Math.sin(introProgress * 5) * 0.03,
            Math.cos(introProgress * 4) * 0.02,
            0
        );
        camera.lookAt(lookTarget);
    }

    // New word-by-word lyrics animation function
    function updateLyrics() {
        if (!isPlaying || !audio) return;

        // Check if we need to reset when song loops
        if (currentTime < lastLyricsTime) {
            clearLyrics();
        }

        lyrics.forEach((lyric, index) => {
            if (currentTime >= lyric.time && !shownLyrics.has(index)) {
                shownLyrics.add(index);
                showLyricLine(lyric.text);
            }
        });

        lastLyricsTime = currentTime;
    }

    function showLyricLine(text) {
        // Clear previous lyrics
        clearLyricTimers();
        lyricsElement.innerHTML = '';

        // Create line container
        const line = document.createElement('div');
        line.className = 'lyric-line';
        lyricsElement.appendChild(line);

        // Split text into words and create word elements
        const words = text.split(' ');

        words.forEach((word, index) => {
            const wordElement = document.createElement('span');
            wordElement.className = 'word';
            wordElement.textContent = word;

            if (/[\u{1F300}-\u{1FAFF}\u2764\u2728]/u.test(word)) {
                wordElement.classList.add('emoji-word');
            } else if (index === words.length - 1 || index === 0) {
                wordElement.classList.add('accent-word');
            }

            line.appendChild(wordElement);

            const timerId = window.setTimeout(() => {
                animateWord(wordElement);
            }, index * 130);
            lyricTimers.push(timerId);
        });

        requestAnimationFrame(() => {
            line.classList.add('is-visible');
        });
    }

    function animateWord(wordElement) {
        wordElement.classList.add('is-visible');
    }

    function changeHeartColor() {
        currentColorIndex = (currentColorIndex + 1) % heartColors.length;
        const colors = heartColors[currentColorIndex];

        // Smooth color transition
        const targetColor = new THREE.Color(colors.main);
        const targetEmissive = new THREE.Color(colors.emissive);

        // Animate color change
        const startColor = heart.material.color.clone();
        const startEmissive = heart.material.emissive.clone();

        let progress = 0;
        const colorAnimation = () => {
            progress += 0.05;
            if (progress <= 1) {
                heart.material.color.lerpColors(startColor, targetColor, progress);
                heart.material.emissive.lerpColors(startEmissive, targetEmissive, progress);
                requestAnimationFrame(colorAnimation);
            }
        };
        colorAnimation();
    }

    function togglePulsation() {
        isPulsating = !isPulsating;
        pulseButton.innerHTML = isPulsating ?
            '<span class="btn-icon">💓</span><span class="btn-text">Stop Pulse</span>' :
            '<span class="btn-icon">💓</span><span class="btn-text">Start Pulse</span>';
    }

    function toggleMusic() {
        if (!isPlaying) {
            // Start playing
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            audio.play().then(() => {
                isPlaying = true;
                body.classList.add('music-on');
                playButton.innerHTML = '<span class="btn-icon">⏸️</span><span class="btn-text">Pause Music</span>';
                playButton.classList.add('playing');
                clearLyrics();
                lyricsContainer.classList.add('show');
            }).catch((error) => {
                console.error('Error playing audio:', error);
                alert('Could not play audio. Please check if the audio file exists and is accessible.');
            });
        } else {
            // Pause playing
            pausePlayback();
        }
    }

    function showLetter() {
        letterModal.classList.add('show');
        body.classList.add('letter-open');

        if (isPlaying) {
            pausePlayback();
        }
    }

    function hideLetter() {
        letterModal.classList.remove('show');
        body.classList.remove('letter-open');
    }

    function resetCamera() {
        cameraIntroActive = true;
        introProgress = 0;
        controls.enabled = false;
        camera.position.copy(cameraStartPosition);
    }

    // Missing event handler functions
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onMouseMove(event) {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;

        // Update cinematic intro
        updateCinematicIntro();

        // Update controls
        if (!cameraIntroActive) {
            controls.update();
        }

        // Keep the heart in slow motion so the scene feels polished instead of frantic.
        heart.rotation.y += 0.003;
        heart.rotation.x += 0.0008;

        // Music-reactive pulsation with a steadier baseline.
        if (isPulsating) {
            let pulseFactor = 1 + Math.sin(time * 2.6) * 0.08;

            if (isPlaying && analyser) {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                const normalizedAverage = average / 255;

                pulseFactor += normalizedAverage * 0.14;
            }

            heart.scale.set(0.85 * pulseFactor, 0.85 * pulseFactor, 0.85 * pulseFactor);
        }

        // Animate the special "I Love You" text with softer motion.
        if (loveText) {
            const { originalPosition, originalScale, pulsePhase } = loveText.userData;

            loveText.position.y = originalPosition.y + Math.sin(time * 0.75 + pulsePhase) * 0.14;
            loveText.position.z = originalPosition.z + Math.sin(time * 0.48 + pulsePhase) * 0.1;

            const scaleFactor = 1 + Math.sin(time * 1.3 + pulsePhase) * 0.09;
            loveText.scale.set(scaleFactor, scaleFactor, scaleFactor);

            loveText.rotation.y = Math.sin(time * 0.36) * 0.08;
            loveText.rotation.z = Math.sin(time * 0.26) * 0.04;

            const baseColor = new THREE.Color(0xff1155);
            const glowIntensity = 0.45 + Math.sin(time * 2.2) * 0.24;

            loveText.material.color.copy(baseColor).multiplyScalar(1 + glowIntensity * 0.3);
            loveText.material.emissive.copy(baseColor).multiplyScalar(0.3 + glowIntensity * 0.3);

            if (isPlaying && analyser && dataArray) {
                const bassData = dataArray.slice(0, dataArray.length / 4);
                const bassIntensity = (bassData.reduce((a, b) => a + b) / bassData.length) / 255;

                const musicScale = 1 + bassIntensity * 0.18;
                loveText.scale.multiplyScalar(musicScale);

                loveText.material.emissive.multiplyScalar(1 + bassIntensity * 0.45);
            }
        }

        if (scene.userData.lights) {
            const lights = scene.userData.lights;

            let bassIntensity = 1;
            if (isPlaying && analyser && dataArray) {
                const bassData = dataArray.slice(0, dataArray.length / 4);
                bassIntensity = 1 + (bassData.reduce((a, b) => a + b) / bassData.length) / 255;
            }

            lights.rim1.intensity = (1.7 + Math.sin(time * 0.72) * 0.4) * bassIntensity;
            lights.rim2.intensity = (1.25 + Math.cos(time * 0.58) * 0.3) * bassIntensity;
            lights.accent.color.setHSL(0.96 + Math.sin(time * 0.24) * 0.03, 0.72, 0.44);
        }

        // Keep particles airy and readable.
        particles.children.forEach((miniHeart, index) => {
            const { originalPosition, speed, amplitude, phase, colorSpeed } = miniHeart.userData;

            miniHeart.position.x = originalPosition.x + Math.sin(time * speed * 0.9 + phase) * amplitude;
            miniHeart.position.y = originalPosition.y + Math.cos(time * speed * 0.74 + phase) * amplitude * 0.55;
            miniHeart.position.z = originalPosition.z + Math.sin(time * speed * 1.05 + phase) * amplitude * 0.35;

            miniHeart.rotation.x += 0.007;
            miniHeart.rotation.y += 0.005;
            miniHeart.rotation.z += 0.003;

            const hue = 0.93 + Math.sin(time * colorSpeed * 0.2 + index * 0.24) * 0.03;
            const newColor = new THREE.Color().setHSL(hue, 0.82, 0.68);
            miniHeart.material.color.lerp(newColor, 0.025);
            miniHeart.material.emissive.copy(newColor).multiplyScalar(0.25);
        });

        // Float the surrounding words with less jitter.
        floatingTexts.forEach((textMesh, index) => {
            const { originalPosition, speed, amplitude, phase, rotationSpeed } = textMesh.userData;

            textMesh.position.x = originalPosition.x + Math.sin(time * speed * 0.92 + phase) * amplitude;
            textMesh.position.y = originalPosition.y + Math.cos(time * speed * 0.8 + phase) * amplitude * 0.55;
            textMesh.position.z = originalPosition.z + Math.sin(time * speed * 1.02 + phase) * amplitude * 0.3;

            textMesh.rotation.x += rotationSpeed.x * 0.75;
            textMesh.rotation.y += rotationSpeed.y * 0.75;
            textMesh.rotation.z += rotationSpeed.z * 0.75;

            if (isPlaying && analyser && dataArray) {
                const bassData = dataArray.slice(0, dataArray.length / 4);
                const bassIntensity = (bassData.reduce((a, b) => a + b) / bassData.length) / 255;

                const hue = 0.92 + Math.sin(time * 0.22 + index * 0.35) * 0.035;
                const newColor = new THREE.Color().setHSL(hue, 0.78, 0.68 + bassIntensity * 0.14);
                textMesh.material.color.lerp(newColor, 0.03);
                textMesh.material.emissive.copy(newColor).multiplyScalar(0.16 + bassIntensity * 0.24);
            }
        });

        if (scene.userData.floatingElements) {
            scene.userData.floatingElements.forEach((element, index) => {
                const { originalPosition, speed, amplitude, phase } = element.userData;
                element.position.x = originalPosition.x + Math.sin(time * speed * 0.9 + phase) * amplitude;
                element.position.y = originalPosition.y + Math.cos(time * speed * 0.72 + phase) * amplitude * 0.7;
                element.rotation.z += 0.004;

                element.material.opacity = 0.24 + Math.sin(time * speed * 1.8 + phase) * 0.18;
            });
        }

        if (!cameraIntroActive) {
            heart.rotation.x = Math.PI + mouseY * 0.1;
            heart.rotation.z = mouseX * 0.1;
        }

        renderer.render(scene, camera);
    }

    // Start the 3D scene
    init();
});
