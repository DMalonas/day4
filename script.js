    // THREEJS RELATED VARIABLES
    var scene,
        camera,
        controls,
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane,
        shadowLight,
        backLight,
        light,
        renderer,
        container;

    // SCENE
    var floor, bird1, bird2, bird3, sun, sunParticles = [];

    // SUN VARIABLES
    var clickCount = 0;
    var lastClickTime = 0;
    var clickTimeout;
    var sunExploded = false;

    // SCREEN VARIABLES
    var HEIGHT,
        WIDTH,
        windowHalfX,
        windowHalfY,
        mousePos = {x:0, y:0};

    // NAME ANIMATION
    const nameToAnimate = "Loukas-Vetoulis";
    const nameContainer = document.getElementById('animated-name-container');
    const graffitiNameDiv = document.getElementById('graffiti-name');

    function animateName() {
        if (!graffitiNameDiv || !nameContainer) return;

        nameToAnimate.split("").forEach(char => {
            const span = document.createElement('span');
            span.textContent = char === " " ? "\u00A0" : char; // Use non-breaking space for actual spaces
            graffitiNameDiv.appendChild(span);
        });

        const letters = graffitiNameDiv.querySelectorAll('span');
        const tl = gsap.timeline();

        tl.set(letters, {
            y: (i) => (i % 2 === 0 ? -100 : 100) + Math.random() * 50 - 25, // Start above/below
            x: Math.random() * 40 - 20,
            rotation: () => Math.random() * 60 - 30, // Random initial rotation
            scale: 0.5, // Start smaller
            opacity: 0
        });

        tl.to(letters, {
            duration: 0.8, // Faster, more punchy
            opacity: 1,
            y: 0,
            x: 0,
            rotation: 0,
            scale: 1,
            ease: "elastic.out(1, 0.5)", // Bouncy effect
            stagger: {
                each: 0.07, // Time between each letter animation
                from: "random" // Letters appear in a randomish order for graffiti feel
            }
        })
        .to(letters, {
            duration: 0.6,
            opacity: 0,
            y: (i) => (i % 2 === 0 ? -80 : 80), // Fly off screen
            stagger: {
                each: 0.05,
                from: "end"
            },
            delay: 3 // Keep name visible for 3 seconds before fading
        }, "+=3") // Delay added here explicitly as well for clarity
        .set(nameContainer, { display: "none" }); // Hide container after animation
    }


    // SUN CLASS
    function Sun() {
      this.threegroup = new THREE.Group();
      this.threegroup.position.set(-500, 400, 0);
      this.threegroup.scale.set(1.4, 1.4, 1.4);

      // Central body
      var geom = new THREE.BoxGeometry(60, 60, 60);
      var mat = new THREE.MeshLambertMaterial({
        color: 0xffde79,
      });
      this.body = new THREE.Mesh(geom, mat);
      this.threegroup.add(this.body);

      // Rays: 8 rays in a circle
      var rayGeom = new THREE.BoxGeometry(80, 10, 10);
      for (var i = 0; i < 8; i++) {
        var angle = (i / 8) * Math.PI * 2;
        var ray = new THREE.Mesh(rayGeom, mat.clone());
        ray.position.x = Math.cos(angle) * 70;
        ray.position.y = Math.sin(angle) * 70;
        ray.rotation.z = angle;
        this.threegroup.add(ray);
      }

      this.threegroup.traverse(function(object) {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    Sun.prototype.explode = function() {
      var sunPos = this.threegroup.position.clone();

      this.threegroup.visible = false;
      sunExploded = true;

      for (var i = 0; i < 40; i++) {
        var particleGeom = new THREE.BoxGeometry(15, 15, 15);
        var particleMat = new THREE.MeshLambertMaterial({
          color: this.body.material.color.getHex(),
        });

        var particle = new THREE.Mesh(particleGeom, particleMat);
        particle.position.copy(sunPos);

        particle.userData.targetPosition = new THREE.Vector3(
          sunPos.x + (Math.random() - 0.5) * 500,
          sunPos.y + (Math.random() - 0.5) * 500,
          sunPos.z + (Math.random() - 0.5) * 500
        );

        particle.castShadow = true;
        scene.add(particle);
        sunParticles.push(particle);
      }

      sunParticles.forEach(function(particle) {
        gsap.to(particle.position, {
          duration: 1,
          x: particle.userData.targetPosition.x,
          y: particle.userData.targetPosition.y,
          z: particle.userData.targetPosition.z,
          ease: "power2.out"
        });
        gsap.to(particle.rotation, {
            duration: 1,
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            ease: "power2.out"
        });
      });

      setTimeout(this.reassemble.bind(this), 2000);
    };

    Sun.prototype.reassemble = function() {
      var sunPos = this.threegroup.position.clone();

      sunParticles.forEach(function(particle, index) {
        gsap.to(particle.position, {
          duration: 1,
          x: sunPos.x,
          y: sunPos.y,
          z: sunPos.z,
          ease: "power2.inOut",
          delay: index * 0.02,
          onComplete: () => {
            scene.remove(particle);
            if (index === sunParticles.length - 1) {
              this.threegroup.visible = true;
              sunExploded = false;
              sunParticles = [];
            }
          }
        });
      }.bind(this));
    };

	Sun.prototype.updateColor = function() {
	  if (!this.body) return;

	  const colors = [0xffde79, 0xffa07a, 0xffcc00, 0xff8855, 0xffe066];
	  let index = 0;
      const sunMaterial = this.body.material;

      const updateColors = () => {
        index = (index + 1) % colors.length;
        const newColor = colors[index];
        sunMaterial.color.setHex(newColor);

        this.threegroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.color.setHex(newColor);
          }
        });
      };
      updateColors();
	  setInterval(updateColors, 5000);
	};


    // INIT THREE JS, SCREEN AND MOUSE EVENTS
    function init() {
      scene = new THREE.Scene();
      HEIGHT = window.innerHeight;
      WIDTH = window.innerWidth;
      aspectRatio = WIDTH / HEIGHT;
      fieldOfView = 60;
      nearPlane = 1;
      farPlane = 2000;
      camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
      );
      camera.position.z = 1000;
      camera.position.y = 300;
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(WIDTH, HEIGHT);
      renderer.shadowMap.enabled = true;

      container = document.getElementById('world');
      container.appendChild(renderer.domElement);

      windowHalfX = WIDTH / 2;
      windowHalfY = HEIGHT / 2;

      window.addEventListener('resize', onWindowResize, false);
      document.addEventListener('mousemove', handleMouseMove, false);
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, false);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      renderer.domElement.addEventListener('click', handleClick, false);
    }

    function onWindowResize() {
      HEIGHT = window.innerHeight;
      WIDTH = window.innerWidth;
      windowHalfX = WIDTH / 2;
      windowHalfY = HEIGHT / 2;
      renderer.setSize(WIDTH, HEIGHT);
      camera.aspect = WIDTH / HEIGHT;
      camera.updateProjectionMatrix();
    }

    function handleMouseMove(event) {
      mousePos = {x: event.clientX, y: event.clientY};
    }

    function handleTouchStart(event) {
      if (event.touches.length > 0) {
        event.preventDefault(); // Prevent scrolling/zooming while interacting
        mousePos = {x: event.touches[0].pageX, y: event.touches[0].pageY};
      }
    }

    function handleTouchEnd(event) {
      // Optional: reset mousePos to center if no touches, or leave as is
      // if (event.touches.length === 0) {
      //   mousePos = {x: windowHalfX, y: windowHalfY};
      // }
    }

    function handleTouchMove(event) {
      if (event.touches.length > 0) {
        event.preventDefault(); // Prevent scrolling/zooming
        mousePos = {x: event.touches[0].pageX, y: event.touches[0].pageY};
      }
    }

    function handleClick(event) {
      if (!sun || sunExploded) return;

      var mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      var intersects = raycaster.intersectObject(sun.threegroup, true);

      if (intersects.length > 0) {
        var currentTime = Date.now();
        var timeDiff = currentTime - lastClickTime;

        if (timeDiff > 2000) {
          clickCount = 0;
        }

        clickCount++;
        lastClickTime = currentTime;

        var counterEl = document.getElementById('click-counter');
        var counterValueEl = document.getElementById('sun-click-value');

        if (counterValueEl) counterValueEl.textContent = clickCount;
        if (counterEl) counterEl.classList.add('show');

        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(function() {
          if (counterEl) counterEl.classList.remove('show');
        }, 1500);

        if (clickCount >= 5) {
          sun.explode();
          clickCount = 0;
          if (counterEl) counterEl.classList.remove('show');
        }
      }
    }

    function createLights() {
      light = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      scene.add(light);

      shadowLight = new THREE.DirectionalLight(0xffffff, 0.6);
      shadowLight.position.set(200, 200, 200);
      shadowLight.castShadow = true;
      shadowLight.shadow.mapSize.width = 2048;
      shadowLight.shadow.mapSize.height = 2048;
      scene.add(shadowLight);
    }

    // BIRD CLASS
    Bird = function() {
      this.rSegments = 4;
      this.hSegments = 3;
      this.bodyBirdInitPositions = [];
      this.vAngle = this.hAngle = 0;
      this.normalSkin = {r:255/255, g:222/255, b:121/255};
      this.shySkin = {r:255/255, g:157/255, b:101/255};
      this.color = { ...this.normalSkin };
      this.side = "left";

      this.shyAngles = {h:0, v:0};
      this.behaviourInterval = null; // Initialize behaviourInterval
      this.intervalRunning = false;

      this.threegroup = new THREE.Group();

      this.yellowMat = new THREE.MeshLambertMaterial ({ color: 0xffde79 });
      this.whiteMat = new THREE.MeshLambertMaterial ({ color: 0xffffff });
      this.blackMat = new THREE.MeshLambertMaterial ({ color: 0x000000 });
      this.orangeMat = new THREE.MeshLambertMaterial ({ color: 0xff5535 });

      this.wingLeftGroup = new THREE.Group();
      this.wingRightGroup = new THREE.Group();

      var wingGeom = new THREE.BoxGeometry(60, 60, 5);
      var wingLeft = new THREE.Mesh(wingGeom, this.yellowMat);
      this.wingLeftGroup.add(wingLeft);
      this.wingLeftGroup.position.set(70, 0, 0);
      this.wingLeftGroup.rotation.y = Math.PI/2;
      wingLeft.rotation.x = -Math.PI/4;

      var wingRight = new THREE.Mesh(wingGeom, this.yellowMat.clone());
      this.wingRightGroup.add(wingRight);
      this.wingRightGroup.position.set(-70, 0, 0);
      this.wingRightGroup.rotation.y = -Math.PI/2;
      wingRight.rotation.x = -Math.PI/4;

      var bodyGeom = new THREE.CylinderGeometry(40, 70, 200, this.rSegments, this.hSegments);
      this.bodyBird = new THREE.Mesh(bodyGeom, this.yellowMat);
      this.bodyBird.position.y = 70;


      this.bodyVerticesLength = bodyGeom.attributes.position.count;
      const positions = bodyGeom.attributes.position.array;
      for (let i = 0; i < this.bodyVerticesLength; i++) {
        this.bodyBirdInitPositions.push({ x: positions[i*3], y: positions[i*3+1], z: positions[i*3+2] });
      }

      this.threegroup.add(this.bodyBird);
      this.threegroup.add(this.wingLeftGroup);
      this.threegroup.add(this.wingRightGroup);

      this.face = new THREE.Group();
      var eyeGeom = new THREE.BoxGeometry(60, 60, 10);
      var irisGeom = new THREE.BoxGeometry(10, 10, 10);

      this.leftEye = new THREE.Mesh(eyeGeom, this.whiteMat);
      this.leftEye.position.set(-30, 120, 35);
      this.leftEye.rotation.y = -Math.PI/4;

      this.leftIris = new THREE.Mesh(irisGeom, this.blackMat);
      this.leftIris.position.set(-30, 120, 40);
      this.leftIris.rotation.y = -Math.PI/4;

      this.rightEye = new THREE.Mesh(eyeGeom, this.whiteMat.clone());
      this.rightEye.position.set(30, 120, 35);
      this.rightEye.rotation.y = Math.PI/4;

      this.rightIris = new THREE.Mesh(irisGeom, this.blackMat.clone());
      this.rightIris.position.set(30, 120, 40);
      this.rightIris.rotation.y = Math.PI/4;

      var beakGeom = new THREE.CylinderGeometry(0, 20, 20, 4, 1);
      this.beak = new THREE.Mesh(beakGeom, this.orangeMat);
      this.beak.position.set(0, 70, 65);
      this.beak.rotation.x = Math.PI/2;

      this.face.add(this.rightEye, this.rightIris, this.leftEye, this.leftIris, this.beak);

      var featherGeom = new THREE.BoxGeometry(10, 20, 5);
      this.feather1 = new THREE.Mesh(featherGeom, this.yellowMat);
      this.feather1.position.set(0, 185, 55);
      this.feather1.rotation.x = Math.PI/4;
      this.feather1.scale.set(1.5, 1.5, 1);

      this.feather2 = new THREE.Mesh(featherGeom, this.yellowMat.clone());
      this.feather2.position.set(20, 180, 50);
      this.feather2.rotation.x = Math.PI/4;
      this.feather2.rotation.z = -Math.PI/8;

      this.feather3 = new THREE.Mesh(featherGeom, this.yellowMat.clone());
      this.feather3.position.set(-20, 180, 50);
      this.feather3.rotation.x = Math.PI/4;
      this.feather3.rotation.z = Math.PI/8;

      this.face.add(this.feather1, this.feather2, this.feather3);
      this.threegroup.add(this.face);

      this.threegroup.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    Bird.prototype.look = function(hAngle, vAngle) {
      this.hAngle = hAngle;
      this.vAngle = vAngle;

      this.leftIris.position.y = 120 - vAngle * 15;
      this.leftIris.position.x = -30 + hAngle * 5;
      this.leftIris.position.z = 40 + Math.abs(hAngle) * 2;

      this.rightIris.position.y = 120 - vAngle * 15;
      this.rightIris.position.x = 30 + hAngle * 5;
      this.rightIris.position.z = 40 + Math.abs(hAngle) * 2;

      this.leftEye.position.y = this.rightEye.position.y = 120 - vAngle * 5;

      this.beak.position.y = 70 - vAngle * 10;
      this.beak.rotation.x = Math.PI/2 + vAngle/3;

      this.feather1.rotation.x = (Math.PI/4) + (vAngle/2);
      this.feather1.position.y = 185 - vAngle * 5;

      [this.feather2, this.feather3].forEach(f => {
        f.rotation.x = (Math.PI/4) + (vAngle/2);
        f.position.y = 180 - vAngle * 5;
      });

      const bodyPositions = this.bodyBird.geometry.attributes.position;
      for (var i = 0; i < this.bodyVerticesLength; i++) {
        var line = Math.floor(i / (this.rSegments + 1));
        var tvInitPos = this.bodyBirdInitPositions[i];
        var a = 0;
        if (line < this.hSegments -1) {
            a = hAngle / ( (this.hSegments - 1 - line) * 0.5 + 1);
        }

        var tx = tvInitPos.x * Math.cos(a) - tvInitPos.z * Math.sin(a);
        var tz = tvInitPos.x * Math.sin(a) + tvInitPos.z * Math.cos(a);

        bodyPositions.setXYZ(i, tx, tvInitPos.y, tz);
      }
      this.bodyBird.geometry.attributes.position.needsUpdate = true;

      this.face.rotation.y = hAngle;
    }

    Bird.prototype.lookAway = function(fastMove) {
      const speed = fastMove ? 0.4 : 1.5;
      const ease = fastMove ? "power2.out" : "sine.inOut"; // Changed from Strong.ease for GSAP
      const col = fastMove ? this.shySkin : this.normalSkin;

      let targetVAngle = (Math.random() * 0.6 - 0.3) * Math.PI;
      let targetHAngle;

      if (this.side === "right") {
        targetHAngle = (-0.5 + Math.random() * 0.5) * Math.PI/2;
      } else {
        targetHAngle = (0.5 - Math.random() * 0.5) * Math.PI/2; // Mirrored for left side
      }

      gsap.killTweensOf(this.shyAngles); // Use GSAP's killTweensOf
      gsap.to(this.shyAngles, { duration: speed, v: targetVAngle, h: targetHAngle, ease: ease });
      gsap.to(this.color, { duration: speed, r:col.r, g:col.g, b:col.b, ease: ease });
      gsap.to(this.beak.scale, { duration: speed, z:0.75 + Math.random()*0.25, x:0.5 + Math.random()*0.5, ease: ease });
    }

    Bird.prototype.stare = function() {
      const col = this.normalSkin;
      let targetHAngle;
      if (this.side === "right") {
        targetHAngle = Math.PI/3;
      } else {
        targetHAngle = -Math.PI/3;
      }
      gsap.to(this.shyAngles, { duration: 2, v:-.5, h:targetHAngle, ease: "sine.inOut" }); // Strong.easeInOut
      gsap.to(this.color, { duration: 2, r:col.r, g:col.g, b:col.b, ease: "sine.inOut" });
      gsap.to(this.beak.scale, { duration: 2, z:.8, x:1.5, ease: "sine.inOut" });
    }

    // CREATE FLOOR
    function createFloor() {
      floor = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(1000, 1000),
        new THREE.MeshBasicMaterial({color: 0xe0dacd, side: THREE.DoubleSide}) // Plane has one side by default
      );
      floor.rotation.x = -Math.PI/2;
      floor.position.y = -100; // Adjusted floor position to make birds more visible
      floor.receiveShadow = true;
      scene.add(floor);
    }

    // CREATE BIRDS AND SUN
    function createBirdsAndSun() {
      bird1 = new Bird();
      bird1.threegroup.position.x = 0;
      scene.add(bird1.threegroup);

      bird2 = new Bird();
      bird2.threegroup.position.x = -250;
      bird2.side = "right";
      bird2.threegroup.scale.set(.8, .8, .8);
      bird2.threegroup.position.y = -20; // Adjusted y slightly for scale difference
      scene.add(bird2.threegroup);

      bird3 = new Bird();
      bird3.threegroup.position.x = 250;
      bird3.side = "left";
      bird3.threegroup.scale.set(.8, .8, .8);
      bird3.threegroup.position.y = -20; // Adjusted y slightly
      scene.add(bird3.threegroup);

      sun = new Sun();
      scene.add(sun.threegroup);
	  sun.updateColor();
    }

    // MAIN LOOP
    function loop() {
      var tempHA = (mousePos.x - windowHalfX) / (windowHalfX * 0.5); // Normalize more aggressively for wider range with small mouse movements
      var tempVA = (mousePos.y - windowHalfY) / (windowHalfY * 0.5);
      var userHAngle = Math.min(Math.max(tempHA, -Math.PI/2.5), Math.PI/2.5); // Increased range a bit
      var userVAngle = Math.min(Math.max(tempVA, -Math.PI/2.5), Math.PI/2.5);
      bird1.look(userHAngle, userVAngle);

      // Bird 2 (right side) behavior
      if (bird1.hAngle < -Math.PI/6 && !bird2.intervalRunning) { // Threshold PI/6
          bird2.lookAway(true);
          bird2.intervalRunning = true;
          if (bird2.behaviourInterval) clearInterval(bird2.behaviourInterval); // Clear existing before setting new
          bird2.behaviourInterval = setInterval(() => bird2.lookAway(false), 2500); // 2.5s
      } else if (bird1.hAngle >= 0 && bird2.intervalRunning) { // Check bird1.hAngle > 0, means user looking towards bird2
          bird2.stare();
          clearInterval(bird2.behaviourInterval);
          bird2.behaviourInterval = null;
          bird2.intervalRunning = false;
      }

      // Bird 3 (left side) behavior
      if (bird1.hAngle > Math.PI/6 && !bird3.intervalRunning) {
          bird3.lookAway(true);
          bird3.intervalRunning = true;
          if (bird3.behaviourInterval) clearInterval(bird3.behaviourInterval);
          bird3.behaviourInterval = setInterval(() => bird3.lookAway(false), 2500);
      } else if (bird1.hAngle <= 0 && bird3.intervalRunning) { // Check bird1.hAngle < 0
          bird3.stare();
          clearInterval(bird3.behaviourInterval);
          bird3.behaviourInterval = null;
          bird3.intervalRunning = false;
      }


      bird2.look(bird2.shyAngles.h, bird2.shyAngles.v);
      bird2.bodyBird.material.color.setRGB(bird2.color.r, bird2.color.g, bird2.color.b); // Update color from GSAP animation

      bird3.look(bird3.shyAngles.h, bird3.shyAngles.v);
      bird3.bodyBird.material.color.setRGB(bird3.color.r, bird3.color.g, bird3.color.b);

      render();
      requestAnimationFrame(loop);
    }

    function render() {
      renderer.render(scene, camera);
    }

    // INITIALIZE EVERYTHING
    init();
    createLights();
    createFloor(); // Create floor before birds so birds can cast shadows on it.
    createBirdsAndSun();
    animateName(); // Call name animation
    loop();