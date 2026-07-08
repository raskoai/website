const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cursor = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  targetX: window.innerWidth / 2,
  targetY: window.innerHeight / 2,
  active: false,
};

const glow = document.querySelector(".cursor-glow");

window.addEventListener(
  "pointermove",
  (event) => {
    cursor.targetX = event.clientX;
    cursor.targetY = event.clientY;
    cursor.active = true;
    if (glow) glow.style.opacity = "1";
  },
  { passive: true },
);

window.addEventListener("pointerleave", () => {
  cursor.active = false;
  if (glow) glow.style.opacity = "0";
});

document.querySelectorAll("img").forEach((image) => {
  image.addEventListener("error", () => image.classList.add("broken"));
  if (image.complete && image.naturalWidth === 0) image.classList.add("broken");
});

window.addEventListener("load", () => {
  document.querySelectorAll("img").forEach((image) => {
    if (image.naturalWidth === 0) image.classList.add("broken");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
);

document.querySelectorAll(".section-reveal").forEach((element) => {
  revealObserver.observe(element);
});

const tiltElements = [...document.querySelectorAll("[data-tilt]")];
tiltElements.forEach((element) => {
  element.addEventListener("pointermove", (event) => {
    if (prefersReduced) return;
    const rect = element.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `perspective(1100px) rotateX(${relY * -4}deg) rotateY(${relX * 5}deg) translate3d(${relX * 6}px, ${relY * 6}px, 0)`;
  });

  element.addEventListener("pointerleave", () => {
    element.style.transform = "";
  });
});

function updateParallax() {
  const height = window.innerHeight;
  document.querySelectorAll(".artist-card, .team-card").forEach((card) => {
    const rect = card.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - height / 2) / height;
    card.style.setProperty("--parallax", `${progress * -34}px`);
  });
}

let smoothY = window.scrollY;
let scrollTarget = window.scrollY;
let rafScroll = null;

function smoothScrollTo(target) {
  scrollTarget = Math.max(0, Math.min(target, document.body.scrollHeight - window.innerHeight));
  if (rafScroll) return;

  const tick = () => {
    smoothY += (scrollTarget - smoothY) * 0.16;
    window.scrollTo(0, smoothY);

    if (Math.abs(scrollTarget - smoothY) > 0.4) {
      rafScroll = requestAnimationFrame(tick);
    } else {
      rafScroll = null;
      smoothY = scrollTarget;
      window.scrollTo(0, scrollTarget);
    }
  };

  rafScroll = requestAnimationFrame(tick);
}

if (!prefersReduced && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      smoothScrollTo(scrollTarget + event.deltaY);
    },
    { passive: false },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!rafScroll) {
        smoothY = window.scrollY;
        scrollTarget = window.scrollY;
      }
      updateParallax();
    },
    { passive: true },
  );
}

window.addEventListener("scroll", updateParallax, { passive: true });
window.addEventListener("resize", updateParallax);
updateParallax();

const canvas = document.getElementById("particle-field");
const context = canvas.getContext("2d");
let particles = [];
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function viewportWidth() {
  return document.documentElement.clientWidth || window.innerWidth;
}

function resizeCanvas() {
  const width = viewportWidth();
  const height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  createParticles();
}

function createParticles() {
  const width = viewportWidth();
  const height = window.innerHeight;
  const gap = width > 1200 ? 58 : 48;
  particles = [];

  for (let y = -gap; y <= height + gap; y += gap) {
    for (let x = -gap; x <= width + gap; x += gap) {
      particles.push({
        baseX: x,
        baseY: y,
        x,
        y,
        vx: 0,
        vy: 0,
      });
    }
  }
}

function drawParticles() {
  const width = viewportWidth();
  const height = window.innerHeight;
  cursor.x += (cursor.targetX - cursor.x) * 0.08;
  cursor.y += (cursor.targetY - cursor.y) * 0.08;

  if (glow) {
    glow.style.transform = `translate3d(${cursor.x - 110}px, ${cursor.y - 110}px, 0)`;
  }

  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;

  const radius = 170;
  const radiusSquared = radius * radius;

  particles.forEach((particle) => {
    let forceX = (particle.baseX - particle.x) * 0.018;
    let forceY = (particle.baseY - particle.y) * 0.018;

    if (cursor.active) {
      const dx = cursor.x - particle.x;
      const dy = cursor.y - particle.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < radiusSquared) {
        const distance = Math.sqrt(distanceSquared) || 1;
        const pull = (1 - distance / radius) * 0.62;
        forceX += (dx / distance) * pull;
        forceY += (dy / distance) * pull;
      }
    }

    particle.vx = (particle.vx + forceX) * 0.88;
    particle.vy = (particle.vy + forceY) * 0.88;
    particle.x += particle.vx;
    particle.y += particle.vy;
  });

  context.beginPath();
  for (let index = 0; index < particles.length; index += 1) {
    const a = particles[index];
    for (let offset = 1; offset <= 2; offset += 1) {
      const b = particles[index + offset];
      if (!b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < 3600) {
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
      }
    }
  }
  context.strokeStyle = "rgba(245, 245, 245, 0.045)";
  context.stroke();

  particles.forEach((particle) => {
    context.beginPath();
    context.arc(particle.x, particle.y, 1.15, 0, Math.PI * 2);
    context.fillStyle = "rgba(245, 245, 245, 0.36)";
    context.fill();
  });

  if (!prefersReduced) requestAnimationFrame(drawParticles);
}

resizeCanvas();
if (prefersReduced) {
  context.fillStyle = "rgba(245, 245, 245, 0.18)";
  particles.forEach((particle) => {
    context.beginPath();
    context.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
    context.fill();
  });
} else {
  requestAnimationFrame(drawParticles);
}

window.addEventListener("resize", resizeCanvas);
