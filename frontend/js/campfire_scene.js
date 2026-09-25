/**
 * Campfire & Dynamic Day/Night Cycle Canvas Scene
 * Features butter-smooth celestial orbital physics for Sun (06:00 - 18:00) & Moon (18:00 - 06:00),
 * continuous non-quantized subpixel positioning, rich atmosphere lighting gradients,
 * and realistic campfire-to-smoke daytime transitions.
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
    this.timeSpeed = 0.25; // Continuous smooth speed (~96s per full day)
    this.isTimePaused = false;
    this.syncRealTime = false;

    // Particle Systems
    this.stars = [];
    this.fireflies = [];
    this.embers = [];
    this.smokePuffs = [];

    this.width = 0;
    this.height = 0;
    this.animFrameId = null;
    this.lastTimestamp = performance.now();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Generate Stars (Night only)
    this.stars = [];
    for (let i = 0; i < 75; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.42,
        size: Math.random() > 0.85 ? 2 : 1,
        alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.015
      });
    }

    // Generate Fireflies
    this.fireflies = [];
    for (let i = 0; i < 24; i++) {
      this.fireflies.push({
        x: Math.random(),
        y: 0.35 + Math.random() * 0.55,
        radius: 1.5 + Math.random() * 1.5,
        alpha: Math.random(),
        vx: (Math.random() - 0.5) * 0.0008,
        vy: (Math.random() - 0.5) * 0.0008,
        pulseSpeed: 0.02 + Math.random() * 0.03
      });
    }

    // Generate Embers (Night campfire)
    this.embers = [];
    for (let i = 0; i < 35; i++) {
      this.resetEmber(this.embers[i] = {});
    }

    // Generate Smoke Puffs (Day extinction)
    this.smokePuffs = [];
    for (let i = 0; i < 25; i++) {
      this.resetSmoke(this.smokePuffs[i] = {}, true);
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
    ember.x = 0.5 + (Math.random() - 0.5) * 0.04;
    ember.y = 0.52;
    ember.size = 1 + Math.random() * 2;
    ember.alpha = 1.0;
    ember.vx = (Math.random() - 0.5) * 0.0015;
    ember.vy = -0.002 - Math.random() * 0.003;
    ember.life = 0;
    ember.maxLife = 50 + Math.random() * 50;
  }

  resetSmoke(smoke, initial = false) {
    smoke.x = 0.5 + (Math.random() - 0.5) * 0.03;
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

  // Smooth Color Interpolation Helper
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

  /**
   * Continuous Orbital Physics for Sun and Moon (06:00 <-> 18:00)
   * Eliminates quantization steps, clamping stalls, and stair-stepping jitter.
   */
  getCelestialState() {
    const t = this.timeOfDay;

    // --- SUN (06:00 -> 18:00) ---
    // Sun progress p: 0.0 at 6:00 AM, 0.5 at 12:00 PM, 1.0 at 6:00 PM
    let sunP = (t - 6.0) / 12.0;
    let sunVisible = (sunP >= -0.08 && sunP <= 1.08);
    let sunAlpha = 0;
    if (sunP >= 0 && sunP <= 1) {
      // Smooth sine fade-in / fade-out near horizon
      sunAlpha = Math.min(1.0, Math.sin(Math.PI * sunP) * 3.5);
    } else if (sunP > -0.08 && sunP < 0) {
      sunAlpha = Math.max(0, (sunP + 0.08) / 0.08 * 0.4);
    } else if (sunP > 1 && sunP <= 1.08) {
      sunAlpha = Math.max(0, (1.08 - sunP) / 0.08 * 0.4);
    }

    // --- MOON (18:00 -> 06:00) ---
    // Moon progress p: 0.0 at 6:00 PM, 0.5 at 00:00 Midnight, 1.0 at 6:00 AM
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

    // Daylight Factor (0.0 = midnight, 1.0 = noon)
    let daylightFactor = 0;
    if (t >= 6.0 && t <= 18.0) {
      daylightFactor = Math.sin(((t - 6.0) / 12.0) * Math.PI);
    }

    // Fire Intensity (1.0 at night, fades 6:00-8:00, off during day, reignites 16:30-18:30)
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
      // Night -> Dawn
      const factor = t / 6.0;
      c0 = this.lerpColor('#080614', '#201538', factor);
      c1 = this.lerpColor('#120E24', '#6B2D5C', factor);
      c2 = this.lerpColor('#101622', '#C25E5E', factor);
      c3 = this.lerpColor('#0A0F16', '#1F1E38', factor);
    } else if (t >= 6 && t < 12) {
      // Dawn -> Noon Day
      const factor = (t - 6.0) / 6.0;
      c0 = this.lerpColor('#201538', '#1E40AF', factor);
      c1 = this.lerpColor('#6B2D5C', '#3B82F6', factor);
      c2 = this.lerpColor('#C25E5E', '#93C5FD', factor);
      c3 = this.lerpColor('#1F1E38', '#15803D', factor);
    } else if (t >= 12 && t < 18) {
      // Noon Day -> Dusk
      const factor = (t - 12.0) / 6.0;
      c0 = this.lerpColor('#1E40AF', '#161233', factor);
      c1 = this.lerpColor('#3B82F6', '#782D19', factor);
      c2 = this.lerpColor('#93C5FD', '#EA580C', factor);
      c3 = this.lerpColor('#15803D', '#181829', factor);
    } else {
      // Dusk -> Midnight
      const factor = (t - 18.0) / 6.0;
      c0 = this.lerpColor('#161233', '#080614', factor);
      c1 = this.lerpColor('#782D19', '#120E24', factor);
      c2 = this.lerpColor('#EA580C', '#101622', factor);
      c3 = this.lerpColor('#181829', '#0A0F16', factor);
    }

    grad.addColorStop(0, c0);
    grad.addColorStop(0.35, c1);
    grad.addColorStop(0.70, c2);
    grad.addColorStop(1.0, c3);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStars(celestial) {
    const starAlphaMultiplier = Math.max(0, 1.0 - celestial.daylightFactor * 1.6);
    if (starAlphaMultiplier <= 0) return;

    this.ctx.fillStyle = '#FFF8DC';
    for (const s of this.stars) {
      s.alpha += s.speed;
      const alphaVal = (0.3 + 0.7 * Math.abs(Math.sin(s.alpha))) * starAlphaMultiplier;
      this.ctx.globalAlpha = Math.max(0, alphaVal);
      const sx = s.x * this.width;
      const sy = s.y * this.height;
      this.ctx.fillRect(Math.floor(sx), Math.floor(sy), s.size, s.size);
    }
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Render Sun and Moon with continuous subpixel coordinates
   * and high-quality image smoothing to eliminate all wobble and jitter.
   */
  drawCelestialBodies(celestial) {
    // 1. Draw Sun
    if (celestial.sunVisible && celestial.sunAlpha > 0.005) {
      const p = celestial.sunP;
      // Butter-smooth continuous horizontal & sinusoidal vertical path
      const sunX = this.width * (0.04 + 0.92 * p);
      const sunY = this.height * (0.46 - 0.38 * Math.sin(Math.PI * p));
      const sunSize = Math.max(68, Math.min(115, this.width * 0.082));

      this.ctx.save();
      this.ctx.globalAlpha = celestial.sunAlpha;

      // Sun Warm Halo Glow
      const sunGlow = this.ctx.createRadialGradient(sunX, sunY, sunSize * 0.15, sunX, sunY, sunSize * 1.75);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
      sunGlow.addColorStop(0.35, 'rgba(251, 191, 36, 0.35)');
      sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      this.ctx.fillStyle = sunGlow;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, sunSize * 1.75, 0, Math.PI * 2);
      this.ctx.fill();

      // Enable smooth image rendering for high-res PNG
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      if (this.isSunLoaded) {
        this.ctx.drawImage(
          this.sunImg,
          sunX - sunSize / 2,
          sunY - sunSize / 2,
          sunSize,
          sunSize
        );
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

      // Moon Soft Silver Halo Glow
      const moonGlow = this.ctx.createRadialGradient(moonX, moonY, moonSize * 0.15, moonX, moonY, moonSize * 1.6);
      moonGlow.addColorStop(0, 'rgba(224, 231, 255, 0.55)');
      moonGlow.addColorStop(0.35, 'rgba(147, 197, 253, 0.25)');
      moonGlow.addColorStop(1, 'rgba(30, 58, 138, 0)');
      this.ctx.fillStyle = moonGlow;
      this.ctx.beginPath();
      this.ctx.arc(moonX, moonY, moonSize * 1.6, 0, Math.PI * 2);
      this.ctx.fill();

      // Enable smooth image rendering
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      if (this.isMoonLoaded) {
        this.ctx.drawImage(
          this.moonImg,
          moonX - moonSize / 2,
          moonY - moonSize / 2,
          moonSize,
          moonSize
        );
      } else {
        this.ctx.fillStyle = '#E0E7FF';
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonSize * 0.38, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  drawTreesSilhouettes(celestial) {
    this.ctx.imageSmoothingEnabled = false;
    const nightTreeColor = '#090E14';
    const dayTreeColor = '#0F291E';
    this.ctx.fillStyle = this.lerpColor(nightTreeColor, dayTreeColor, celestial.daylightFactor);

    const treeCount = 14;
    const treeWidth = this.width / (treeCount - 2);

    for (let i = 0; i < treeCount; i++) {
      const tx = i * treeWidth - 20;
      const ty = this.height * 0.45;
      const th = this.height * 0.35;

      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty);
      this.ctx.lineTo(tx + treeWidth / 2, ty - th);
      this.ctx.lineTo(tx + treeWidth, ty);
      this.ctx.fill();
    }
  }

  drawCampfireGlow(celestial) {
    if (celestial.fireIntensity <= 0.05) return;

    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    const radial = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, this.width * 0.35);
    const alphaScale = celestial.fireIntensity * (1.0 - celestial.daylightFactor * 0.6);

    radial.addColorStop(0, `rgba(251, 191, 36, ${0.45 * alphaScale})`);
    radial.addColorStop(0.3, `rgba(245, 158, 11, ${0.25 * alphaScale})`);
    radial.addColorStop(0.7, `rgba(180, 83, 9, ${0.08 * alphaScale})`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = radial;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.width * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawCampfire(celestial) {
    this.ctx.imageSmoothingEnabled = false;
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    // Wooden Logs in Cross Formation
    this.ctx.fillStyle = '#451A03';
    this.ctx.fillRect(cx - 24, cy + 4, 48, 10);
    this.ctx.fillStyle = '#78350F';
    this.ctx.fillRect(cx - 16, cy + 2, 32, 8);

    // Glowing coals under logs
    if (celestial.fireIntensity < 0.6) {
      this.ctx.fillStyle = '#B45309';
      this.ctx.fillRect(cx - 10, cy + 1, 20, 4);
      this.ctx.fillStyle = '#DC2626';
      this.ctx.fillRect(cx - 6, cy + 2, 12, 2);
    }

    // Flame rendering
    if (celestial.fireIntensity > 0.02) {
      const time = Date.now() * 0.01;
      const flicker1 = Math.sin(time) * 4 * celestial.fireIntensity;
      const flicker2 = Math.cos(time * 1.3) * 4 * celestial.fireIntensity;
      const flameHeight = 24 * celestial.fireIntensity;
      const flameWidth = 18 * celestial.fireIntensity;

      // Core Flame (Orange/Yellow)
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - flameWidth, cy + 4);
      this.ctx.lineTo(cx + flicker1, cy - flameHeight - flicker2);
      this.ctx.lineTo(cx + flameWidth, cy + 4);
      this.ctx.fill();

      // Inner Flame (Hot Bright Yellow)
      const innerHeight = 16 * celestial.fireIntensity;
      const innerWidth = 10 * celestial.fireIntensity;
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.beginPath();
      this.ctx.moveTo(cx - innerWidth, cy + 4);
      this.ctx.lineTo(cx - flicker2, cy - innerHeight);
      this.ctx.lineTo(cx + innerWidth, cy + 4);
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
      s.radius += 0.12;

      const progress = s.life / s.maxLife;
      s.alpha = (1.0 - progress) * 0.55 * smokeTargetAlpha;

      if (s.life >= s.maxLife) {
        this.resetSmoke(s);
      }

      this.ctx.fillStyle = '#9CA3AF';
      this.ctx.globalAlpha = Math.max(0, s.alpha);
      this.ctx.beginPath();
      this.ctx.arc(
        s.x * this.width,
        s.y * this.height,
        s.radius,
        0,
        Math.PI * 2
      );
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

  drawSeatingLogs(celestial) {
    this.ctx.imageSmoothingEnabled = false;
    const logBaseColor = '#291805';
    const logStrokeColor = '#543612';

    this.ctx.fillStyle = logBaseColor;
    this.ctx.strokeStyle = logStrokeColor;
    this.ctx.lineWidth = 3;

    // Log 0 (Bottom)
    this.ctx.fillRect(this.width * 0.35, this.height * 0.72, this.width * 0.3, 16);
    this.ctx.strokeRect(this.width * 0.35, this.height * 0.72, this.width * 0.3, 16);

    // Log 1 (Left)
    this.ctx.fillRect(this.width * 0.1, this.height * 0.45, 18, this.height * 0.2);
    this.ctx.strokeRect(this.width * 0.1, this.height * 0.45, 18, this.height * 0.2);

    // Log 2 (Top)
    this.ctx.fillRect(this.width * 0.38, this.height * 0.24, this.width * 0.24, 14);
    this.ctx.strokeRect(this.width * 0.38, this.height * 0.24, this.width * 0.24, 14);

    // Log 3 (Right)
    this.ctx.fillRect(this.width * 0.86, this.height * 0.45, 18, this.height * 0.2);
    this.ctx.strokeRect(this.width * 0.86, this.height * 0.45, 18, this.height * 0.2);
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
        // Continuous smooth progression
        this.timeOfDay = (this.timeOfDay + this.timeSpeed * deltaSec) % 24.0;
      }
    }

    const celestial = this.getCelestialState();

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawSky(celestial);
    this.drawStars(celestial);
    this.drawCelestialBodies(celestial);
    this.drawTreesSilhouettes(celestial);
    this.drawCampfireGlow(celestial);
    this.drawSeatingLogs(celestial);
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
