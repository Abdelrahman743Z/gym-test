(() => {
  const firebaseConfig = {
    apiKey: "PASTE_API_KEY",
    authDomain: "air-battle-evolution.firebaseapp.com",
    databaseURL:
      "https://air-battle-evolution-default-rtdb.firebaseio.com/",
    projectId: "air-battle-evolution",
    storageBucket: "air-battle-evolution.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID",
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.database();

  // Auth + profile DOM
  const tabs = document.querySelectorAll(".tab-button");
  const forms = document.querySelectorAll(".form");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginFeedback = document.getElementById("login-feedback");
  const signupFeedback = document.getElementById("signup-feedback");
  const profilePreview = document.getElementById("profile-preview");
  const profileAvatar = document.getElementById("profile-avatar");
  const profileName = document.getElementById("profile-name");
  const profileCountry = document.getElementById("profile-country");

  // Dashboard + game DOM
  const authLayout = document.getElementById("auth-layout");
  const dashboard = document.getElementById("dashboard");
  const dashboardFeedback = document.getElementById("dashboard-feedback");
  const levelValueEl = document.getElementById("level-value");
  const backToAuthBtn = document.getElementById("back-to-auth");
  const startGameBtn = document.getElementById("start-game");
  const exitGameBtn = document.getElementById("exit-game");
  const openSettingsBtn = document.getElementById("open-settings");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsPage = document.getElementById("settings-page");
  const changePasswordForm = document.getElementById("change-password-form");
  const changeAvatarForm = document.getElementById("change-avatar-form");
  const deleteAccountForm = document.getElementById("delete-account-form");
  const passwordFeedback = document.getElementById("password-feedback");
  const avatarFeedback = document.getElementById("avatar-feedback");
  const deleteFeedback = document.getElementById("delete-feedback");
  const settingsAvatarPreview = document.getElementById("settings-avatar-preview");
  const leaderboardList = document.getElementById("leaderboard-list");
  const globalRankEl = document.getElementById("global-rank");
  const globalScoreEl = document.getElementById("global-score");
  const latestScoreEl = document.getElementById("latest-score");
  const totalPlayersEl = document.getElementById("total-players");
  const playerRankEl = document.getElementById("player-rank");
  const playerRankDetailEl = document.getElementById("player-rank-detail");
  const gameStage = document.getElementById("game-stage");
  const gameScoreEl = document.getElementById("game-score");
  const hudLevelEl = document.getElementById("hud-level");
  const gameTimerEl = document.getElementById("game-timer");
  const gameHealthEl = document.getElementById("game-health");
  const bossBanner = document.getElementById("boss-banner");
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const DEFAULT_AVATAR =
    "https://avatars.githubusercontent.com/u/9919?s=200&v=4";
  const STAR_COUNT = 120;
  const LEVEL_CAP = 100;
  const BASE_SPAWN_INTERVAL = 1400;
  const NORMAL_ENEMY_SCORE = 10;
  const BOSS_SCORE_MULTIPLIER = 25;
  const LASER_DAMAGE = 0.9;
  const COLLISION_PENALTY = 10;
  const ENEMY_PASS_PENALTY = 5;
  const STARTING_HEALTH = 100;

  const UPGRADE_STEPS = [
    {
      tier: 0,
      level: 0,
      name: "النموذج الأساسي",
      shotCooldown: 150,
      pattern: "single",
      damage: 1,
      plane: { width: 40, height: 48, speed: 8, color: "#4de1c1", fin: "#684fff" },
    },
    {
      tier: 1,
      level: 20,
      name: "Upgrade I - ثنائية الطلق",
      shotCooldown: 120,
      pattern: "double",
      damage: 1,
      glow: true,
      plane: { width: 42, height: 50, speed: 7.2, color: "#5ff1d1", fin: "#7f7bff" },
    },
    {
      tier: 2,
      level: 40,
      name: "Upgrade II - ثلاثية + درع",
      shotCooldown: 100,
      pattern: "triple",
      damage: 1,
      glow: true,
      shield: { duration: 3000, interval: 60000 },
      plane: { width: 46, height: 54, speed: 7.8, color: "#7dd6ff", fin: "#4de1c1" },
    },
    {
      tier: 3,
      level: 60,
      name: "Upgrade III - صواريخ قوية",
      shotCooldown: 90,
      pattern: "rocket",
      damage: 1.5,
      glow: true,
      plane: { width: 52, height: 58, speed: 8.5, color: "#ffb347", fin: "#ff8a47" },
    },
    {
      tier: 4,
      level: 80,
      name: "Upgrade IV - ليزر متقطع",
      shotCooldown: 120,
      pattern: "rocket",
      damage: 1.5,
      glow: true,
      plane: { width: 56, height: 64, speed: 9.6, color: "#ffe156", fin: "#ffb347" },
      laser: { duration: 3000, interval: 20000 },
    },
    {
      tier: 5,
      level: 100,
      name: "Final Evolution - Ultra",
      shotCooldown: 60,
      pattern: "ultra",
      damage: 2,
      glow: true,
      plane: { width: 62, height: 70, speed: 11, color: "#ff5f9e", fin: "#ffe1f0" },
      laser: { duration: 3500, interval: 20000 },
      shield: { duration: 5000, interval: 20000 },
      explosion: true,
    },
  ];

  let currentUser = null;
  let bestScore = 0;
  let currentRunScore = 0;
  let currentLevel = 0;
  let currentTier = 0;
  let currentHealth = STARTING_HEALTH;
  let gameActive = false;
  let animationId = null;
  let gameStartTime = 0;
  let lastFrameTime = 0;
  let lastSpawnTime = 0;
  let lastShotTime = 0;
  let lastCollisionTime = 0;
  let spawnInterval = BASE_SPAWN_INTERVAL;
  let difficultySpeed = 1;
  let bossActiveLevel = null;

  const keys = new Set();
  const stars = [];
  const bullets = [];
  const enemies = [];
  const defeatedBossLevels = new Set();
  const clearedUpgradeLevels = new Set();

  const plane = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 40,
    height: 48,
    speed: 6,
    color: "#4de1c1",
    fin: "#684fff",
    glow: false,
  };

  // تم إزالة القدرات (الدرع، الليزر، حزمة الحياة)

  // UI helpers
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");

      forms.forEach((form) => form.classList.remove("active"));
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  function showFeedback(element, message, type = "error") {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("error", "success");
    if (message) {
      element.classList.add(type);
    } else {
      element.classList.remove("error", "success");
    }
  }

  function switchView(view) {
    authLayout.hidden = view !== "auth";
    dashboard.hidden = view !== "dashboard";
    gameStage.hidden = view !== "game";
    settingsPage.hidden = view !== "settings";
  }

  async function fileToBase64(file) {
    if (!file) return DEFAULT_AVATAR;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function saveUser({ username, password, country, avatar }) {
    const snapshot = await db.ref(`users/${username}`).get();
    if (snapshot.exists()) {
      throw new Error("اسم اللاعب مستخدم بالفعل، جرّب اسماً آخر.");
    }

    const payload = {
      username,
      password,
      country,
      avatar,
      createdAt: Date.now(),
    };

    await db.ref(`users/${username}`).set(payload);
    await ensureScoreEntry(username);
    return payload;
  }

  async function loginUser(username, password) {
    const snapshot = await db.ref(`users/${username}`).get();
    if (!snapshot.exists()) {
      throw new Error("لا يوجد حساب بهذا الاسم.");
    }

    const data = snapshot.val();
    if (data.password !== password) {
      throw new Error("كلمة المرور غير صحيحة.");
    }

    return data;
  }

  async function ensureScoreEntry(username) {
    const scoreRef = db.ref(`scores/${username}`);
    const snapshot = await scoreRef.get();
    if (!snapshot.exists()) {
      await scoreRef.set({
        username,
        score: 0,
        level: 0,
        updatedAt: Date.now(),
      });
    }
  }

  async function fetchLeaderboard() {
    const snapshot = await db.ref("scores").get();
    if (!snapshot.exists()) return [];
    const entries = Object.values(snapshot.val());
    // الترتيب بناءً على أعلى level، ثم score كمعيار ثانوي
    entries.sort((a, b) => {
      const levelA = a.level || 0;
      const levelB = b.level || 0;
      if (levelB !== levelA) {
        return levelB - levelA;
      }
      return (b.score || 0) - (a.score || 0);
    });
    return entries;
  }

  async function refreshLeaderboard(message) {
    if (!currentUser) return;
    try {
      const entries = await fetchLeaderboard();
      const totalPlayers = entries.length;
      renderLeaderboard(entries.slice(0, 10));
      const myIndex = entries.findIndex(
        (entry) => entry.username === currentUser.username
      );
      const myEntry = myIndex >= 0 ? entries[myIndex] : null;
      bestScore = myEntry ? (myEntry.score || 0) : 0;
      const bestLevel = myEntry ? (myEntry.level || 0) : 0;
      globalRankEl.textContent =
        myIndex === -1 ? "خارج الترتيب" : `#${myIndex + 1}`;
      globalScoreEl.textContent = `Level ${bestLevel} • ${bestScore} نقطة`;
      latestScoreEl.textContent = `${bestScore}`;

      // تحديث إحصائيات اللاعبين
      if (totalPlayersEl) {
        totalPlayersEl.textContent = totalPlayers;
      }
      if (playerRankEl) {
        playerRankEl.textContent = myIndex === -1 ? "-" : `#${myIndex + 1}`;
      }
      if (playerRankDetailEl) {
        playerRankDetailEl.textContent = myIndex === -1
          ? "غير مصنف"
          : `من ${totalPlayers} لاعب`;
      }

      if (message) {
        showFeedback(dashboardFeedback, message, "success");
      }
    } catch (error) {
      showFeedback(
        dashboardFeedback,
        error.message || "تعذر تحديث جدول المتصدرين."
      );
    }
  }

  function renderLeaderboard(entries) {
    leaderboardList.innerHTML = "";
    if (!entries.length) {
      leaderboardList.innerHTML =
        '<li class="placeholder">لا توجد بيانات متاحة بعد.</li>';
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className =
        entry.username === currentUser?.username ? "me" : undefined;
      const level = entry.level || 0;
      const score = entry.score || 0;
      item.innerHTML = `
        <span>${index + 1}</span>
        <div>
          <strong>${entry.username}</strong>
          <small>Level ${level} • ${score} نقطة</small>
        </div>
      `;
      leaderboardList.appendChild(item);
    });
  }

  function rememberUser(user) {
    localStorage.setItem(
      "rememberedUser",
      JSON.stringify({
        username: user.username,
        avatar: user.avatar,
        country: user.country,
      })
    );
  }

  function loadRememberedUser() {
    try {
      const raw = localStorage.getItem("rememberedUser");
      if (!raw) return;
      const user = JSON.parse(raw);
      loginForm.elements.username.value = user.username;
      renderProfile(user, "مرحباً بعودتك! تم تحميل بياناتك من الجهاز.");
    } catch {
      localStorage.removeItem("rememberedUser");
    }
  }

  function renderProfile(user, message = "") {
    profileAvatar.src = user.avatar || DEFAULT_AVATAR;
    profileName.textContent = `الطيار: ${user.username}`;
    profileCountry.textContent = `الدولة: ${user.country || 'غير محدد'}`;
    profilePreview.hidden = false;

    if (message) {
      showFeedback(loginFeedback, message, "success");
    }
  }

  async function enterCommandCenter(user) {
    currentUser = user;
    await ensureScoreEntry(user.username);
    await refreshLeaderboard(`مرحباً ${user.username}!`);
    switchView("dashboard");
    // تحديث صورة الإعدادات
    if (settingsAvatarPreview) {
      settingsAvatarPreview.src = user.avatar || DEFAULT_AVATAR;
    }
  }

  async function submitScore(score) {
    if (!currentUser) return;
    const ref = db.ref(`scores/${currentUser.username}`);
    const snapshot = await ref.get();
    const previous = snapshot.exists() ? snapshot.val().score || 0 : 0;
    const level = getLevel(score);
    const previousLevel = snapshot.exists() ? snapshot.val().level || 0 : 0;

    // إذا وصلت 1000 نقطة أو أكثر، احفظ أعلى نتيجة
    if (score > previous || level > previousLevel) {
      await ref.set({
        username: currentUser.username,
        score,
        level,
        updatedAt: Date.now(),
      });
    }
  }

  async function getSavedScore() {
    if (!currentUser) return { score: 0, level: 0 };
    const ref = db.ref(`scores/${currentUser.username}`);
    const snapshot = await ref.get();
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        score: data.score || 0,
        level: data.level || 0,
      };
    }
    return { score: 0, level: 0 };
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const username = formData.get("username").trim();
    const password = formData.get("password").trim();
    const country = formData.get("country").trim();
    const avatarFile = formData.get("avatar");

    if (!username || !password || !country) {
      showFeedback(signupFeedback, "الرجاء تعبئة جميع الحقول.");
      return;
    }

    try {
      showFeedback(signupFeedback, "جارٍ حفظ بياناتك...", "success");
      const avatar = await fileToBase64(
        avatarFile && avatarFile.size ? avatarFile : null
      );
      const user = await saveUser({ username, password, country, avatar });
      signupForm.reset();
      showFeedback(signupFeedback, "تم إنشاء الحساب بنجاح!", "success");
      renderProfile(user, "يمكنك الآن الدخول إلى اللعبة.");
    } catch (error) {
      showFeedback(signupFeedback, error.message || "حدث خطأ غير متوقع.");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const username = formData.get("username").trim();
    const password = formData.get("password").trim();
    const remember = formData.get("remember");

    if (!username || !password) {
      showFeedback(loginFeedback, "أدخل اسم اللاعب وكلمة المرور.");
      return;
    }

    try {
      showFeedback(loginFeedback, "جارٍ التحقق...", "success");
      const user = await loginUser(username, password);
      if (remember) {
        rememberUser(user);
      } else {
        localStorage.removeItem("rememberedUser");
      }
      renderProfile(user, "تم تسجيل الدخول بنجاح!");
      await enterCommandCenter(user);
    } catch (error) {
      showFeedback(loginFeedback, error.message || "فشل تسجيل الدخول.");
    }
  });


  backToAuthBtn.addEventListener("click", () => {
    switchView("auth");
    showFeedback(dashboardFeedback, "", "success");
  });

  startGameBtn.addEventListener("click", async () => {
    if (!currentUser) {
      showFeedback(dashboardFeedback, "سجّل الدخول أولاً لبدء الجولة.");
      return;
    }
    await startGameSession();
  });

  exitGameBtn.addEventListener("click", () => {
    endGameSession("تم إنهاء الجولة.");
  });

  // Settings handlers
  openSettingsBtn.addEventListener("click", () => {
    switchView("settings");
  });

  closeSettingsBtn.addEventListener("click", () => {
    switchView("dashboard");
  });

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showFeedback(passwordFeedback, "سجّل الدخول أولاً.", "error");
      return;
    }

    const formData = new FormData(changePasswordForm);
    const currentPassword = formData.get("current-password").trim();
    const newPassword = formData.get("new-password").trim();

    try {
      // التحقق من كلمة المرور الحالية
      const userSnapshot = await db.ref(`users/${currentUser.username}`).get();
      if (!userSnapshot.exists()) {
        throw new Error("الحساب غير موجود.");
      }

      const userData = userSnapshot.val();
      if (userData.password !== currentPassword) {
        throw new Error("كلمة المرور الحالية غير صحيحة.");
      }

      // تحديث كلمة المرور
      await db.ref(`users/${currentUser.username}/password`).set(newPassword);
      currentUser.password = newPassword;
      showFeedback(passwordFeedback, "تم تحديث كلمة المرور بنجاح!", "success");
      changePasswordForm.reset();
    } catch (error) {
      showFeedback(passwordFeedback, error.message || "حدث خطأ أثناء تحديث كلمة المرور.", "error");
    }
  });

  changeAvatarForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showFeedback(avatarFeedback, "سجّل الدخول أولاً.", "error");
      return;
    }

    const formData = new FormData(changeAvatarForm);
    const avatarFile = formData.get("new-avatar");

    try {
      const avatar = await fileToBase64(avatarFile && avatarFile.size ? avatarFile : null);
      await db.ref(`users/${currentUser.username}/avatar`).set(avatar);
      currentUser.avatar = avatar;

      if (settingsAvatarPreview) {
        settingsAvatarPreview.src = avatar;
      }
      if (profileAvatar) {
        profileAvatar.src = avatar;
      }

      showFeedback(avatarFeedback, "تم تحديث الصورة بنجاح!", "success");
      changeAvatarForm.reset();
    } catch (error) {
      showFeedback(avatarFeedback, error.message || "حدث خطأ أثناء تحديث الصورة.", "error");
    }
  });

  deleteAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showFeedback(deleteFeedback, "سجّل الدخول أولاً.", "error");
      return;
    }

    const formData = new FormData(deleteAccountForm);
    const confirmPassword = formData.get("confirm-password").trim();

    try {
      // التحقق من كلمة المرور
      const userSnapshot = await db.ref(`users/${currentUser.username}`).get();
      if (!userSnapshot.exists()) {
        throw new Error("الحساب غير موجود.");
      }

      const userData = userSnapshot.val();
      if (userData.password !== confirmPassword) {
        throw new Error("كلمة المرور غير صحيحة.");
      }

      // حذف الحساب والنتائج
      await db.ref(`users/${currentUser.username}`).remove();
      await db.ref(`scores/${currentUser.username}`).remove();

      showFeedback(deleteFeedback, "تم حذف الحساب بنجاح.", "success");
      setTimeout(() => {
        currentUser = null;
        localStorage.removeItem("rememberedUser");
        switchView("auth");
      }, 2000);
    } catch (error) {
      showFeedback(deleteFeedback, error.message || "حدث خطأ أثناء حذف الحساب.", "error");
    }
  });

  // === Game loop helpers ===
  async function startGameSession() {
    // جلب النقاط المحفوظة - إذا وصلت 1000 نقطة، تكمل من الليفل الحالي
    const saved = await getSavedScore();
    if (saved.score >= 1000) {
      currentRunScore = saved.score;
      currentLevel = saved.level;
      // حساب الـ tier بناءً على الـ level
      const tierConfig = getTierConfig(currentLevel);
      if (tierConfig) {
        currentTier = tierConfig.tier;
        applyTierEffects(tierConfig);
      }
    } else {
      currentRunScore = 0;
      currentLevel = 0;
      currentTier = 0;
    }
    currentHealth = STARTING_HEALTH;
    bossActiveLevel = null;
    defeatedBossLevels.clear();
    clearedUpgradeLevels.clear();
    updateLevelUI();
    initStars();
    bullets.length = 0;
    enemies.length = 0;
    lastCollisionTime = 0;
    Object.assign(plane, {
      x: canvas.width / 2,
      y: canvas.height - 80,
      width: 40,
      height: 48,
      speed: 8,
      color: "#4de1c1",
      fin: "#684fff",
      glow: false,
    });
    spawnInterval = BASE_SPAWN_INTERVAL;
    difficultySpeed = 1;
    lastShotTime = 0;
    gameStartTime = performance.now();
    lastFrameTime = gameStartTime;
    lastSpawnTime = gameStartTime;
    gameActive = true;
    switchView("game");
    updateScoreDisplays();
    updateHealthDisplay();
    setBossBanner("");

    // إعادة تعيين حالة اللمس
    isTouching = false;
    keys.clear();

    // ضبط حجم canvas للموبايل
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    animationId = requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    // على الموبايل، canvas يأخذ الشاشة كاملة
    if (window.innerWidth <= 900) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      // على الكمبيوتر، الحجم الافتراضي
      canvas.width = 900;
      canvas.height = 600;
      canvas.style.width = "";
      canvas.style.height = "";
    }
  }

  function endGameSession(message) {
    if (!gameActive) {
      switchView("dashboard");
      if (message) showFeedback(dashboardFeedback, message, "success");
      return;
    }
    gameActive = false;
    cancelAnimationFrame(animationId);
    setBossBanner("");

    // إعادة تعيين حالة اللمس
    isTouching = false;
    keys.clear();
    window.removeEventListener("resize", resizeCanvas);

    submitScore(currentRunScore)
      .then(() => refreshLeaderboard(message || "انتهت الجولة!"))
      .finally(() => {
        switchView("dashboard");
      });
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.35 + Math.random() * 1.1,
        size: Math.random() * 1.4 + 0.4,
      });
    }
  }

  function handleKeyDown(event) {
    const relevantKeys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
    ];
    if (!relevantKeys.includes(event.code)) return;
    if (gameActive) {
      event.preventDefault();
    }
    keys.add(event.code);
    if (event.code === "Space") {
      shoot();
      // إطلاق نار مستمر عند الضغط المستمر
      if (!keys.has("Space")) {
        keys.add("Space");
      }
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
  }

  function getTierConfig(level) {
    let tier = 0;
    for (const step of UPGRADE_STEPS) {
      if (level >= step.level) {
        tier = step.tier;
      }
    }
    return UPGRADE_STEPS.find((step) => step.tier === tier);
  }

  function applyTierEffects(tierConfig) {
    const { plane: planeStats, glow, shotCooldown, pattern, damage } =
      tierConfig;
    plane.width = planeStats.width;
    plane.height = planeStats.height;
    plane.speed = planeStats.speed;
    plane.color = planeStats.color;
    plane.fin = planeStats.fin;
    plane.glow = Boolean(glow);
    shooting.pattern = pattern;
    shooting.cooldown = shotCooldown;
    shooting.damage = damage;
  }

  const shooting = {
    pattern: "single",
    cooldown: 220,
    damage: 1,
  };

  function shoot() {
    if (!gameActive) return;
    const now = performance.now();
    if (now - lastShotTime < shooting.cooldown) return;
    lastShotTime = now;

    const bulletsToAdd = [];
    const base = {
      y: plane.y - plane.height / 2,
      speed: 12,
      damage: shooting.damage,
      type: shooting.pattern === "rocket" ? "rocket" : "bullet",
    };

    if (shooting.pattern === "single") {
      bulletsToAdd.push({ ...base, x: plane.x });
    } else if (shooting.pattern === "double") {
      bulletsToAdd.push({ ...base, x: plane.x - 8 });
      bulletsToAdd.push({ ...base, x: plane.x + 8 });
    } else if (shooting.pattern === "triple") {
      bulletsToAdd.push({ ...base, x: plane.x });
      bulletsToAdd.push({ ...base, x: plane.x - 14, vx: -1 });
      bulletsToAdd.push({ ...base, x: plane.x + 14, vx: 1 });
    } else if (shooting.pattern === "rocket") {
      bulletsToAdd.push({
        ...base,
        x: plane.x,
        speed: 14,
        damage: shooting.damage * 1.5,
        type: "rocket",
      });
    } else if (shooting.pattern === "ultra") {
      for (let offset = -20; offset <= 20; offset += 10) {
        bulletsToAdd.push({
          ...base,
          x: plane.x + offset,
          damage: shooting.damage,
          speed: 14,
          vx: offset * 0.01,
        });
      }
    }

    bullets.push(...bulletsToAdd);
  }

  function spawnEnemy(type = "normal") {
    if (bossActiveLevel) return;
    const levelFactor = Math.max(1, currentLevel);
    const baseSpeed = 0.9 + Math.random() * 1.0;
    enemies.push({
      type,
      x: 30 + Math.random() * (canvas.width - 60),
      y: -40,
      size: 22 + Math.random() * 16 + levelFactor * 0.3,
      speed: (baseSpeed + levelFactor * 0.04) * difficultySpeed,
      pulse: Math.random(),
      zigzag: currentLevel >= 11,
      health: 1 + Math.floor(levelFactor / 10),
      damage: 1 + levelFactor * 0.05,
      wave: Math.random() * Math.PI * 2,
    });
  }

  function spawnBoss(level) {
    bossActiveLevel = level;
    const bossName =
      level === 100 ? "Final Boss" : `Boss ${Math.floor(level / 10)}`;
    setBossBanner(`⚠️ ${bossName} ظهر الآن!`);
    enemies.length = 0;
    enemies.push({
      type: "boss",
      x: canvas.width / 2,
      y: -150,
      size: 140,
      speed: 0.6 + level * 0.02,
      pulse: 0,
      health: level,
      maxHealth: level,
      damage: 5 + level * 0.3,
      label: bossName,
    });
  }

  function updateGameHUDTime(timestamp) {
    const elapsed = Math.max(0, timestamp - gameStartTime);
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    gameTimerEl.textContent = `${minutes}:${secs}`;
  }

  function gameLoop(timestamp) {
    if (!gameActive) return;
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // إطلاق نار مستمر تلقائي (auto-shoot)
    shoot();

    if (!bossActiveLevel && timestamp - lastSpawnTime > spawnInterval) {
      spawnEnemy();
      lastSpawnTime = timestamp;
    }

    updatePlane(delta);
    updateStars(delta);
    updateBullets(delta);
    updateEnemies(delta);
    detectCollisions();
    drawScene();
    updateGameHUDTime(timestamp);

    animationId = requestAnimationFrame(gameLoop);
  }

  function updatePlane(delta) {
    // تحريك مباشر بالإصبع على الموبايل
    if (isTouching && touchTargetX !== null && touchTargetY !== null) {
      const dx = touchTargetX - plane.x;
      const dy = touchTargetY - plane.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = plane.speed * (delta / 16) * 2; // أسرع قليلاً للاستجابة

      if (distance > 5) {
        const moveX = (dx / distance) * moveSpeed;
        const moveY = (dy / distance) * moveSpeed;
        plane.x += moveX;
        plane.y += moveY;
      }
    } else {
      // تحريك بالأسهم (للكيبورد)
      const moveSpeed = plane.speed * (delta / 16);
      if (keys.has("ArrowLeft")) {
        plane.x -= moveSpeed;
      }
      if (keys.has("ArrowRight")) {
        plane.x += moveSpeed;
      }
      if (keys.has("ArrowUp")) {
        plane.y -= moveSpeed * 0.85;
      }
      if (keys.has("ArrowDown")) {
        plane.y += moveSpeed * 0.85;
      }
    }

    const minX = plane.width / 2;
    const maxX = canvas.width - plane.width / 2;
    const minY = canvas.height * 0.4;
    const maxY = canvas.height - plane.height / 2;
    plane.x = Math.max(minX, Math.min(maxX, plane.x));
    plane.y = Math.max(minY, Math.min(maxY, plane.y));
  }

  function updateStars(delta) {
    stars.forEach((star) => {
      star.y += star.speed * (delta / 16);
      if (star.y > canvas.height) {
        star.y = -5;
        star.x = Math.random() * canvas.width;
      }
    });
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.y -= bullet.speed;
      if (bullet.vx) {
        bullet.x += bullet.vx;
      }
      if (bullet.y < -30 || bullet.x < -20 || bullet.x > canvas.width + 20) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.type === "boss") {
        if (enemy.y < canvas.height * 0.25) {
          enemy.y += enemy.speed;
        } else {
          enemy.x += Math.sin(enemy.pulse) * 2;
          enemy.pulse += 0.02;
        }
      } else {
        enemy.y += enemy.speed;
        enemy.pulse += 0.08;
        if (enemy.zigzag) {
          enemy.wave += 0.05;
          enemy.x += Math.sin(enemy.wave) * 2.4;
        }
      }

      if (enemy.y - enemy.size > canvas.height + 30) {
        // عند مرور طائرة عدو، تنقص من الحياة
        currentHealth -= ENEMY_PASS_PENALTY;
        updateHealthDisplay();
        enemies.splice(i, 1);
        if (currentHealth <= 0) {
          endGameSession("انتهت حياتك!");
          return;
        }
      }
    }
  }

  // تم إزالة جميع القدرات (حزمة الحياة، الليزر، الدرع)

  function detectCollisions() {
    const now = performance.now();
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      // Plane collision
      const dx = Math.abs(enemy.x - plane.x);
      const dy = Math.abs(enemy.y - plane.y);
      const collisionDistance = enemy.type === "boss" ? enemy.size / 1.8 : enemy.size;
      if (dx < collisionDistance && dy < collisionDistance) {
        // نظام الحياة: خصم 10 نقاط عند الاصطدام
        if (now - lastCollisionTime > 500) {
          lastCollisionTime = now;
          currentHealth -= COLLISION_PENALTY;
          updateHealthDisplay();
          enemies.splice(i, 1);
          if (currentHealth <= 0) {
            endGameSession("انتهت حياتك!");
            return;
          }
        }
        continue;
      }

      // Bullets
      for (let j = bullets.length - 1; j >= 0; j -= 1) {
        const bullet = bullets[j];
        if (
          Math.abs(bullet.x - enemy.x) < enemy.size / (enemy.type === "boss" ? 1.2 : 1.7) &&
          Math.abs(bullet.y - enemy.y) < enemy.size
        ) {
          enemy.health -= bullet.damage;
          bullets.splice(j, 1);
          if (enemy.health <= 0) {
            destroyEnemy(i, enemy);
          }
          break;
        }
      }
    }
  }

  function destroyEnemy(index, enemy, options = {}) {
    enemies.splice(index, 1);
    if (enemy.type === "boss") {
      defeatedBossLevels.add(enemy.maxHealth || bossActiveLevel || 0);
      bossActiveLevel = null;
      setBossBanner("تم إسقاط الزعيم!");
      addScore(enemy.maxHealth * BOSS_SCORE_MULTIPLIER);
    } else {
      addScore(NORMAL_ENEMY_SCORE);
    }
  }

  function drawScene() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#081532");
    gradient.addColorStop(1, "#050918");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.save();
    ctx.fillStyle = "#ffffff";
    stars.forEach((star) => {
      ctx.globalAlpha = 0.5 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Bullets
    bullets.forEach((bullet) => {
      if (bullet.type === "rocket") {
        ctx.fillStyle = "#ff8a47";
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y - 10);
        ctx.lineTo(bullet.x - 4, bullet.y + 5);
        ctx.lineTo(bullet.x + 4, bullet.y + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, bullet.y - 16);
        ctx.stroke();
      }
    });

    // Enemies
    enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.pulse) * 0.1);
      if (enemy.type === "boss") {
        ctx.fillStyle = "#ff4d6d";
        ctx.beginPath();
        ctx.rect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
        ctx.fill();
        // Health bar
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-50, -enemy.size / 2 - 14, 100, 6);
        const ratio = Math.max(0, enemy.health / (enemy.maxHealth || enemy.health));
        ctx.fillStyle = "#00ffc6";
        ctx.fillRect(-50, -enemy.size / 2 - 14, 100 * ratio, 6);
      } else {
        ctx.fillStyle = "#ff6b81";
        ctx.fillRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
      }
      ctx.restore();
    });

    // Plane (triangle + fin)
    ctx.fillStyle = plane.color;
    ctx.beginPath();
    ctx.moveTo(plane.x, plane.y - plane.height / 2);
    ctx.lineTo(plane.x - plane.width / 2, plane.y + plane.height / 2);
    ctx.lineTo(plane.x + plane.width / 2, plane.y + plane.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = plane.fin;
    ctx.fillRect(
      plane.x - 4,
      plane.y - plane.height / 4,
      8,
      plane.height / 2
    );
  }

  function addScore(amount) {
    currentRunScore += amount;
    updateScoreDisplays();
    checkLevelProgress();
  }

  function updateScoreDisplays() {
    gameScoreEl.textContent = `${currentRunScore}`;
  }

  function updateHealthDisplay() {
    if (gameHealthEl) {
      gameHealthEl.textContent = `${Math.max(0, currentHealth)}`;
      if (currentHealth <= 20) {
        gameHealthEl.style.color = "#ff6b81";
      } else if (currentHealth <= 50) {
        gameHealthEl.style.color = "#ffb347";
      } else {
        gameHealthEl.style.color = "#4de1c1";
      }
    }
  }

  function getLevel(score) {
    return Math.min(LEVEL_CAP, Math.floor(score / 100));
  }

  function checkLevelProgress() {
    const newLevel = getLevel(currentRunScore);
    if (newLevel !== currentLevel) {
      currentLevel = newLevel;
      updateLevelUI();
      recalcDifficulty();
      checkUpgradeUnlock();
      checkBossSpawn();
    }
  }

  function recalcDifficulty() {
    difficultySpeed = 1 + currentLevel * 0.03;
    spawnInterval = Math.max(500, BASE_SPAWN_INTERVAL - currentLevel * 6);
  }

  function checkUpgradeUnlock() {
    const tierConfig = getTierConfig(currentLevel);
    if (!tierConfig) return;
    if (tierConfig.tier !== currentTier) {
      currentTier = tierConfig.tier;
      applyTierEffects(tierConfig);
    }
  }

  function checkBossSpawn() {
    if (currentLevel > 0 && currentLevel % 10 === 0) {
      if (!defeatedBossLevels.has(currentLevel) && bossActiveLevel !== currentLevel) {
        spawnBoss(currentLevel);
      }
    }
  }

  function updateLevelUI() {
    levelValueEl.textContent = currentLevel;
    hudLevelEl.textContent = currentLevel;
  }

  // تم إزالة جميع الوظائف المرتبطة بالقدرات والترقية

  function setBossBanner(message) {
    if (!bossBanner) return;
    if (!message) {
      bossBanner.hidden = true;
      bossBanner.textContent = "";
    } else {
      bossBanner.hidden = false;
      bossBanner.textContent = message;
    }
  }

  // === Touch Controls - تحريك مباشر بالإصبع ===
  let touchTargetX = null;
  let touchTargetY = null;
  let isTouching = false;

  function getCanvasPosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function handleTouchStart(event) {
    if (!gameActive) return;
    event.preventDefault();
    const touch = event.touches[0];
    const pos = getCanvasPosition(touch.clientX, touch.clientY);
    touchTargetX = pos.x;
    touchTargetY = pos.y;
    isTouching = true;
  }

  function handleTouchMove(event) {
    if (!gameActive || !isTouching) return;
    event.preventDefault();
    const touch = event.touches[0];
    const pos = getCanvasPosition(touch.clientX, touch.clientY);
    touchTargetX = pos.x;
    touchTargetY = pos.y;
  }

  function handleTouchEnd(event) {
    if (!gameActive) return;
    event.preventDefault();
    isTouching = false;
    touchTargetX = null;
    touchTargetY = null;
  }

  // Touch events للشاشة
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => keys.clear());

  loadRememberedUser();
})();

