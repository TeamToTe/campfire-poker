/**
 * Campfire & Dynamic Day/Night Cycle Canvas Scene - Premium RPG Edition
 * Features:
 * - Multi-layer Parallax Mountains & 3-layer Pine Forest
 * - Drifting Pixel Clouds with wind physics
 * - Campfire Stone Ring & 3D Textured Wooden Log Benches
 * - Textured Campground (Grass tufts, wildflowers, pebbles, moss)
 * - Butter-smooth Celestial Orbital Physics for Sun & Moon
 * - Day/Night Atmosphere Lighting & Fire-to-Smoke transition
 */

class CampfireScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Load Sun and Moon Image Assets
    this.sunImg = new Image();
    this.sunImg.src = 'assets/sun-removebg-preview.png';
    this.isSunLoaded = false;
    this.sunImg.onload = () => { this.isSunLoaded = true; };

    this.moonImg = new Image();
    this.moonImg.src = 'assets/moon-removebg-preview.png';
    this.isMoonLoaded = false;
    this.moonImg.onload = () => { this.isMoonLoaded = true; };

    // Simulation Time: 0.0 to 24.0 hours (Starts at 20:00 Night)
    this.timeOfDay = 20.0;
    this.timeSpeed = 0.25; // Smooth progression
    this.isTimePaused = false;
    this.syncRealTime = false;

    // Particle & Environment Systems
    this.stars = [];
    this.fireflies = [];
    this.embers = [];
    this.smokePuffs = [];
    this.clouds = [];
    this.groundFlora = [];
    this.stoneRing = [];

    this.width = 0;
    this.height = 0;
    this.animFrameId = null;
    this.lastTimestamp = performance.now();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 1. Generate Clouds
    this.clouds = [
      { x: 0.1, y: 0.12, w: 90, h: 24, speed: 0.00008, alpha: 0.45 },
      { x: 0.45, y: 0.08, w: 130, h: 30, speed: 0.00012, alpha: 0.55 },
      { x: 0.78, y: 0.15, w: 100, h: 26, speed: 0.00009, alpha: 0.40 }
    ];

    // 2. Generate Stars
    this.stars = [];
    for (let i = 0; i < 85; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.40,
        size: Math.random() > 0.82 ? 2 : 1,
        alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.015
      });
    }

    // 3. Generate Fireflies
    this.fireflies = [];
    for (let i = 0; i < 28; i++) {
      this.fireflies.push({
        x: Math.random(),
        y: 0.38 + Math.random() * 0.52,
        radius: 1.5 + Math.random() * 1.5,
        alpha: Math.random(),
        vx: (Math.random() - 0.5) * 0.0008,
        vy: (Math.random() - 0.5) * 0.0008,
        pulseSpeed: 0.02 + Math.random() * 0.03
      });
    }

    // 4. Generate Embers
    this.embers = [];
    for (let i = 0; i < 35; i++) {
      this.resetEmber(this.embers[i] = {});
    }

    // 5. Generate Smoke Puffs
    this.smokePuffs = [];
    for (let i = 0; i < 25; i++) {
      this.resetSmoke(this.smokePuffs[i] = {}, true);
    }

    // 6. Generate Ground Flora (Wildflowers, Grass tufts, Pebbles)
    this.groundFlora = [];
    const flowerColors = ['#F87171', '#FCD34D', '#60A5FA', '#F472B6', '#34D399'];
    for (let i = 0; i < 50; i++) {
      this.groundFlora.push({
        x: 0.05 + Math.random() * 0.90,
        y: 0.46 + Math.random() * 0.50,
        type: Math.random() > 0.4 ? 'grass' : (Math.random() > 0.5 ? 'flower' : 'pebble'),
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
        size: 2 + Math.random() * 3
      });
    }

    // 7. Campfire Stone Ring (8 circular stones around center pit)
    this.stoneRing = [];
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      this.stoneRing.push({
        ox: Math.cos(angle) * 32,
        oy: Math.sin(angle) * 12 + 4,
        rx: 7 + (i % 3) * 2,
        ry: 5 + (i % 2) * 2,
        color: i % 2 === 0 ? '#4B5563' : '#374151'
      });
    }

    this.loop(performance.now());
  }

  resize() {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || (window.innerHeight - 52);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  resetEmber(ember) {
    ember.x = 0.5 + (Math.random() - 0.5) * 0.035;
    ember.y = 0.52;
    ember.size = 1 + Math.random() * 2;
    ember.alpha = 1.0;
    ember.vx = (Math.random() - 0.5) * 0.0015;
    ember.vy = -0.002 - Math.random() * 0.003;
    ember.life = 0;
    ember.maxLife = 50 + Math.random() * 50;
  }

  resetSmoke(smoke, initial = false) {
    smoke.x = 0.5 + (Math.random() - 0.5) * 0.025;
    smoke.y = initial ? (0.35 + Math.random() * 0.17) : 0.52;
    smoke.radius = 4 + Math.random() * 5;
    smoke.maxRadius = 18 + Math.random() * 14;
    smoke.alpha = 0.7;
    smoke.vx = (Math.random() - 0.5) * 0.0008 + 0.0003;
    smoke.vy = -0.001 - Math.random() * 0.0015;
    smoke.life = initial ? Math.floor(Math.random() * 80) : 0;
    smoke.maxLife = 90 + Math.random() * 60;
  }

  setTimeOfDay(hours) {
    this.timeOfDay = ((hours % 24) + 24) % 24;
  }

  lerpColor(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const ah = parseInt(a.replace(/#/g, ''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const bh = parseInt(b.replace(/#/g, ''), 16);
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr}, ${rg}, ${rb})`;
  }

  getCelestialState() {
    const t = this.timeOfDay;

    // Sun progress
    let sunP = (t - 6.0) / 12.0;
    let sunVisible = (sunP >= -0.08 && sunP <= 1.08);
    let sunAlpha = 0;
    if (sunP >= 0 && sunP <= 1) {
      sunAlpha = Math.min(1.0, Math.sin(Math.PI * sunP) * 3.5);
    } else if (sunP > -0.08 && sunP < 0) {
      sunAlpha = Math.max(0, (sunP + 0.08) / 0.08 * 0.4);
    } else if (sunP > 1 && sunP <= 1.08) {
      sunAlpha = Math.max(0, (1.08 - sunP) / 0.08 * 0.4);
    }

    // Moon progress
    let moonT = ((t - 18.0) % 24.0 + 24.0) % 24.0;
    let moonP = moonT / 12.0;
    let moonVisible = (moonP >= -0.08 && moonP <= 1.08);
    let moonAlpha = 0;
    if (moonP >= 0 && moonP <= 1) {
      moonAlpha = Math.min(1.0, Math.sin(Math.PI * moonP) * 3.5);
    } else if (moonP > -0.08 && moonP < 0) {
      moonAlpha = Math.max(0, (moonP + 0.08) / 0.08 * 0.4);
    } else if (moonP > 1 && moonP <= 1.08) {
      moonAlpha = Math.max(0, (1.08 - moonP) / 0.08 * 0.4);
    }

    let daylightFactor = 0;
    if (t >= 6.0 && t <= 18.0) {
      daylightFactor = Math.sin(((t - 6.0) / 12.0) * Math.PI);
    }

    let fireIntensity = 1.0;
    if (t >= 6.0 && t <= 8.0) {
      fireIntensity = 1.0 - (t - 6.0) / 2.0;
    } else if (t > 8.0 && t < 16.5) {
      fireIntensity = 0.0;
    } else if (t >= 16.5 && t <= 18.5) {
      fireIntensity = (t - 16.5) / 2.0;
    } else {
      fireIntensity = 1.0;
    }

    return {
      sunVisible,
      sunP,
      sunAlpha: Math.max(0, Math.min(1, sunAlpha)),
      moonVisible,
      moonP,
      moonAlpha: Math.max(0, Math.min(1, moonAlpha)),
      daylightFactor,
      fireIntensity: Math.max(0, Math.min(1, fireIntensity))
    };
  }

  drawSky(celestial) {
    const t = this.timeOfDay;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);

    let c0, c1, c2, c3;
    if (t >= 0 && t < 6) {
      const factor = t / 6.0;
      c0 = this.lerpColor('#060410', '#1C1230', factor);
      c1 = this.lerpColor('#100D20', '#5B264F', factor);
      c2 = this.lerpColor('#0D141E', '#B35454', factor);
      c3 = this.lerpColor('#080D14', '#1A182E', factor);
    } else if (t >= 6 && t < 12) {
      const factor = (t - 6.0) / 6.0;
      c0 = this.lerpColor('#1C1230', '#1A3E8A', factor);
      c1 = this.lerpColor('#5B264F', '#2563EB', factor);
      c2 = this.lerpColor('#B35454', '#7DD3FC', factor);
      c3 = this.lerpColor('#1A182E', '#166534', factor);
    } else if (t >= 12 && t < 18) {
      const factor = (t - 12.0) / 6.0;
      c0 = this.lerpColor('#1A3E8A', '#130F2A', factor);
      c1 = this.lerpColor('#2563EB', '#682414', factor);
      c2 = this.lerpColor('#7DD3FC', '#D97706', factor);
      c3 = this.lerpColor('#166534', '#141424', factor);
    } else {
      const factor = (t - 18.0) / 6.0;
      c0 = this.lerpColor('#130F2A', '#060410', factor);
      c1 = this.lerpColor('#682414', '#100D20', factor);
      c2 = this.lerpColor('#D97706', '#0D141E', factor);
      c3 = this.lerpColor('#141424', '#080D14', factor);
    }

    grad.addColorStop(0, c0);
    grad.addColorStop(0.35, c1);
    grad.addColorStop(0.70, c2);
    grad.addColorStop(1.0, c3);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawClouds(celestial) {
    const cloudColor = celestial.daylightFactor > 0.3
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(165, 180, 252, 0.15)';

    this.ctx.fillStyle = cloudColor;
    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x > 1.1) c.x = -0.2;

      const cx = c.x * this.width;
      const cy = c.y * this.height;

      // Draw 3-layer pixel cloud puff
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, c.h * 0.6, 0, Math.PI * 2);
      this.ctx.arc(cx + c.w * 0.25, cy - c.h * 0.2, c.h * 0.8, 0, Math.PI * 2);
      this.ctx.arc(cx + c.w * 0.55, cy, c.h * 0.65, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawStars(celestial) {
    const starAlphaMultiplier = Math.max(0, 1.0 - celestial.daylightFactor * 1.6);
    if (starAlphaMultiplier <= 0) return;

    this.ctx.fillStyle = '#FFF8DC';
    for (const s of this.stars) {
      s.alpha += s.speed;
      const alphaVal = (0.3 + 0.7 * Math.abs(Math.sin(s.alpha))) * starAlphaMultiplier;
      this.ctx.globalAlpha = Math.max(0, alphaVal);
      this.ctx.fillRect(Math.floor(s.x * this.width), Math.floor(s.y * this.height), s.size, s.size);
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawCelestialBodies(celestial) {
    // 1. Draw Sun
    if (celestial.sunVisible && celestial.sunAlpha > 0.005) {
      const p = celestial.sunP;
      const sunX = this.width * (0.04 + 0.92 * p);
      const sunY = this.height * (0.46 - 0.38 * Math.sin(Math.PI * p));
      const sunSize = Math.max(68, Math.min(115, this.width * 0.082));

      this.ctx.save();
      this.ctx.globalAlpha = celestial.sunAlpha;

      const sunGlow = this.ctx.createRadialGradient(sunX, sunY, sunSize * 0.15, sunX, sunY, sunSize * 1.75);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
      sunGlow.addColorStop(0.35, 'rgba(251, 191, 36, 0.35)');
      sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      this.ctx.fillStyle = sunGlow;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, sunSize * 1.75, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      if (this.isSunLoaded) {
        this.ctx.drawImage(this.sunImg, sunX - sunSize / 2, sunY - sunSize / 2, sunSize, sunSize);
      } else {
        this.ctx.fillStyle = '#FDE047';
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, sunSize * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 2. Draw Moon
    if (celestial.moonVisible && celestial.moonAlpha > 0.005) {
      const p = celestial.moonP;
      const moonX = this.width * (0.04 + 0.92 * p);
      const moonY = this.height * (0.46 - 0.38 * Math.sin(Math.PI * p));
      const moonSize = Math.max(56, Math.min(98, this.width * 0.072));

      this.ctx.save();
      this.ctx.globalAlpha = celestial.moonAlpha;

      const moonGlow = this.ctx.createRadialGradient(moonX, moonY, moonSize * 0.15, moonX, moonY, moonSize * 1.6);
      moonGlow.addColorStop(0, 'rgba(224, 231, 255, 0.55)');
      moonGlow.addColorStop(0.35, 'rgba(147, 197, 253, 0.25)');
      moonGlow.addColorStop(1, 'rgba(30, 58, 138, 0)');
      this.ctx.fillStyle = moonGlow;
      this.ctx.beginPath();
      this.ctx.arc(moonX, moonY, moonSize * 1.6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      if (this.isMoonLoaded) {
        this.ctx.drawImage(this.moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      } else {
        this.ctx.fillStyle = '#E0E7FF';
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonSize * 0.38, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  // Multi-layer Mountain Range (Distant Horizon)
  drawMountains(celestial) {
    const nightMtn1 = '#090818';
    const dayMtn1 = '#1E293B';
    this.ctx.fillStyle = this.lerpColor(nightMtn1, dayMtn1, celestial.daylightFactor);

    // Far mountain peaks
    const h = this.height;
    const w = this.width;
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.45);
    this.ctx.lineTo(w * 0.15, h * 0.34);
    this.ctx.lineTo(w * 0.32, h * 0.42);
    this.ctx.lineTo(w * 0.50, h * 0.30);
    this.ctx.lineTo(w * 0.68, h * 0.40);
    this.ctx.lineTo(w * 0.85, h * 0.32);
    this.ctx.lineTo(w, h * 0.44);
    this.ctx.lineTo(w, h * 0.50);
    this.ctx.lineTo(0, h * 0.50);
    this.ctx.fill();
  }

  // 3-Layer Pine Forest Silhouette
  drawForestLayers(celestial) {
    const w = this.width;
    const h = this.height;

    // Layer 1: Distant Pine Forest (Darker, smaller trees)
    const nightL1 = '#0A0E17';
    const dayL1 = '#133529';
    this.ctx.fillStyle = this.lerpColor(nightL1, dayL1, celestial.daylightFactor);

    const countL1 = 20;
    const stepL1 = w / (countL1 - 2);
    for (let i = 0; i < countL1; i++) {
      const tx = i * stepL1 - 20;
      const ty = h * 0.46;
      const th = h * 0.28 + ((i * 17) % 25);
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty);
      this.ctx.lineTo(tx + stepL1 / 2, ty - th);
      this.ctx.lineTo(tx + stepL1, ty);
      this.ctx.fill();
    }

    // Layer 2: Midground Pine Forest with Layered Branches
    const nightL2 = '#070B12';
    const dayL2 = '#0E2E20';
    this.ctx.fillStyle = this.lerpColor(nightL2, dayL2, celestial.daylightFactor);

    const countL2 = 14;
    const stepL2 = w / (countL2 - 2);
    for (let i = 0; i < countL2; i++) {
      const tx = i * stepL2 - 15;
      const ty = h * 0.47;
      const th = h * 0.34;
      const cx = tx + stepL2 / 2;

      // Tier 1 (top tier)
      this.ctx.beginPath();
      this.ctx.moveTo(cx - stepL2 * 0.25, ty - th * 0.45);
      this.ctx.lineTo(cx, ty - th);
      this.ctx.lineTo(cx + stepL2 * 0.25, ty - th * 0.45);
      this.ctx.fill();

      // Tier 2 (mid tier)
      this.ctx.beginPath();
      this.ctx.moveTo(cx - stepL2 * 0.38, ty - th * 0.15);
      this.ctx.lineTo(cx, ty - th * 0.60);
      this.ctx.lineTo(cx + stepL2 * 0.38, ty - th * 0.15);
      this.ctx.fill();

      // Tier 3 (base tier)
      this.ctx.beginPath();
      this.ctx.moveTo(cx - stepL2 * 0.50, ty);
      this.ctx.lineTo(cx, ty - th * 0.30);
      this.ctx.lineTo(cx + stepL2 * 0.50, ty);
      this.ctx.fill();
    }
  }

  // Textured Camp Ground with grass patches, stones, flowers
  drawGround(celestial) {
    const w = this.width;
    const h = this.height;

    // Ground Gradient (from tree line down to bottom)
    const groundGrad = this.ctx.createLinearGradient(0, h * 0.44, 0, h);
    const nightG0 = '#080C12';
    const nightG1 = '#12101E';
    const dayG0 = '#14532D';
    const dayG1 = '#064E3B';

    groundGrad.addColorStop(0, this.lerpColor(nightG0, dayG0, celestial.daylightFactor));
    groundGrad.addColorStop(1, this.lerpColor(nightG1, dayG1, celestial.daylightFactor));

    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, h * 0.46, w, h * 0.54);

    // Render Ground Flora Details
    for (const f of this.groundFlora) {
      const fx = f.x * w;
      const fy = f.y * h;

      if (f.type === 'flower') {
        this.ctx.fillStyle = f.color;
        this.ctx.globalAlpha = 0.4 + celestial.daylightFactor * 0.5;
        this.ctx.fillRect(fx, fy, f.size, f.size);
        this.ctx.fillStyle = '#10B981';
        this.ctx.fillRect(fx, fy + f.size, f.size, f.size * 1.5);
      } else if (f.type === 'grass') {
        this.ctx.fillStyle = celestial.daylightFactor > 0.3 ? '#22C55E' : '#14532D';
        this.ctx.globalAlpha = 0.35 + celestial.daylightFactor * 0.4;
        this.ctx.fillRect(fx, fy, 2, 6);
        this.ctx.fillRect(fx + 3, fy - 2, 2, 8);
        this.ctx.fillRect(fx + 6, fy + 1, 2, 5);
      } else {
        // Pebble
        this.ctx.fillStyle = '#4B5563';
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(fx, fy, 5, 3);
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawCampfireGlow(celestial) {
    if (celestial.fireIntensity <= 0.05) return;

    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    const glowRadius = Math.max(90, Math.min(200, this.width * 0.22));
    const alphaScale = celestial.fireIntensity * (0.85 - celestial.daylightFactor * 0.5);

    const radial = this.ctx.createRadialGradient(cx, cy, 6, cx, cy, glowRadius);

    radial.addColorStop(0, `rgba(251, 191, 36, ${0.22 * alphaScale})`);
    radial.addColorStop(0.35, `rgba(245, 158, 11, ${0.11 * alphaScale})`);
    radial.addColorStop(0.75, `rgba(180, 83, 9, ${0.03 * alphaScale})`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = radial;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Circular Stone Ring around Campfire
  drawStoneRing() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    for (const stone of this.stoneRing) {
      this.ctx.fillStyle = stone.color;
      this.ctx.beginPath();
      this.ctx.ellipse(cx + stone.ox, cy + stone.oy, stone.rx, stone.ry, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Stone highlight
      this.ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
      this.ctx.beginPath();
      this.ctx.ellipse(cx + stone.ox - 1, cy + stone.oy - 1, stone.rx * 0.6, stone.ry * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawCampfire(celestial) {
    this.ctx.imageSmoothingEnabled = false;
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    // Stone Ring Foundation
    this.drawStoneRing();

    // Charcoal & Ash Pit
    this.ctx.fillStyle = '#18181B';
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + 3, 24, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 3D Pixel Wooden Logs
    this.ctx.fillStyle = '#3E1C06';
    this.ctx.fillRect(cx - 22, cy + 2, 44, 9);
    this.ctx.fillStyle = '#6B3410';
    this.ctx.fillRect(cx - 18, cy + 1, 36, 7);
    this.ctx.fillStyle = '#92400E';
    this.ctx.fillRect(cx - 14, cy + 2, 28, 4);

    // Glowing Coals under logs
    if (celestial.fireIntensity < 0.7) {
      this.ctx.fillStyle = '#B45309';
      this.ctx.fillRect(cx - 10, cy + 1, 20, 4);
      this.ctx.fillStyle = '#DC2626';
      this.ctx.fillRect(cx - 6, cy + 2, 12, 2);
    }

    // Dynamic Multi-layered Flames
    if (celestial.fireIntensity > 0.02) {
      const time = Date.now() * 0.01;
      const flicker1 = Math.sin(time) * 4 * celestial.fireIntensity;
      const flicker2 = Math.cos(time * 1.3) * 4 * celestial.fireIntensity;
      const flameHeight = 26 * celestial.fireIntensity;
      const flameWidth = 20 * celestial.fireIntensity;

      // Outer Flame (Red/Orange)
      this.ctx.fillStyle = '#EA580C';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - flameWidth - 2, cy + 4);
      this.ctx.lineTo(cx + flicker1, cy - flameHeight - 3 - flicker2);
      this.ctx.lineTo(cx + flameWidth + 2, cy + 4);
      this.ctx.fill();

      // Core Flame (Golden Yellow)
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - flameWidth, cy + 4);
      this.ctx.lineTo(cx + flicker1, cy - flameHeight - flicker2);
      this.ctx.lineTo(cx + flameWidth, cy + 4);
      this.ctx.fill();

      // Hot Inner Flame (Bright Yellow)
      const innerHeight = 17 * celestial.fireIntensity;
      const innerWidth = 11 * celestial.fireIntensity;
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - innerWidth, cy + 4);
      this.ctx.lineTo(cx - flicker2, cy - innerHeight);
      this.ctx.lineTo(cx + innerWidth, cy + 4);
      this.ctx.fill();

      // White Heart Center
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - 4, cy + 3);
      this.ctx.lineTo(cx, cy - 8 * celestial.fireIntensity);
      this.ctx.lineTo(cx + 4, cy + 3);
      this.ctx.fill();
    }
  }

  drawSmoke(celestial) {
    const smokeTargetAlpha = (1.0 - celestial.fireIntensity);
    if (smokeTargetAlpha <= 0.05) return;

    for (const s of this.smokePuffs) {
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      s.radius += 0.14;

      const progress = s.life / s.maxLife;
      s.alpha = (1.0 - progress) * 0.55 * smokeTargetAlpha;

      if (s.life >= s.maxLife) {
        this.resetSmoke(s);
      }

      this.ctx.fillStyle = '#9CA3AF';
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.beginPath();
      this.ctx.arc(s.x * this.width, s.y * this.height, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawEmbers(celestial) {
    if (celestial.fireIntensity <= 0.1) return;

    for (const e of this.embers) {
      e.life++;
      e.x += e.vx;
      e.y += e.vy;
      e.alpha = (1.0 - (e.life / e.maxLife)) * celestial.fireIntensity;

      if (e.life >= e.maxLife) {
        this.resetEmber(e);
      }

      this.ctx.fillStyle = '#FDE047';
      this.ctx.globalAlpha = Math.max(0, e.alpha);
      this.ctx.fillRect(Math.floor(e.x * this.width), Math.floor(e.y * this.height), e.size, e.size);
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawFireflies(celestial) {
    const fireflyAlphaMult = Math.max(0, 1.0 - celestial.daylightFactor * 1.5);
    if (fireflyAlphaMult <= 0) return;

    for (const f of this.fireflies) {
      f.x += f.vx;
      f.y += f.vy;
      f.alpha += f.pulseSpeed;

      if (f.x < 0) f.x = 1;
      if (f.x > 1) f.x = 0;
      if (f.y < 0.2) f.y = 0.8;
      if (f.y > 0.9) f.y = 0.3;

      const a = (0.2 + 0.8 * Math.abs(Math.sin(f.alpha))) * fireflyAlphaMult;
      this.ctx.fillStyle = '#FACC15';
      this.ctx.globalAlpha = a;
      this.ctx.fillRect(Math.floor(f.x * this.width), Math.floor(f.y * this.height), f.radius, f.radius);
    }
    this.ctx.globalAlpha = 1.0;
  }

  // 3D Pixel Wood Benches with Tree Bark, End Grain Rings & Moss
  drawSeatingLogs(celestial) {
    this.ctx.imageSmoothingEnabled = false;
    const w = this.width;
    const h = this.height;

    const barkColor = '#271406';
    const woodFaceColor = '#592D0D';
    const woodHighlight = '#8A4A1C';
    const mossColor = '#15803D';

    const drawLogBench = (x, y, bw, bh) => {
      // Bark Shadow & Base
      this.ctx.fillStyle = barkColor;
      this.ctx.fillRect(x, y, bw, bh);
      this.ctx.strokeStyle = '#180B03';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, bw, bh);

      // Top Wood Plank Face
      this.ctx.fillStyle = woodFaceColor;
      this.ctx.fillRect(x + 2, y + 2, bw - 4, bh - 6);

      // Highlight grain line
      this.ctx.fillStyle = woodHighlight;
      this.ctx.fillRect(x + 4, y + 3, bw - 8, 2);

      // Wood End-grain Ring on Left
      this.ctx.fillStyle = '#A16207';
      this.ctx.beginPath();
      this.ctx.ellipse(x + 4, y + bh / 2, 3, bh * 0.35, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Moss patch on bench edge
      this.ctx.fillStyle = mossColor;
      this.ctx.fillRect(x + bw * 0.65, y - 1, 8, 3);
    };

    const isMobile = w < 600;

    if (isMobile) {
      // Log 0: South Log (Bottom)
      drawLogBench(w * 0.22, h * 0.72, w * 0.56, 14);
      // Log 1: West Log (Left)
      drawLogBench(2, h * 0.38, 12, h * 0.20);
      // Log 2: North Log (Top)
      drawLogBench(w * 0.24, h * 0.18, w * 0.52, 12);
      // Log 3: East Log (Right)
      drawLogBench(w - 14, h * 0.38, 12, h * 0.20);
    } else {
      // Log 0: South Log (Bottom)
      drawLogBench(w * 0.33, h * 0.72, w * 0.34, 18);
      // Log 1: West Log (Left)
      drawLogBench(w * 0.08, h * 0.44, 26, h * 0.22);
      // Log 2: North Log (Top)
      drawLogBench(w * 0.36, h * 0.23, w * 0.28, 16);
      // Log 3: East Log (Right)
      drawLogBench(w * 0.88, h * 0.44, 26, h * 0.22);
    }
  }

  getFormattedTime() {
    const hours = Math.floor(this.timeOfDay);
    const minutes = Math.floor((this.timeOfDay % 1) * 60);
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const h12 = (hours % 12 === 0) ? 12 : (hours % 12);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const icon = (hours >= 6 && hours < 18) ? '☀️' : '🌙';
    return `${icon} ${h12}:${mStr} ${ampm}`;
  }

  loop(timestamp) {
    const deltaSec = (timestamp - this.lastTimestamp) / 1000.0;
    this.lastTimestamp = timestamp;

    if (!this.isTimePaused) {
      if (this.syncRealTime) {
        const now = new Date();
        this.timeOfDay = now.getHours() + now.getMinutes() / 60.0 + now.getSeconds() / 3600.0;
      } else {
        this.timeOfDay = (this.timeOfDay + this.timeSpeed * deltaSec) % 24.0;
      }
    }

    const celestial = this.getCelestialState();

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawSky(celestial);
    this.drawClouds(celestial);
    this.drawStars(celestial);
    this.drawCelestialBodies(celestial);
    this.drawMountains(celestial);
    this.drawForestLayers(celestial);
    this.drawGround(celestial);
    this.drawCampfireGlow(celestial);
    this.drawCampfire(celestial);
    this.drawSmoke(celestial);
    this.drawEmbers(celestial);
    this.drawFireflies(celestial);

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.getFormattedTime(), this.timeOfDay, celestial);
    }

    this.animFrameId = requestAnimationFrame((ts) => this.loop(ts));
  }
}

window.CampfireScene = CampfireScene;
