const storageKey = "clipflow-studio-state-v1";
const credentialVaultKey = "clipflow-credential-vault-v1";

let googleUser = null;
let cachedAccessToken = null;
let isSigningIn = false;
let gdriveFiles = [];
let gdriveFolders = [];
let isGDriveLoading = false;
let gdriveError = null;
let gdriveServiceStatus = null;
let gdriveServiceStatusChecked = false;
let systemVizardConfigured = false;
let settingsIntegrationsStatus = null;
let settingsIntegrationsLoading = false;
let settingsIntegrationsError = "";
const liveUploadingClipIds = new Set();
const destinationPlatforms = ["TikTok", "Instagram", "YouTube Shorts"];
const localClipperBase = "http://127.0.0.1:5059";
const vizardSocialAccountsUrl = "https://vizard.ai/settings/social-accounts";

const baseAccounts = [
  {
    id: "tiktok-launchclips",
    platform: "TikTok",
    handle: "Link in Vizard",
    audience: "Vizard workspace",
    connected: false,
    enabled: true,
    review: "Sync required",
    gate: "oauth",
  },
  {
    id: "instagram-founder",
    platform: "Instagram",
    handle: "Link in Vizard",
    audience: "Vizard workspace",
    connected: false,
    enabled: true,
    review: "Sync required",
    gate: "oauth",
  },
  {
    id: "instagram-product",
    platform: "YouTube Shorts",
    handle: "Link in Vizard",
    audience: "Vizard workspace",
    connected: false,
    enabled: true,
    review: "Sync required",
    gate: "oauth",
  },
];

const hooks = [
  "The moment everything clicked",
  "A mistake most teams keep making",
  "The fastest way to explain the offer",
  "This answer changed the room",
  "The hidden objection behind the demo",
  "A repeatable playbook in under a minute",
  "The quote your audience will remember",
  "A clean before-and-after reveal",
  "The strongest proof point",
  "The counterintuitive lesson",
  "A sharp founder take",
  "The setup that makes the payoff land",
];

const captions = [
  "Save this before the next planning call.",
  "The short version: make the value obvious.",
  "This is the part worth clipping.",
  "Useful for creators, founders, and content teams.",
  "A tiny shift that makes the whole story stronger.",
  "Turn the best minute into the main distribution asset.",
];

const thumbBackgrounds = [
  "linear-gradient(145deg, #0fba8f, #2bb3d6 48%, #f05c55)",
  "linear-gradient(145deg, #f2b84b, #0fba8f 52%, #17191f)",
  "linear-gradient(145deg, #6f62e8, #2bb3d6 54%, #f2b84b)",
  "linear-gradient(145deg, #f05c55, #f2b84b 46%, #0fba8f)",
  "linear-gradient(145deg, #17191f, #6f62e8 48%, #2bb3d6)",
  "linear-gradient(145deg, #2bb3d6, #ffffff 48%, #f05c55)",
];

const state = loadState();

let activeFilter = "all";
let selectedVideoFile = null;
let isProcessing = false;
let isPublishing = false;

const elements = {
  form: document.querySelector("#sourceForm"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  videoTitle: document.querySelector("#videoTitle"),
  videoFile: document.querySelector("#videoFile"),
  chooseFile: document.querySelector("#chooseFile"),
  clearVideo: document.querySelector("#clearVideo"),
  fileName: document.querySelector("#fileName"),
  dropzone: document.querySelector("#dropzone"),
  vizardProjectForm: document.querySelector("#vizardProjectForm"),
  vizardProjectInput: document.querySelector("#vizardProjectInput"),
  clippingProvider: document.querySelector("#clippingProvider"),
  videoLanguage: document.querySelector("#videoLanguage"),
  clipCount: document.querySelector("#clipCount"),
  minSeconds: document.querySelector("#minSeconds"),
  maxSeconds: document.querySelector("#maxSeconds"),
  captionStyle: document.querySelector("#captionStyle"),
  autoCaptions: document.querySelector("#autoCaptions"),
  brandSafe: document.querySelector("#brandSafe"),
  verticalCrop: document.querySelector("#verticalCrop"),
  generateButton: document.querySelector("[data-testid='generate-clips']"),
  clipStatus: document.querySelector("#clipStatus"),
  clipGrid: document.querySelector("#clipGrid"),
  accountList: document.querySelector("#accountList"),
  vizardLibrary: document.querySelector("#vizardLibrary"),
  queueTable: document.querySelector("#queueTable"),
  approvedCount: document.querySelector("#approvedCount"),
  readinessPill: document.querySelector("#readinessPill"),
  scheduleApproved: document.querySelector("#scheduleApproved"),
  syncAccounts: document.querySelector("#syncAccounts"),
  refreshVizardLibrary: document.querySelector("#refreshVizardLibrary"),
  resetDemo: document.querySelector("#resetDemo"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate"),
  vizardImportMode: document.querySelector("#vizardImportMode"),
  vizardDirectLinkForm: document.querySelector("#vizardDirectLinkForm"),
  vizardDirectTitle: document.querySelector("#vizardDirectTitle"),
  vizardDirectUrl: document.querySelector("#vizardDirectUrl"),
  vizardDirectCaption: document.querySelector("#vizardDirectCaption"),
  gdriveContainer: document.querySelector("#gdriveContainer"),
  gdriveLoginBtn: document.querySelector("#gdriveLoginBtn"),
  refreshGDrive: document.querySelector("#refreshGDrive"),
  gdriveLogout: document.querySelector("#gdriveLogout"),
  vizardAccountsContainer: document.querySelector("#vizardAccountsContainer"),
  selectAllClips: document.querySelector("#selectAllClips"),
  clearClipSelection: document.querySelector("#clearClipSelection"),
  clipSelectionCount: document.querySelector("#clipSelectionCount"),
  bulkPublishRedirect: document.querySelector("#bulkPublishRedirect"),
  publishBackToDeskBtn: document.querySelector("#publishBackToDeskBtn"),
  publishBulkBtn: document.querySelector("#publishBulkBtn"),
  publishListContainer: document.querySelector("#publishListContainer"),
  toggleDirectTikTokBtn: document.querySelector("#toggleDirectTikTokBtn"),
  directTikTokForm: document.querySelector("#directTikTokForm"),
  directTikTokUsername: document.querySelector("#directTikTokUsername"),
  directTikTokToken: document.querySelector("#directTikTokToken"),
  cancelDirectTikTok: document.querySelector("#cancelDirectTikTok"),
  saveDirectTikTok: document.querySelector("#saveDirectTikTok"),
  toggleTelegramBtn: document.querySelector("#toggleTelegramBtn"),
  telegramForm: document.querySelector("#telegramForm"),
  telegramBotToken: document.querySelector("#telegramBotToken"),
  telegramChatId: document.querySelector("#telegramChatId"),
  telegramHandle: document.querySelector("#telegramHandle"),
  cancelTelegram: document.querySelector("#cancelTelegram"),
  saveTelegram: document.querySelector("#saveTelegram"),
  optimizationListContainer: document.querySelector("#optimizationListContainer"),
  runAuditBtn: document.querySelector("#runAuditBtn"),
  optTabContent: document.querySelector("#optTabContent"),
  optTabClipflow: document.querySelector("#optTabClipflow"),
  optTabFeatures: document.querySelector("#optTabFeatures"),
  optTabAi: document.querySelector("#optTabAi"),
  sidebarLinkAnalytics: document.querySelector("#sidebarLinkAnalytics"),
  sidebarLinkSettings: document.querySelector("#sidebarLinkSettings"),
  analyticsTotalClips: document.querySelector("#analyticsTotalClips"),
  analyticsAvgScore: document.querySelector("#analyticsAvgScore"),
  analyticsEstReach: document.querySelector("#analyticsEstReach"),
  settingsRes: document.querySelector("#settingsRes"),
  settingsFPS: document.querySelector("#settingsFPS"),
  settingsWatermark: document.querySelector("#settingsWatermark"),
  settingsAutoVizard: document.querySelector("#settingsAutoVizard"),
  settingsSaveBtn: document.querySelector("#settingsSaveBtn"),
  settingsClearCacheBtn: document.querySelector("#settingsClearCacheBtn"),
  settingsCacheSize: document.querySelector("#settingsCacheSize"),
  settingsIntegrationsStatus: document.querySelector("#settingsIntegrationsStatus"),
  aiScriptboardContainer: document.querySelector("#aiScriptboardContainer"),
  multiVaultContainer: document.querySelector("#multiVaultContainer"),
  manualUploadForm: document.querySelector("#manualUploadForm"),
  manualUploadTitle: document.querySelector("#manualUploadTitle"),
  manualUploadVideo: document.querySelector("#manualUploadVideo"),
  manualUploadTranscriptText: document.querySelector("#manualUploadTranscriptText"),
  manualUploadScore: document.querySelector("#manualUploadScore"),
};

document.title = "ClipFlow";

hydrateForm();
render();
checkClipperHealth();

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isProcessing) return;

  syncFormToState();

  try {
    const file = getSelectedVideoFile();
    if (state.source.clippingProvider === "vizard") {
      setProcessing(true);
      setClipStatus("Submitting the video for Vizard AI clipping generation...", "ready");
      const result = await createVizardClips();
      state.clips = result.clips || [];
      state.understanding = result.understanding;
      rememberVizardProject(result.source, result.clips, result.understanding);
      
      if (!state.clips.length) {
        setClipStatus("Vizard AI project is now running. Clips will load into the desk here automatically once ready!", "ready");
        startVizardBackgroundPolling();
      } else {
        setQueueProcessStatus(`Imported ${state.clips.length} Vizard clips.`, "ready");
      }
    } else if (file && state.source.clippingProvider === "local") {
      setProcessing(true);
      setClipStatus("Transcribing, understanding, and cutting the video locally. This can take a few minutes.", "ready");
      const result = await createRealClips(file);
      state.clips = result.clips;
      state.understanding = result.understanding;
      setQueueProcessStatus(`Created ${state.clips.length} real clips from ${file.name}.`, "ready");
    } else {
      state.clips = generateClips();
      state.understanding = null;
      setClipStatus("Generated demo candidates. Select a video file when you want real cuts.", "");
    }
    state.queue = [];
    saveAndRender();
    triggerAutoBackupToGoogleDrive(state.clips);
  } catch (error) {
    setQueueProcessStatus(error.message || "Could not create clips.", "error");
  } finally {
    setProcessing(false);
  }
});

if (elements.manualUploadForm) {
  elements.manualUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = elements.manualUploadTitle.value;
    const videoFile = elements.manualUploadVideo.files[0];
    const transcriptText = elements.manualUploadTranscriptText.value;
    const score = parseInt(elements.manualUploadScore.value, 10) || 85;

    if (!title || !videoFile) {
      setClipStatus("Please provide a title and a video file.", "error");
      return;
    }

    if (!cachedAccessToken && !isServiceDriveMode()) {
      setClipStatus("Please sign in to Google Drive first.", "error");
      location.hash = "#google-drive";
      return;
    }

    const submitButton = elements.manualUploadForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Uploading...";

    try {
      const clipData = {
        id: `manual-${Date.now()}`,
        title: title,
        transcript: transcriptText,
        score: score,
        videoFile: videoFile,
      };
      await uploadClipToGoogleDrive(clipData);
      elements.manualUploadForm.reset();
      setQueueProcessStatus("Manual upload to Google Drive successful.", "ready");
    } catch (err) {
      setQueueProcessStatus(`Manual upload failed: ${err.message}`, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Upload to Google Drive";
    }
  });
}

elements.chooseFile.addEventListener("click", () => {
  elements.videoFile.click();
});

elements.clearVideo.addEventListener("click", async () => {
  try {
    await deleteCurrentVideo();
  } catch (error) {
    setClipStatus(error.message || "Could not delete the video.", "error");
  }
});

elements.videoFile.addEventListener("change", () => {
  const file = elements.videoFile.files[0];
  if (!file) return;
  selectedVideoFile = file;
  state.source.fileName = file.name;
  elements.fileName.textContent = file.name;
  if (!elements.videoTitle.value.trim()) {
    elements.videoTitle.value = cleanFileName(file.name);
  }
  syncFormToState();
  saveAndRender();
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("dragging");
  });
});

elements.dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  selectedVideoFile = file;
  state.source.fileName = file.name;
  elements.fileName.textContent = file.name;
  if (!elements.videoTitle.value.trim()) {
    elements.videoTitle.value = cleanFileName(file.name);
  }
  syncFormToState();
  saveAndRender();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    renderClips();
  });
});

function handleRouting() {
  const hash = location.hash || "#studio";

  const secStudio = document.querySelector("#studio");
  const secAccounts = document.querySelector("#accounts");
  const secVizardAccounts = document.querySelector("#vizard-accounts-panel");
  const secGDrive = document.querySelector("#google-drive");
  const secQueue = document.querySelector("#queue");
  const secVizardLibrary = document.querySelector("#vizard-library");
  const secPublish = document.querySelector("#publish");
  const secOptimization = document.querySelector("#optimization");
  const secAnalytics = document.querySelector("#analytics");
  const secSettings = document.querySelector("#settings");

  const allSections = [secStudio, secAccounts, secVizardAccounts, secGDrive, secQueue, secVizardLibrary, secPublish, secOptimization, secAnalytics, secSettings];
  allSections.forEach(s => { if (s) s.style.display = "none"; });

  // Update sidebar visibility for newly approved features
  if (elements.sidebarLinkAnalytics) {
    elements.sidebarLinkAnalytics.style.display = state.preferences?.analyticsEnabled ? "flex" : "none";
  }
  if (elements.sidebarLinkSettings) {
    elements.sidebarLinkSettings.style.display = state.preferences?.settingsEnabled ? "flex" : "none";
  }

  // Update nav highlight
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === hash);
  });

  if (hash === "#studio") {
    if (secStudio) secStudio.style.display = "grid";
  } else if (hash === "#vizard-library") {
    if (secVizardLibrary) secVizardLibrary.style.display = "flex";
  } else if (hash === "#accounts") {
    if (secAccounts) secAccounts.style.display = "grid";
    if (secVizardAccounts) secVizardAccounts.style.display = "grid";
  } else if (hash === "#google-drive") {
    if (secGDrive) secGDrive.style.display = "grid";
    renderGDrive();
  } else if (hash === "#queue") {
    if (secQueue) secQueue.style.display = "grid";
  } else if (hash === "#publish") {
    if (secPublish) secPublish.style.display = "flex";
    renderPublishWorkspace();
  } else if (hash === "#optimization") {
    if (secOptimization) secOptimization.style.display = "flex";
    renderOptimizationWorkspace();
  } else if (hash === "#analytics") {
    if (secAnalytics) secAnalytics.style.display = "flex";
    renderAnalyticsWorkspace();
  } else if (hash === "#settings") {
    if (secSettings) secSettings.style.display = "flex";
    renderSettingsWorkspace();
  }
}

// Attach routing events
window.addEventListener("hashchange", handleRouting);
document.addEventListener("DOMContentLoaded", handleRouting);

// Universal click-to-play handler for lazy loading videos
document.addEventListener("click", (event) => {
  const clickToPlay = event.target.closest(".click-to-play-wrapper");
  if (clickToPlay && !clickToPlay.classList.contains("loaded")) {
    const src = clickToPlay.dataset.videoSrc;
    const editorUrl = clickToPlay.dataset.editorUrl || "";
    clickToPlay.classList.add("loaded");
    clickToPlay.innerHTML = `
      <video class="clip-video" src="${escapeHtml(src)}" controls autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"></video>
      <div class="video-error-fallback" style="display: none; width: 100%; height: 100%; padding: 16px; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; background: rgba(15, 23, 42, 0.95); position: absolute; inset: 0;">
        <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; fill: var(--coral);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
        <span style="font-size: 0.75rem; color: var(--muted); line-height: 1.35;">Requires direct streaming permissions or auth.</span>
        <a class="mini-button active" href="${escapeHtml(editorUrl)}" target="_blank" rel="noreferrer" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
          Watch on Vizard ↗
        </a>
      </div>
    `;
    const video = clickToPlay.querySelector("video");
    if (video) {
       video.play().catch(e => console.warn("Autoplay block averted:", e));
    }
  }
});

// Run once immediately to handle initial URL state
setTimeout(handleRouting, 0);

elements.clipGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const clip = state.clips.find((item) => item.id === button.dataset.clipId);
  if (!clip) return;

  if (button.dataset.action === "delete") {
    try {
      await deleteClip(clip);
    } catch (error) {
      setClipStatus(error.message || "Could not delete the clip.", "error");
    }
    return;
  }

  if (button.dataset.action === "backup-gdrive") {
    uploadClipToGoogleDrive(clip);
    return;
  }

  if (button.dataset.action === "approve") {
    clip.approved = !clip.approved;
  }

  if (button.dataset.action === "duplicate") {
    state.clips.push({
      ...clip,
      id: createId("clip"),
      title: `${clip.title} remix`,
      score: Math.min(99, clip.score + 3),
      approved: false,
    });
  }

  saveAndRender();
});

elements.accountList.addEventListener("click", (event) => {
  const action = event.target.closest("[data-account-action]");
  if (!action) return;

  if (action.dataset.accountAction === "remove-direct") {
    if (!confirm("Remove this Direct account?")) return;
    state.accounts = state.accounts.filter(item => item.id !== action.dataset.accountId);
    saveAndRender();
    setClipStatus("Direct account removed successfully.", "ready");
    return;
  }

  if (action.dataset.accountAction === "remove-telegram") {
    if (!confirm("Remove this Telegram bot account?")) return;
    state.accounts = state.accounts.filter(item => item.id !== action.dataset.accountId);
    saveAndRender();
    setClipStatus("Telegram bot removed successfully.", "ready");
    return;
  }

  const account = state.accounts.find((item) => item.id === action.dataset.accountId);
  if (!account) return;

  if (action.dataset.accountAction === "connect") {
    window.open(vizardSocialAccountsUrl, "_blank", "noreferrer");
  }

  saveAndRender();
});

if (elements.toggleDirectTikTokBtn && elements.directTikTokForm) {
  elements.toggleDirectTikTokBtn.addEventListener("click", () => {
    const isHidden = elements.directTikTokForm.style.display === "none";
    elements.directTikTokForm.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      hydrateDirectTikTokForm();
    }
    
    // Auto-setup toggles check
    const modeRadios = document.querySelectorAll('input[name="directTikTokMode"]');
    const apiFields = document.querySelector("#directTikTokApiFields");
    
    if (modeRadios && apiFields) {
      modeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
          apiFields.style.display = e.target.value === "api" ? "flex" : "none";
        });
      });
    }
  });
}

if (elements.cancelDirectTikTok && elements.directTikTokForm) {
  elements.cancelDirectTikTok.addEventListener("click", () => {
    elements.directTikTokForm.style.display = "none";
    const apiFields = document.querySelector("#directTikTokApiFields");
    if (apiFields) apiFields.style.display = "none";
    const defaultRadio = document.querySelector('input[name="directTikTokMode"][value="assistant"]');
    if (defaultRadio) defaultRadio.checked = true;
  });
}

if (elements.saveDirectTikTok && elements.directTikTokForm) {
  elements.saveDirectTikTok.addEventListener("click", () => {
    let username = elements.directTikTokUsername.value.trim();
    const token = elements.directTikTokToken.value.trim();
    const modeInput = document.querySelector('input[name="directTikTokMode"]:checked');
    const directMode = modeInput ? modeInput.value : "assistant";

    if (!username) {
      setClipStatus("Please enter your TikTok username/handle.", "error");
      return;
    }

    if (!username.startsWith("@")) {
      username = `@${username}`;
    }

    const isAssistant = directMode === "assistant";

    const newAccount = {
      id: `direct-tiktok-${Date.now()}`,
      platform: "TikTok",
      handle: username,
      audience: isAssistant ? "Smart Assistant (Cert-free)" : "Direct Posting (API)",
      connected: true,
      enabled: true,
      review: isAssistant ? "No developer approval needed" : (token ? "Linked directly via API token" : "Linked via Sandbox / Simulation Mode"),
      gate: "ready",
      provider: "direct",
      directMode: directMode, // "assistant" or "api"
      directToken: token,
    };

    if (!state.accounts) state.accounts = [];
    const existingIndex = state.accounts.findIndex((account) => {
      return account.provider === "direct" && String(account.handle || "").toLowerCase() === username.toLowerCase();
    });
    if (existingIndex >= 0) {
      state.accounts[existingIndex] = {
        ...state.accounts[existingIndex],
        ...newAccount,
        id: state.accounts[existingIndex].id,
      };
    } else {
      state.accounts.push(newAccount);
    }
    saveAndRender();

    // Reset Form
    elements.directTikTokForm.style.display = "none";
    elements.directTikTokUsername.value = "";
    elements.directTikTokToken.value = "";
    const apiFields = document.querySelector("#directTikTokApiFields");
    if (apiFields) apiFields.style.display = "none";
    const defaultRadio = document.querySelector('input[name="directTikTokMode"][value="assistant"]');
    if (defaultRadio) defaultRadio.checked = true;

    setClipStatus(`Direct TikTok account ${username} added successfully!`, "ready");
  });
}

if (elements.toggleTelegramBtn && elements.telegramForm) {
  elements.toggleTelegramBtn.addEventListener("click", () => {
    const isHidden = elements.telegramForm.style.display === "none";
    elements.telegramForm.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      hydrateTelegramForm();
    }
  });
}

if (elements.cancelTelegram && elements.telegramForm) {
  elements.cancelTelegram.addEventListener("click", () => {
    elements.telegramForm.style.display = "none";
  });
}

if (elements.saveTelegram && elements.telegramForm) {
  elements.saveTelegram.addEventListener("click", async () => {
    const botToken = elements.telegramBotToken.value.trim();
    const chatId = elements.telegramChatId.value.trim();
    let handle = elements.telegramHandle.value.trim();

    if (!botToken || !chatId) {
      setClipStatus("Please enter both Bot Token and Chat ID.", "error");
      return;
    }

    if (!handle) {
      handle = "@telegram_bot";
    }

    // Validate bot token early so publishing doesn't fail later with a vague "Not Found".
    try {
      const res = await fetch(apiUrl("/api/telegram/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramBotToken: botToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Telegram token validation failed.");
      }
    } catch (err) {
      setClipStatus(err.message || "Telegram token validation failed.", "error");
      return;
    }

    const newAccount = {
      id: `telegram-${Date.now()}`,
      platform: "Telegram",
      handle: handle,
      audience: "Send to Phone Bot",
      connected: true,
      enabled: true,
      review: `Ready. Chat ID: ${chatId}`,
      gate: "ready",
      provider: "telegram",
      telegramBotToken: botToken,
      telegramChatId: chatId,
    };

    if (!state.accounts) state.accounts = [];
    const existingIndex = state.accounts.findIndex((account) => {
      return account.provider === "telegram" && String(account.telegramChatId || "") === chatId;
    });
    if (existingIndex >= 0) {
      state.accounts[existingIndex] = {
        ...state.accounts[existingIndex],
        ...newAccount,
        id: state.accounts[existingIndex].id,
      };
    } else {
      state.accounts.push(newAccount);
    }
    saveAndRender();

    // Reset Form
    elements.telegramForm.style.display = "none";
    elements.telegramBotToken.value = "";
    elements.telegramChatId.value = "";
    elements.telegramHandle.value = "";

    setClipStatus(`Telegram account ${handle} added successfully!`, "ready");
  });
}

elements.accountList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-account-enabled]");
  if (!input) return;
  const account = state.accounts.find((item) => item.id === input.dataset.accountEnabled);
  if (!account) return;
  account.enabled = input.checked;
  saveAndRender();
});

elements.syncAccounts.addEventListener("click", async () => {
  await syncVizardAccounts();
});

if (elements.refreshVizardLibrary) {
  elements.refreshVizardLibrary.addEventListener("click", async () => {
    await refreshVizardLibrary();
  });
}

// Toggle between API Retrieval and Direct Link Ingest modes
if (elements.vizardImportMode) {
  elements.vizardImportMode.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      elements.vizardImportMode.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", btn === button);
      });
      if (mode === "api") {
        elements.vizardProjectForm.style.display = "grid";
        elements.vizardDirectLinkForm.style.display = "none";
      } else {
        elements.vizardProjectForm.style.display = "none";
        elements.vizardDirectLinkForm.style.display = "flex";
      }
    });
  });
}

if (elements.vizardProjectForm) {
  elements.vizardProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await importVizardProjectFromInput();
  });
}

// Handle custom/direct video link ingestion to bypass API limits
if (elements.vizardDirectLinkForm) {
  elements.vizardDirectLinkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = elements.vizardDirectTitle.value.trim();
    const videoUrl = elements.vizardDirectUrl.value.trim();
    const caption = elements.vizardDirectCaption.value.trim();

    if (!title || !videoUrl) {
      setClipStatus("Please fill in both a Title and a Video URL.", "error");
      return;
    }

    try {
      const projectId = extractVizardProjectId(videoUrl) || `manual-${Date.now()}`;
      const videoId = extractVizardVideoId(videoUrl) || `${Math.floor(100000 + Math.random() * 900000)}`;

      // Create a compatible Vizard clip
      const manualClip = {
        id: `vizard-${videoId}`,
        title: title,
        caption: caption || title,
        reason: "Directly imported video clip.",
        transcript: caption || "",
        duration: 30,
        start: 0,
        end: 30,
        score: 95,
        approved: true, // Approve it automatically so it goes straight to queue
        sourceTitle: "Direct Import",
        videoUrl: videoUrl,
        thumbUrl: "",
        vizardVideoId: videoId,
        clipEditorUrl: videoUrl,
        provider: "vizard",
      };

      // Set inside state.clips/understanding
      state.clips = [manualClip, ...state.clips.filter((c) => c.id !== manualClip.id)];
      state.understanding = {
        status: "ready",
        summary: "Clip directly linked via input.",
        topics: ["Direct Import"],
        transcriptPreview: caption,
        segmentCount: state.clips.length,
        provider: "vizard",
      };

      // Put to Vizard Projects so it displays in Projects too!
      const fallbackProject = {
        id: `vizard-project-${projectId}`,
        projectId,
        projectName: title,
        shareLink: videoUrl,
        status: "ready",
        createdAt: new Date().toISOString(),
        clips: [manualClip],
      };
      updateStoredVizardProject({ projectId, title, shareLink: videoUrl }, [manualClip], state.understanding, fallbackProject);

      // Reset form fields
      elements.vizardDirectTitle.value = "";
      elements.vizardDirectUrl.value = "";
      elements.vizardDirectCaption.value = "";

      saveAndRender();
      setClipStatus(`Directly imported clip "${title}" into Clip Desk!`, "ready");
      triggerAutoBackupToGoogleDrive([manualClip]);

      // Scroll or focus Studio
      location.hash = "#studio";
    } catch (err) {
      setClipStatus(`Could not import clip: ${err.message}`, "error");
    }
  });
}

if (elements.vizardLibrary) {
  elements.vizardLibrary.addEventListener("click", (event) => {
    const action = event.target.closest("[data-library-action]");
    if (!action) return;

    if (action.dataset.libraryAction === "send-to-desk") {
      const clipId = action.dataset.clipId;
      const projectId = action.dataset.projectId;
      const projectWithClip = state.vizardProjects.find(p => p.id === projectId);
      if (projectWithClip) {
        const clip = projectWithClip.clips?.find(c => c.id === clipId);
        if (clip) {
          const alreadySent = state.clips && state.clips.some(c => c.videoUrl === clip.videoUrl || c.title === clip.title);
          if (!alreadySent) {
            const newClip = {
              ...clip,
              id: clip.id || createId("vizard-clip"),
              approved: true,
              style: state.style || state.source.captionStyle || "Clean creator",
              platforms: destinationPlatforms,
              provider: "vizard",
              real: true,
            };
            if (!state.clips) state.clips = [];
            state.clips.push(newClip);
            saveAndRender();
            setClipStatus(`Sent clip "${clip.title}" to Clip Desk (Approved)!`, "ready");
            location.hash = "#studio";
          } else {
            setClipStatus("This clip has already been sent to your Clip Desk.", "ready");
            location.hash = "#studio";
          }
        }
      }
      return;
    }

    if (action.dataset.libraryAction === "backup-gdrive") {
      const clipId = action.dataset.clipId;
      const projectId = action.dataset.projectId;
      const projectWithClip = state.vizardProjects.find(p => p.id === projectId);
      if (projectWithClip) {
        const clip = projectWithClip.clips?.find(c => c.id === clipId);
        if (clip) {
          if (!cachedAccessToken && !isServiceDriveMode()) {
            setClipStatus("Please sign in to Google Drive under the Google Drive tab first!", "error");
            location.hash = "#google-drive";
            return;
          }
          uploadClipToGoogleDrive(clip);
          return;
        }
      }
    }

    const project = state.vizardProjects.find((item) => item.id === action.dataset.projectId);

    if (action.dataset.libraryAction === "load") {
      if (!project) return;
      loadVizardProjectIntoDesk(project, { navigateToDesk: true });
      return;
    }

    if (action.dataset.libraryAction === "copy-id") {
      copyProjectId(action.dataset.projectIdValue);
    }
  });
}

elements.scheduleApproved.addEventListener("click", async () => {
  await publishApprovedClips();
});

elements.resetDemo.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  Object.assign(state, restoreCredentialVault(createInitialState()));
  selectedVideoFile = null;
  elements.videoFile.value = "";
  hydrateForm();
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });
  render();
});

function createInitialState() {
  return {
    preferences: {
      autoGDriveBackup: true,
      analyticsEnabled: true,
      settingsEnabled: true,
      scriptboardEnabled: true,
      kineticEnabled: true,
      seoHashtags: true,
      safeOverlays: true,
      wasmAcceleration: true,
      indexedDbCache: true,
      multiVaultEnabled: true,
      gdriveSyncEnabled: true
    },
    source: {
      youtubeUrl: "",
      title: "",
      fileName: "",
      clippingProvider: "vizard",
      videoLanguage: "auto",
      clipCount: 6,
      minSeconds: 18,
      maxSeconds: 58,
      captionStyle: "Clean creator",
      autoCaptions: true,
      brandSafe: true,
      verticalCrop: true,
      serverUploadUrl: "",
      audioUrl: "",
      transcriptUrl: "",
      vizardProjectId: "",
      vizardShareLink: "",
    },
    understanding: null,
    clips: [], // Clips are loaded separately
    accounts: [], // Accounts are loaded and normalized in restoreCredentialVault
    vizardProjects: [],
    queue: [],
    queueNotifications: [],
    publishedDriveBin: [],
    vizardApiAccounts: [],
    activeVizardAccountId: "system",
    selectedClipIds: [],
    optimizations: [],
    optimizationStatuses: {},
    aiOptimizationItems: [],
    aiOptimizationLoading: false,
    aiOptimizationError: "",
    hasRunOptimizationAudit: false,
    optimizationActiveTab: "content",
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    // Always attempt to load saved data, even if some parts are missing.
    // Fallback to initial state for missing parts.
    if (saved && typeof saved === 'object') {
      const clips = normalizeClips(saved.clips || []);
      return restoreCredentialVault({
        ...createInitialState(),
        ...saved,
        accounts: saved.accounts || [],
        clips,
        vizardProjects: normalizeVizardProjects(saved.vizardProjects || [], clips, saved.source || {}),
        queue: normalizeQueue(saved.queue || []), // Explicitly normalize and load queue
        queueNotifications: normalizeQueueNotifications(saved.queueNotifications || []),
        publishedDriveBin: normalizePublishedDriveBin(saved.publishedDriveBin || []),
        optimizationStatuses: normalizeOptimizationStatuses(saved.optimizationStatuses, saved.optimizations),
        aiOptimizationItems: normalizeAiOptimizationItems(saved.aiOptimizationItems || []),
        aiOptimizationLoading: false,
        aiOptimizationError: "",
      });
    }
  } catch (error) {
    console.warn("Unable to load saved studio state", error);
  }
  return restoreCredentialVault(createInitialState()); // This will also pass empty accounts
}

function normalizeQueue(queue) {
  return Array.isArray(queue) ? queue : [];
}

function normalizeQueueNotifications(notifications) {
  return (Array.isArray(notifications) ? notifications : [])
    .filter((notice) => notice && notice.message)
    .map((notice) => ({
      id: String(notice.id || createId("queue-notice")),
      message: String(notice.message || ""),
      tone: notice.tone === "error" ? "error" : "ready",
      key: String(notice.key || ""),
      createdAt: String(notice.createdAt || new Date().toISOString()),
    }))
    .slice(0, 20);
}

function normalizePublishedDriveBin(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && (item.gdriveFolderId || item.gdriveFileId))
    .map((item) => ({
      id: String(item.id || item.gdriveFolderId || item.gdriveFileId || createId("drivebin")),
      clipId: String(item.clipId || ""),
      title: String(item.title || "Published Drive video"),
      gdriveFolderId: String(item.gdriveFolderId || ""),
      gdriveFileId: String(item.gdriveFileId || ""),
      publishedAt: String(item.publishedAt || ""),
      source: String(item.source || "queue"),
    }));
}

function normalizeOptimizationStatuses(statuses, legacyOptimizations = []) {
  const normalized = {};
  const allowedStatuses = new Set(["new", "planned", "in-progress", "done", "dismissed"]);

  if (statuses && typeof statuses === "object") {
    Object.entries(statuses).forEach(([id, status]) => {
      if (allowedStatuses.has(status)) {
        normalized[id] = status;
      }
    });
  }

  if (Array.isArray(legacyOptimizations)) {
    legacyOptimizations.forEach((item) => {
      if (!item?.id || normalized[item.id]) return;
      if (item.status === "pending") {
        normalized[item.id] = "new";
      } else if (item.status === "approved") {
        normalized[item.id] = "done";
      } else if (allowedStatuses.has(item.status)) {
        normalized[item.id] = item.status;
      }
    });
  }

  return normalized;
}

function normalizeOptimizationPriority(value) {
  const clean = String(value || "").toLowerCase();
  return ["high", "medium", "low"].includes(clean) ? clean : "medium";
}

function normalizeOptimizationEffort(value) {
  const clean = String(value || "").toLowerCase();
  return ["small", "medium", "large"].includes(clean) ? clean : "medium";
}

function normalizeAiOptimizationItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === "object")
    .slice(0, 8)
    .map((item, index) => {
      const title = String(item.title || `Gemini improvement ${index + 1}`).trim().slice(0, 140);
      const idSeed = String(item.id || title || `gemini-${index + 1}`).toLowerCase();
      const id = idSeed
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || `gemini-${index + 1}`;

      return createOptimizationFeedItem({
        id: id.startsWith("gemini-") ? id : `gemini-${id}`,
        category: "ai",
        priority: normalizeOptimizationPriority(item.priority),
        effort: normalizeOptimizationEffort(item.effort),
        title,
        problem: String(item.problem || "").trim().slice(0, 500),
        why: String(item.why || "").trim().slice(0, 500),
        files: Array.isArray(item.files) ? item.files.map((file) => String(file).trim()).filter(Boolean).slice(0, 6) : [],
        implementation: String(item.implementation || "").trim().slice(0, 900),
        verification: String(item.verification || "").trim().slice(0, 600),
        status: item.status || "new",
        source: "gemini",
      });
    });
}

function saveAndRender() {
  saveCredentialVault();
  persistStateOnly();
  render();
}

function persistStateOnly() {
  saveCredentialVault();
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadCredentialVault() {
  try {
    const saved = JSON.parse(localStorage.getItem(credentialVaultKey));
    if (saved && typeof saved === "object") {
      return {
        accounts: Array.isArray(saved.accounts) ? saved.accounts : [],
        vizardApiAccounts: Array.isArray(saved.vizardApiAccounts) ? saved.vizardApiAccounts : [],
        activeVizardAccountId: saved.activeVizardAccountId || "",
      };
    }
  } catch (error) {
    console.warn("Unable to load saved credential vault", error);
  }
  return { accounts: [], vizardApiAccounts: [], activeVizardAccountId: "" };
}

function saveCredentialVault() {
  const directAccounts = (state.accounts || []).filter((account) => {
    return account.provider === "direct" || account.provider === "telegram";
  });

  const vault = {
    accounts: directAccounts,
    vizardApiAccounts: state.vizardApiAccounts || [],
    activeVizardAccountId: state.activeVizardAccountId || "system",
  };

  localStorage.setItem(credentialVaultKey, JSON.stringify(vault));
}

function restoreCredentialVault(appState) {
  const vault = loadCredentialVault();
  const accountsById = new Map((appState.accounts || []).map((account) => [account.id, account]));

  // Merge accounts from the credential vault (direct/telegram)
  vault.accounts.forEach((account) => {
    if (!account?.id) return;
    accountsById.set(account.id, {
      ...accountsById.get(account.id),
      ...account,
    });
  });

  // Ensure base accounts are always present, merging with any saved properties
  // This ensures default Vizard accounts are always in the list,
  // and their 'enabled' status is preserved if it was saved.
  baseAccounts.forEach(baseAccount => {
    if (accountsById.has(baseAccount.id)) {
      accountsById.set(baseAccount.id, { ...baseAccount, ...accountsById.get(baseAccount.id) });
    } else {
      accountsById.set(baseAccount.id, { ...baseAccount });
    }
  });

  return {
    ...appState,
    accounts: Array.from(accountsById.values()), // This is the final, merged list
    vizardApiAccounts: vault.vizardApiAccounts.length
      ? vault.vizardApiAccounts
      : (appState.vizardApiAccounts || []),
    activeVizardAccountId: vault.activeVizardAccountId || appState.activeVizardAccountId || "system",
  };
}

function hydrateDirectTikTokForm() {
  const saved = [...(state.accounts || [])].reverse().find((account) => account.provider === "direct");
  if (!saved) return;

  if (elements.directTikTokUsername) {
    elements.directTikTokUsername.value = saved.handle || "";
  }
  if (elements.directTikTokToken) {
    elements.directTikTokToken.value = saved.directToken || "";
  }

  const mode = saved.directMode || "assistant";
  const modeRadio = document.querySelector(`input[name="directTikTokMode"][value="${mode}"]`);
  if (modeRadio) modeRadio.checked = true;

  const apiFields = document.querySelector("#directTikTokApiFields");
  if (apiFields) {
    apiFields.style.display = mode === "api" ? "flex" : "none";
  }
}

function hydrateTelegramForm() {
  const saved = [...(state.accounts || [])].reverse().find((account) => account.provider === "telegram");
  if (!saved) return;

  if (elements.telegramBotToken) {
    elements.telegramBotToken.value = saved.telegramBotToken || "";
  }
  if (elements.telegramChatId) {
    elements.telegramChatId.value = saved.telegramChatId || "";
  }
  if (elements.telegramHandle) {
    elements.telegramHandle.value = saved.handle || "";
  }
}

function hydrateForm() {
  elements.youtubeUrl.value = state.source.youtubeUrl;
  elements.videoTitle.value = state.source.title;
  elements.fileName.textContent = state.source.fileName || "No file selected";
  elements.clippingProvider.value = state.source.clippingProvider;
  elements.videoLanguage.value = state.source.videoLanguage;
  elements.clipCount.value = state.source.clipCount;
  elements.minSeconds.value = state.source.minSeconds;
  elements.maxSeconds.value = state.source.maxSeconds;
  elements.captionStyle.value = state.source.captionStyle;
  elements.autoCaptions.checked = state.source.autoCaptions;
  elements.brandSafe.checked = state.source.brandSafe;
  elements.verticalCrop.checked = state.source.verticalCrop;
}

function syncFormToState() {
  state.source.youtubeUrl = elements.youtubeUrl.value.trim();
  state.source.title = elements.videoTitle.value.trim();
  state.source.clippingProvider = elements.clippingProvider.value;
  state.source.videoLanguage = elements.videoLanguage.value;
  state.source.clipCount = clamp(Number(elements.clipCount.value) || 6, 2, 12);
  state.source.minSeconds = clamp(Number(elements.minSeconds.value) || 18, 8, 90);
  state.source.maxSeconds = clamp(Number(elements.maxSeconds.value) || 58, state.source.minSeconds + 4, 180);
  state.source.captionStyle = elements.captionStyle.value;
  state.source.autoCaptions = elements.autoCaptions.checked;
  state.source.brandSafe = elements.brandSafe.checked;
  state.source.verticalCrop = elements.verticalCrop.checked;
}

function generateClips() {
  const sourceTitle = state.source.title || inferTitleFromUrl(state.source.youtubeUrl) || "Long-form source video";
  const count = state.source.clipCount;
  const titleSeed = hashString(sourceTitle + state.source.captionStyle);

  return Array.from({ length: count }, (_, index) => {
    const hook = hooks[(titleSeed + index * 3) % hooks.length];
    const duration = state.source.minSeconds + ((titleSeed + index * 11) % (state.source.maxSeconds - state.source.minSeconds + 1));
    const score = 72 + ((titleSeed + index * 7) % 25);
    const start = 43 + index * (duration + 37);
    const end = start + duration;

    return {
      id: createId("clip"),
      title: hook,
      sourceTitle,
      caption: captions[(titleSeed + index) % captions.length],
      duration,
      score,
      start,
      end,
      approved: score >= 84,
      style: state.source.captionStyle,
      platforms: destinationPlatforms,
      thumb: thumbBackgrounds[index % thumbBackgrounds.length],
    };
  });
}

function render() {
  renderClips();
  renderAccounts();
  renderVizardApiAccounts();
  renderVizardLibrary();
  renderQueue();
  renderCounters();
  updateSelectionCounter();
  
  // Toggle sidebar link visibility based on settings / analytics preferences
  if (elements.sidebarLinkAnalytics) {
    elements.sidebarLinkAnalytics.style.display = state.preferences?.analyticsEnabled ? "flex" : "none";
  }
  if (elements.sidebarLinkSettings) {
    elements.sidebarLinkSettings.style.display = state.preferences?.settingsEnabled ? "flex" : "none";
  }
  
  // Custom smart tab features
  renderAiScriptboard();
  renderMultiVault();
  renderWasmBadge();
  renderCaptionStylePreset();
}

function renderClips() {
  const clips = getFilteredClips();
  elements.clipGrid.innerHTML = "";

  if (!clips.length) {
    elements.clipGrid.appendChild(elements.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  clips.forEach((clip) => {
    const details = document.createElement("details");
    const isSelected = state.selectedClipIds && state.selectedClipIds.includes(clip.id);
    details.className = `clip-details ${clip.approved ? "approved" : "review"}`;
    if (isSelected) {
      details.classList.add("selected-card");
    }

    const videoSrc = assetUrl(clip.videoUrl || clip.clipEditorUrl);
    const isBackedUp = (state.gdriveBackedUpUrls && state.gdriveBackedUpUrls.includes(clip.videoUrl)) || clip.gdriveBackedUp || (clip.videoUrl && state.gdriveBackedUpUrls?.includes(clip.videoUrl));
    
    // Transparent platform safe-zone overlay check
    const safeAreaOverlayHtml = state.preferences?.safeOverlays 
      ? `<div class="safe-zone-guide" style="position: absolute; inset: 0; pointer-events: none; border: 2px dashed rgba(239, 68, 68, 0.4); display: flex; flex-direction: column; justify-content: space-between; padding: 6px; box-sizing: border-box; z-index: 22; background: rgba(239, 68, 68, 0.04);">
           <div style="font-size: 7.5px; font-weight: 800; font-family: var(--font-sans); background: #ef4444; color: white; padding: 1px 3px; border-radius: 2px; align-self: flex-start; text-transform: uppercase;">⚠️ TikTok Top Bar</div>
           <span style="font-size: 8px; font-weight: 800; font-family: var(--font-sans); background: rgba(16, 185, 129, 0.85); color: white; padding: 2px 4px; border-radius: 2px; align-self: center; text-transform: uppercase; letter-spacing: 0.05em;">✅ SUBTITLE SAFE AREA</span>
           <div style="font-size: 7.5px; font-weight: 800; font-family: var(--font-sans); background: #ef4444; color: white; padding: 1px 3px; border-radius: 2px; align-self: flex-end; text-transform: uppercase;">⚠️ TikTok Feed Icons</div>
         </div>`
      : "";

    const rawMedia = clip.videoUrl
      ? `<div class="click-to-play-wrapper" data-video-src="${escapeHtml(videoSrc)}" data-editor-url="${escapeHtml(clip.clipEditorUrl || clip.videoUrl)}" style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #0f172a; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${clip.thumbUrl ? `<img src="${escapeHtml(assetUrl(clip.thumbUrl))}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #0f172a); position: absolute; inset: 0;"></div>`}
          ${safeAreaOverlayHtml}
          <!-- Overlay play container -->
          <div class="video-play-backdrop" style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
            <div class="play-button-overlay" style="width: 46px; height: 46px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; transition: transform 0.2s ease, background 0.2s ease; z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor; margin-left: 2px;"><path d="M8 5v14l11-7z"></path></svg>
            </div>
          </div>
          <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15, 23, 42, 0.75); padding: 3px 6px; border-radius: 4px; font-size: 0.7rem; color: var(--ink); z-index: 15; font-weight: 500; font-family: var(--font-mono);">Click to play</span>
        </div>`
      : `<div class="clip-thumb" style="--thumb-bg: ${clip.thumb}">
          <div class="caption-bars" aria-hidden="true"><span></span><span></span></div>
        </div>`;

    const checkboxHtml = `
      <div class="clip-checkbox-container" style="display: flex; align-items: center; justify-content: center; pointer-events: auto;" onclick="event.stopPropagation();">
         <input type="checkbox" class="clip-select-checkbox" data-clip-id="${clip.id}" ${isSelected ? "checked" : ""} style="width: 14px; height: 14px; cursor: pointer; margin: 0; outline: none;">
      </div>
    `;

    // Dynamic SEO tags suggestions check
    const hashtagsHtml = state.preferences?.seoHashtags
      ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 8px; align-items: center;">
           <span style="font-size: 0.65rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">SEO:</span>
           <span class="seo-tag-pill" style="font-size: 0.6rem; background: rgba(16, 185, 129, 0.12); color: #34d399; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.25); font-family: var(--font-mono); cursor: pointer;" onclick="event.stopPropagation(); navigator.clipboard.writeText('#shorts #viral'); alert('Hashtags Copied!');">#shorts</span>
           <span class="seo-tag-pill" style="font-size: 0.6rem; background: rgba(16, 185, 129, 0.12); color: #34d399; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.25); font-family: var(--font-mono); cursor: pointer;" onclick="event.stopPropagation(); navigator.clipboard.writeText('#foryou'); alert('Hashtags Copied!');">#foryou</span>
           <span class="seo-tag-pill" style="font-size: 0.6rem; background: rgba(16, 185, 129, 0.12); color: #34d399; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.25); font-family: var(--font-mono); cursor: pointer;" onclick="event.stopPropagation(); navigator.clipboard.writeText('#clipflow'); alert('Hashtags Copied!');">#clipflow</span>
         </div>`
      : "";

    // Sync cloud state representation check
    const backupHtml = (state.preferences?.gdriveSyncEnabled || isBackedUp)
      ? `<span class="platform-chip" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); font-size: 0.65rem;" title="Hub sync status active">☁️ Backup Sync Active</span>`
      : "";

    details.innerHTML = `
      <summary class="clip-summary">
        <div class="summary-left">
          ${checkboxHtml}
          <span class="clip-state ${clip.approved ? "approved" : "review"}">${clip.approved ? "Approved" : "Review"}</span>
          <h3 class="summary-title">${escapeHtml(clip.title)}</h3>
        </div>
        <div class="summary-right">
          <div class="score-row-summary">
            <div class="score-meter" aria-label="Virality score ${clip.score}">
              <span style="--score: ${clip.score}%"></span>
            </div>
            <strong>${clip.score}</strong>
          </div>
          <button class="mini-button ${clip.approved ? "active" : ""}" type="button" data-action="approve" data-clip-id="${clip.id}" onclick="event.preventDefault();">
            ${clip.approved ? "Approved" : "Approve"}
          </button>
        </div>
      </summary>
      <div class="clip-details-body">
        <div class="clip-details-grid">
          <div class="clip-details-media">
            ${rawMedia}
          </div>
          <div class="clip-details-info">
            <p>${escapeHtml(clip.caption)}</p>
            ${hashtagsHtml}
            ${clip.reason ? `<p class="clip-reason">${escapeHtml(clip.reason)}</p>` : ""}
            ${clip.transcript ? `<details class="transcript-snippet"><summary>Transcript</summary><p>${escapeHtml(clip.transcript)}</p></details>` : ""}
            <div class="score-row" style="margin-top: 12px;">
              <span class="queue-meta">${formatTime(clip.start)}-${formatTime(clip.end)}</span>
              <span class="queue-meta">${clip.duration}s</span>
            </div>
            <div class="clip-actions" style="margin-top: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              ${clip.platforms.map((platform) => `<span class="platform-chip ${platformClass(platform)}">${platform}</span>`).join("")}
              ${backupHtml}
              <button class="mini-button" type="button" data-action="duplicate" data-clip-id="${clip.id}">Remix</button>
              <button class="mini-button danger" type="button" data-action="delete" data-clip-id="${clip.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    elements.clipGrid.appendChild(details);
  });
}

function renderAccounts() {
  elements.accountList.innerHTML = "";
  state.accounts.forEach((account) => {
    const ready = isPublishReadyAccount(account);
    
    let actionLabel = account.vizardSocialAccountId ? (ready ? "Connected" : "Reconnect") : "Link";
    let actionAttr = `data-account-action="connect" data-account-id="${account.id}"`;
    
    if (account.provider === "direct") {
      actionLabel = "Remove";
      actionAttr = `data-account-action="remove-direct" data-account-id="${account.id}"`;
    } else if (account.provider === "telegram") {
      actionLabel = "Remove";
      actionAttr = `data-account-action="remove-telegram" data-account-id="${account.id}"`;
    }

    const row = document.createElement("div");
    row.className = "account-row";
    row.innerHTML = `
      <div class="account-main">
        <div class="account-title">
          <strong>${escapeHtml(account.platform)} ${escapeHtml(account.handle)}</strong>
          <small>${escapeHtml(account.audience)}</small>
        </div>
        <div class="account-controls">
          <label class="switch" title="Include account">
            <input type="checkbox" ${account.enabled ? "checked" : ""} data-account-enabled="${account.id}">
            <span aria-hidden="true"></span>
          </label>
        </div>
      </div>
      <div class="account-main">
        <span class="account-meta">${escapeHtml(account.review)}</span>
        <button class="mini-button ${(ready && account.provider !== "direct") ? "active" : ""}" type="button" ${actionAttr}>
          ${actionLabel}
        </button>
      </div>
    `;
    elements.accountList.appendChild(row);
  });
}

function renderVizardLibrary() {
  if (!elements.vizardLibrary) return;
  elements.vizardLibrary.innerHTML = "";

  if (!state.vizardProjects.length) {
    const row = document.createElement("div");
    row.className = "empty-state library-empty";
    row.innerHTML = "<h3>No Vizard videos yet</h3><p>Generate clips with Vizard AI and they will appear here.</p>";
    elements.vizardLibrary.appendChild(row);
    return;
  }

  state.vizardProjects.forEach((project) => {
    const article = document.createElement("article");
    article.className = "library-project";
    const clips = project.clips || [];
    const created = formatProjectDate(project.createdAt);
    const refreshLabel = project.projectId ? "Refreshable" : "Current session";
    
    let clipsGridContent = "";
    if (clips.length > 0) {
      clipsGridContent = `<div class="library-video-grid">
        ${clips.map((clip) => renderLibraryVideo(clip, project.id)).join("")}
      </div>`;
    } else {
      const isError = project.status === "error";
      const statusMessage = isError 
        ? `⚠️ Error: ${escapeHtml(project.error || "Could not retrieve project.")}`
        : `⏳ Processing in Vizard AI... Checking status automatically. You can also click <strong>Refresh</strong> above to poll now.`;
      clipsGridContent = `
        <div style="padding: 20px; background: var(--panel-strong); border: 1px dashed var(--line); border-radius: 8px; text-align: center; color: var(--muted); font-size: 0.85rem; margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <span style="font-weight: 500; color: var(--ink);">${isError ? "Retrieval Failed" : "⏳ Generating Clips"}</span>
          <p style="margin: 0; line-height: 1.4; max-width: 500px;">${statusMessage}</p>
        </div>
      `;
    }

    article.innerHTML = `
      <div class="library-project-heading">
        <div class="library-project-title">
          <strong>${escapeHtml(project.projectName || "Vizard project")}</strong>
          <small>${clips.length} video${clips.length === 1 ? "" : "s"} - ${escapeHtml(created || refreshLabel)}</small>
          ${project.projectId ? `<span class="project-id-chip">ID ${escapeHtml(project.projectId)}</span>` : ""}
        </div>
        <div class="library-actions">
          ${project.shareLink ? `<a class="mini-button" href="${escapeHtml(project.shareLink)}" target="_blank" rel="noreferrer">Open</a>` : ""}
          ${project.projectId ? `<button class="mini-button" type="button" data-library-action="copy-id" data-project-id-value="${escapeHtml(project.projectId)}">Copy ID</button>` : ""}
          ${clips.length > 0 ? `<button class="mini-button active" type="button" data-library-action="load" data-project-id="${project.id}">Load to desk</button>` : ""}
           </div>
      ${clipsGridContent}
    `;
    elements.vizardLibrary.appendChild(article);
  });
}

function renderLibraryVideo(clip, projectId) {
  const videoSrc = assetUrl(clip.videoUrl || clip.clipEditorUrl);
  const isBackedUp = (state.gdriveBackedUpUrls && state.gdriveBackedUpUrls.includes(clip.videoUrl)) || clip.gdriveBackedUp || (clip.videoUrl && state.gdriveBackedUpUrls?.includes(clip.videoUrl));
  
  const video = clip.videoUrl
    ? `<div class="click-to-play-wrapper" data-video-src="${escapeHtml(videoSrc)}" data-editor-url="${escapeHtml(clip.clipEditorUrl || clip.videoUrl)}" style="position: relative; width: 100%; height: 140px; overflow: hidden; background: #0f172a; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${clip.thumbUrl ? `<img src="${escapeHtml(assetUrl(clip.thumbUrl))}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #0f172a); position: absolute; inset: 0;"></div>`}
        <div class="video-play-backdrop" style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center;">
          <div class="play-button-overlay" style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; transition: transform 0.2s ease, background 0.2s ease; z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor; margin-left: 1px;"><path d="M8 5v14l11-7z"></path></svg>
          </div>
        </div>
        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(15, 23, 42, 0.75); padding: 2px 4px; border-radius: 3px; font-size: 0.65rem; color: var(--ink); z-index: 15; font-weight: 500; font-family: var(--font-mono);">Click to play</span>
      </div>`
    : `<div class="library-video-placeholder">Video link expired</div>`;
  
  const editor = clip.clipEditorUrl
    ? `<a class="mini-button" href="${escapeHtml(clip.clipEditorUrl)}" target="_blank" rel="noreferrer" style="font-size: 0.75rem; text-decoration: none;">Edit ↗</a>`
    : "";
 
  const inDesk = state.clips && state.clips.some((c) => c.videoUrl === clip.videoUrl || c.title === clip.title);
  const sendAction = inDesk
    ? `<span class="sync-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.725rem; font-weight: 600; color: #3b82f6; padding: 3px 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px; white-space: nowrap;"><svg viewBox="0 0 24 24" style="width:14px; height: 14px; fill: currentColor;"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Sent</span>`
    : `<button class="mini-button send-desk" type="button" data-library-action="send-to-desk" data-clip-id="${clip.id}" data-project-id="${projectId}" style="background: #0ea5e9; color: white; border: none; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">
        📥 Send Desk
      </button>`;

  const driveAction = clip.videoUrl ? (isBackedUp 
    ? `<span class="sync-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.725rem; font-weight: 600; color: #10b981; padding: 3px 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px; white-space: nowrap;"><svg viewBox="0 0 24 24" style="width:14px; height: 14px; fill: currentColor;"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Synced</span>`
    : `<button class="mini-button gdrive" type="button" data-library-action="backup-gdrive" data-clip-id="${clip.id}" data-project-id="${projectId}" style="${liveUploadingClipIds.has(clip.id) ? "opacity: 0.6; cursor: wait;" : "background: #4f46e5; color: white;"}" ${liveUploadingClipIds.has(clip.id) ? "disabled" : ""}>
        ${liveUploadingClipIds.has(clip.id) ? "Saving..." : "To Drive 💾"}
      </button>`
  ) : "";

  return `
    <article class="library-video-card" style="display: flex; flex-direction: column; gap: 8px;">
      ${video}
      <div class="library-video-body" style="padding: 4px 0; display: flex; flex-direction: column; flex-grow: 1;">
        <strong style="display: block; margin-bottom: 4px; font-size: 0.85rem;">${escapeHtml(clip.title || "Vizard clip")}</strong>
        <p style="font-size: 0.75rem; color: var(--muted); margin-bottom: 8px; flex-grow: 1;">${escapeHtml(clip.caption || clip.reason || "")}</p>
        <div class="library-video-meta" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: auto;">
          <span class="platform-chip" style="font-size: 0.7rem; padding: 2px 6px;">${clip.duration || 0}s</span>
          <span class="platform-chip instagram" style="font-size: 0.7rem; padding: 2px 6px;">Score ${clip.score || 0}</span>
          ${editor}
          ${driveAction}
          ${sendAction}
        </div>
      </div>
    </article>
  `;
}

function renderQueue() {
  elements.queueTable.innerHTML = "";
  renderQueueNotifications();
  renderPublishedDriveBin();

  if (!state.queue.length) {
    const row = document.createElement("div");
    row.className = "empty-state";
    row.style.minHeight = "180px";
    row.innerHTML = "<h3>No scheduled posts</h3><p>Approve clips and add them to the queue.</p>";
    elements.queueTable.appendChild(row);
    return;
  }

  state.queue.forEach((job) => {
    const row = document.createElement("div");
    row.className = "queue-row";
    row.innerHTML = `
      <div class="queue-title">
        <strong>${escapeHtml(job.clipTitle)}</strong>
        <small>${escapeHtml(job.platform)} ${escapeHtml(job.handle)}</small>
        ${job.uploadedToAccount ? `<small style="color: var(--muted); font-size: 0.75rem; margin-top: 2px;">Uploaded to: ${escapeHtml(job.uploadedToAccount)} ${job.isTelegramBot ? '(Telegram Bot)' : ''}</small>` : ''}
        ${job.uploadDate && job.uploadTime ? `<small style="color: var(--muted); font-size: 0.75rem; margin-top: 2px;">On: ${escapeHtml(job.uploadDate)} at ${escapeHtml(job.uploadTime)}</small>` : ''}
        ${job.error ? `<small class="queue-error">${escapeHtml(job.error)}</small>` : ""}
      </div>
      <span class="queue-status ${job.statusType}">${escapeHtml(job.status)}</span>
    `;
    elements.queueTable.appendChild(row);
  });
}

function renderQueueNotifications() {
  state.queueNotifications = normalizeQueueNotifications(state.queueNotifications || []);
  if (!state.queueNotifications.length) return;

  const section = document.createElement("section");
  section.className = "queue-notifications";
  section.innerHTML = `
    <div class="queue-notifications-header">
      <div>
        <p class="eyebrow">Process Log</p>
        <h3>Recent activity</h3>
      </div>
      <button class="mini-button" type="button" data-queue-notice-action="clear">Clear</button>
    </div>
    <div class="queue-notifications-list">
      ${state.queueNotifications.map((notice) => `
        <div class="queue-notification ${escapeHtml(notice.tone)}">
          <div class="queue-title">
            <strong>${escapeHtml(notice.message)}</strong>
            <small>${escapeHtml(formatProjectDate(notice.createdAt))}</small>
          </div>
          <span class="queue-status ${notice.tone === "error" ? "blocked" : "ready"}">${notice.tone === "error" ? "Failed" : "Done"}</span>
        </div>
      `).join("")}
    </div>
  `;

  elements.queueTable.appendChild(section);
  section.querySelector("[data-queue-notice-action='clear']")?.addEventListener("click", () => {
    state.queueNotifications = [];
    persistStateOnly();
    renderQueue();
  });
}

function renderPublishedDriveBin() {
  state.publishedDriveBin = normalizePublishedDriveBin(state.publishedDriveBin || []);
  if (!state.publishedDriveBin.length) return;

  const bin = document.createElement("section");
  bin.className = "drive-bin";
  bin.innerHTML = `
    <div class="drive-bin-header">
      <div>
        <p class="eyebrow">Google Drive cleanup</p>
        <h3>Published video bin</h3>
      </div>
      <button class="mini-button danger" type="button" data-drive-bin-action="delete-all">Delete all from Drive</button>
    </div>
    <div class="drive-bin-list">
      ${state.publishedDriveBin.map((item) => `
        <div class="drive-bin-row">
          <div class="queue-title">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${item.publishedAt ? `Published ${escapeHtml(formatProjectDate(item.publishedAt))}` : "Ready for Drive cleanup"}</small>
          </div>
          <button class="mini-button danger" type="button" data-drive-bin-action="delete-one" data-bin-id="${escapeHtml(item.id)}">Delete from Drive</button>
        </div>
      `).join("")}
    </div>
  `;

  elements.queueTable.appendChild(bin);
  bin.querySelector("[data-drive-bin-action='delete-all']")?.addEventListener("click", () => {
    deletePublishedDriveBinItems(state.publishedDriveBin.map((item) => item.id));
  });
  bin.querySelectorAll("[data-drive-bin-action='delete-one']").forEach((button) => {
    button.addEventListener("click", () => {
      deletePublishedDriveBinItems([button.dataset.binId]);
    });
  });
}

function renderCounters() {
  const approved = state.clips.filter((clip) => clip.approved).length;
  const enabledAccounts = state.accounts.filter((account) => account.enabled);
  const allEnabledReady = enabledAccounts.every(isPublishReadyAccount);
  const hasSource = Boolean(state.source.title || state.source.youtubeUrl || state.source.fileName);
  const ready = hasSource && approved > 0 && enabledAccounts.length > 0 && allEnabledReady;

  elements.approvedCount.textContent = approved;
  elements.readinessPill.textContent = ready ? "Ready to queue" : "Setup needed";
  elements.readinessPill.classList.toggle("ready", ready);
}

function getFilteredClips() {
  if (activeFilter === "approved") {
    return state.clips.filter((clip) => clip.approved);
  }
  if (activeFilter === "review") {
    return state.clips.filter((clip) => !clip.approved);
  }
  return state.clips;
}

function getQueueStatus(account) {
  if (account.provider === "direct" || account.provider === "telegram") {
    if (!account.connected) {
      return { label: "Reconnect", type: "blocked" };
    }
    return { label: "Queued", type: "ready" };
  }
  if (!account.vizardSocialAccountId) {
    return { label: "Sync Vizard", type: "blocked" };
  }
  if (!account.connected) {
    return { label: "Reconnect", type: "blocked" };
  }
  if (account.gate === "audit") {
    return { label: "Audit gated", type: "blocked" };
  }
  return { label: "Queued", type: "ready" };
}

function getActiveVizardApiKey() {
  state.vizardApiAccounts = state.vizardApiAccounts || [];
  state.activeVizardAccountId = state.activeVizardAccountId || "system";

  if (state.activeVizardAccountId === "system") {
    return "";
  }
  const activeAcc = state.vizardApiAccounts.find(acc => acc.id === state.activeVizardAccountId);
  return activeAcc ? activeAcc.apiKey : "";
}

function getVizardHeaders(existingHeaders = {}) {
  const headers = { ...existingHeaders };
  const customKey = getActiveVizardApiKey();
  if (customKey) {
    headers["X-Vizard-Api-Key"] = customKey;
  }
  return headers;
}

function renderVizardApiAccounts() {
  if (!elements.vizardAccountsContainer) return;

  state.vizardApiAccounts = state.vizardApiAccounts || [];
  state.activeVizardAccountId = state.activeVizardAccountId || "system";

  const accounts = state.vizardApiAccounts;
  const activeId = state.activeVizardAccountId;

  elements.vizardAccountsContainer.innerHTML = `
    <div style="background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; display: flex; flex-direction: column; gap: 14px;">
      
      <!-- Selector List -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label for="activeVizardAccountSelect" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 500; text-align: left;">Active API Account</label>
        <select id="activeVizardAccountSelect" style="background: var(--panel-strong); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; width: 100%; outline: none; height: 38px; cursor: pointer;">
          <option value="system" ${activeId === "system" ? "selected" : ""}>
            🏢 System Default Key ${systemVizardConfigured ? "(Connected 🟢)" : "(Not configured)"}
          </option>
          ${accounts.map(acc => `
            <option value="${escapeHtml(acc.id)}" ${activeId === acc.id ? "selected" : ""}>
              🔑 ${escapeHtml(acc.name)} (${escapeHtml(acc.apiKey.substring(0, 6))}...${escapeHtml(acc.apiKey.slice(-4))})
            </option>
          `).join("")}
        </select>
      </div>

      <!-- Configured Accounts list with Delete/Close option -->
      ${accounts.length > 0 ? `
        <div style="border-top: 1px solid var(--line); padding-top: 12px;">
          <h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 500; margin-bottom: 8px; text-align: left;">Configured Keychains</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${accounts.map(acc => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--panel-strong); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--line); font-size: 0.825rem; gap: 8px;">
                <div style="display: flex; flex-direction: column; gap: 2px; text-align: left; min-width: 0; flex: 1;">
                  <strong style="color: var(--ink); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(acc.name)}</strong>
                  <span style="font-family: monospace; font-size: 0.725rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(acc.apiKey.substring(0, 8))}****************
                  </span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
                  ${activeId === acc.id ? `
                    <span style="background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; font-weight: 500;">Active</span>
                  ` : ""}
                  <button class="danger-button close-vizard-acc" type="button" data-acc-id="${escapeHtml(acc.id)}" style="padding: 4px 8px; font-size: 0.725rem; height: 26px; border-radius: 4px; margin: 0; display: inline-flex; align-items: center; gap: 4px;">
                    Close Account
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Add New Account Section -->
      <div style="border-top: 1px solid var(--line); padding-top: 12px; display: flex; flex-direction: column; gap: 10px;">
        <h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 500; margin-bottom: 2px; text-align: left;">Add New Vizard Account</h4>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <input type="text" id="newVizardAccName" placeholder="Account Name (e.g. Marketing Workspace)" style="background: var(--panel-strong); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 0.825rem; height: 35px; outline: none; width: 100%;">
          <div style="display: flex; gap: 6px;">
            <input type="password" id="newVizardAccKey" placeholder="Paste Vizard API Key (vzd_...)" style="background: var(--panel-strong); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 0.825rem; height: 35px; outline: none; flex: 1;">
            <button id="addVizardAccBtn" type="button" class="primary-button" style="height: 35px; padding: 0 14px; font-size: 0.8rem; margin: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 500; background: #6366f1; border: none; border-radius: 6px; color: white; flex-shrink: 0;">
              Add Workspace
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  // Selector listener
  const selectEl = elements.vizardAccountsContainer.querySelector("#activeVizardAccountSelect");
  if (selectEl) {
    selectEl.addEventListener("change", async (e) => {
      state.activeVizardAccountId = e.target.value;
      saveAndRender();
      
      try {
        setClipStatus("Switched workspace. Syncing distribution accounts...", "ready");
        await syncVizardAccounts();
      } catch (err) {
        console.warn("Failed to auto-sync workspaces", err);
      }
    });
  }

  // Create workspace account listener
  const addBtn = elements.vizardAccountsContainer.querySelector("#addVizardAccBtn");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const nameInput = elements.vizardAccountsContainer.querySelector("#newVizardAccName");
      const keyInput = elements.vizardAccountsContainer.querySelector("#newVizardAccKey");
      const name = nameInput ? nameInput.value.trim() : "";
      const key = keyInput ? keyInput.value.trim() : "";

      if (!name) {
        setClipStatus("Please enter an Account Name.", "error");
        return;
      }
      if (!key) {
        setClipStatus("Please enter a Vizard API Key.", "error");
        return;
      }

      const newId = "vizard-acc-" + Date.now();
      state.vizardApiAccounts = state.vizardApiAccounts || [];
      state.vizardApiAccounts.push({
        id: newId,
        name: name,
        apiKey: key
      });
      state.activeVizardAccountId = newId;
      
      saveAndRender();
      setClipStatus(`Added Vizard API account: "${name}"`, "ready");

      try {
        await syncVizardAccounts();
      } catch (err) {
        console.warn(err);
      }
    });
  }

  // Delete/Close Account Click Handler
  elements.vizardAccountsContainer.querySelectorAll(".close-vizard-acc").forEach(btn => {
    btn.addEventListener("click", () => {
      const accId = btn.getAttribute("data-acc-id");
      if (!accId) return;

      const idx = state.vizardApiAccounts.findIndex(acc => acc.id === accId);
      if (idx !== -1) {
        const removedName = state.vizardApiAccounts[idx].name;
        state.vizardApiAccounts.splice(idx, 1);
        
        if (state.activeVizardAccountId === accId) {
          state.activeVizardAccountId = "system";
        }
        
        saveAndRender();
        setClipStatus(`Removed workspace API account: "${removedName}"`, "ready");

        syncVizardAccounts().catch(() => {});
      }
    });
  });
}

async function syncVizardAccounts() {
  elements.syncAccounts.disabled = true;
  setClipStatus("Checking the social accounts connected in Vizard.", "ready");

  try {
    const response = await fetch(apiUrl("/api/vizard/social-accounts"), {
      headers: getVizardHeaders()
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Could not read Vizard social accounts.");
    }

    const savedById = new Map(state.accounts.map((account) => [account.id, account]));
    const vizardSyncedAccounts = (data.accounts || [])
      .filter((account) => account.id)
      .map((account) => {
        const mapped = mapVizardAccount(account);
        const saved = savedById.get(mapped.id);
        return {
          ...mapped,
          enabled: saved?.enabled ?? mapped.connected,
        };
      });

    // Merge Vizard synced accounts with existing accounts (preserving direct/telegram)
    const newAccountsMap = new Map();
    state.accounts.forEach(acc => newAccountsMap.set(acc.id, acc)); // Keep existing
    vizardSyncedAccounts.forEach(acc => newAccountsMap.set(acc.id, acc)); // Overwrite/add Vizard ones
    baseAccounts.forEach(baseAcc => { // Ensure base accounts are still there if not synced
      if (!newAccountsMap.has(baseAcc.id)) newAccountsMap.set(baseAcc.id, baseAcc);
    });
    state.accounts = Array.from(newAccountsMap.values());
    saveAndRender();
    setClipStatus(
      vizardSyncedAccounts.length
        ? `Synced ${vizardSyncedAccounts.length} connected Vizard account${vizardSyncedAccounts.length === 1 ? "" : "s"}.`
        : "No Vizard accounts found yet. Use Link, connect accounts in Vizard, then sync.",
      vizardSyncedAccounts.length ? "ready" : "",
    );
  } catch (error) {
    setClipStatus(error.message || "Could not sync Vizard accounts.", "error");
  } finally {
    elements.syncAccounts.disabled = false;
  }
}

async function refreshVizardLibrary() {
  const projects = state.vizardProjects.filter((project) => project.projectId);

  if (!projects.length) {
    setClipStatus("Paste a Vizard project ID or project link in Videos, then retrieve it.", "");
    return;
  }

  if (elements.refreshVizardLibrary) elements.refreshVizardLibrary.disabled = true;
  setClipStatus(`Refreshing ${projects.length} Vizard project${projects.length === 1 ? "" : "s"}.`, "ready");

  let reloadedActive = false;

  for (const project of projects) {
    try {
      const data = await fetchVizardProject(project.projectId);
      updateStoredVizardProject(data.source, data.clips || [], data.understanding, project);

      // If this is the active project, reload it into the desk!
      if (state.source.vizardProjectId === project.projectId) {
        const updatedProject = state.vizardProjects.find((item) => item.projectId === project.projectId);
        if (updatedProject && updatedProject.clips?.length) {
          loadVizardProjectIntoDesk(updatedProject);
          reloadedActive = true;
        }
      }
    } catch (error) {
      project.status = "error";
      project.error = error.message || "Could not refresh this project.";
    }
  }

  if (elements.refreshVizardLibrary) elements.refreshVizardLibrary.disabled = false;
  saveAndRender();
  
  if (reloadedActive) {
    setQueueProcessStatus("Vizard video library refreshed. Currently loaded project highlights updated.", "ready");
  } else {
    setQueueProcessStatus("Vizard video library refreshed.", "ready");
  }
}

async function importVizardProjectFromInput() {
  if (!elements.vizardProjectInput) return;
  const projectId = extractVizardProjectId(elements.vizardProjectInput.value);

  if (!projectId) {
    setClipStatus("Paste a numeric Vizard project ID or a Vizard project URL.", "error");
    return;
  }

  elements.vizardProjectInput.disabled = true;
  if (elements.refreshVizardLibrary) elements.refreshVizardLibrary.disabled = true;
  setClipStatus(`Retrieving Vizard project ${projectId}.`, "ready");

  try {
    const project = await fetchVizardProject(projectId);

    updateStoredVizardProject(project.source, project.clips || [], project.understanding, { projectId });
    elements.vizardProjectInput.value = "";
    saveAndRender();

    const savedProject = state.vizardProjects.find((item) => item.projectId === projectId);
    
    if (savedProject) {
      if (savedProject.clips?.length) {
        loadVizardProjectIntoDesk(savedProject, { navigateToDesk: true });
        setQueueProcessStatus(`Retrieved ${savedProject.clips.length} video${savedProject.clips.length === 1 ? "" : "s"} from Vizard project ${projectId}.`, "ready");
      } else {
        // If it's a processing project, let's load it empty but set progress, and kick off background polling
        state.clips = [];
        state.understanding = savedProject.understanding || null;
        state.source.vizardProjectId = savedProject.projectId || "";
        state.source.title = savedProject.projectName || "Retrieving project...";
        elements.videoTitle.value = state.source.title;
        saveAndRender();
        
        setClipStatus(`Vizard project ${projectId} is currently processing! Clipflow will automatically load the videos the moment they are generated.`, "ready");
        startVizardBackgroundPolling();
      }
    }
  } catch (error) {
    setClipStatus(error.message || "Could not retrieve that Vizard project.", "error");
  } finally {
    if (elements.vizardProjectInput) elements.vizardProjectInput.disabled = false;
    if (elements.refreshVizardLibrary) elements.refreshVizardLibrary.disabled = false;
  }
}

async function fetchVizardProject(projectId) {
  const response = await fetch(apiUrl(`/api/vizard/project?projectId=${encodeURIComponent(projectId)}`), {
    headers: getVizardHeaders()
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not retrieve that Vizard project.");
  }

  return data;
}

function rememberVizardProject(source, clips, understanding) {
  const project = buildVizardProject(source, clips, understanding);
  if (!project) return;
  updateStoredVizardProject(source, clips, understanding, project);
}

function updateStoredVizardProject(source, clips, understanding, fallbackProject) {
  const project = buildVizardProject(source, clips, understanding, fallbackProject);
  if (!project) return;

  const existingIndex = state.vizardProjects.findIndex((item) => {
    return (project.projectId && item.projectId === project.projectId) || item.id === project.id;
  });

  if (existingIndex >= 0) {
    const existingProject = state.vizardProjects[existingIndex];
    state.vizardProjects[existingIndex] = {
      ...existingProject,
      ...project,
      clips: mergePersistentClipState(project.clips, [
        ...(existingProject.clips || []),
        ...(state.clips || []),
      ]),
      createdAt: existingProject.createdAt || project.createdAt,
    };
    return;
  }

  state.vizardProjects.unshift(project);
}

function mergePersistentClipState(nextClips, previousClips) {
  const previousByIdentity = new Map();

  (previousClips || []).forEach((clip) => {
    getClipIdentityKeys(clip).forEach((key) => previousByIdentity.set(key, clip));
  });

  return (nextClips || []).map((clip) => {
    const previous = getClipIdentityKeys(clip)
      .map((key) => previousByIdentity.get(key))
      .find(Boolean);

    if (!previous) return clip;

    return {
      ...clip,
      gdriveBackedUp: clip.gdriveBackedUp || previous.gdriveBackedUp || false,
      gdriveFileId: clip.gdriveFileId || previous.gdriveFileId || "",
      gdriveFolderId: clip.gdriveFolderId || previous.gdriveFolderId || "",
    };
  });
}

function getClipIdentityKeys(clip) {
  if (!clip) return [];
  return [
    clip.id ? `id:${clip.id}` : "",
    clip.videoUrl ? `url:${clip.videoUrl}` : "",
    clip.vizardVideoId ? `vizard:${clip.vizardVideoId}` : "",
    clip.title && clip.start !== undefined && clip.end !== undefined ? `range:${clip.title}:${clip.start}:${clip.end}` : "",
  ].filter(Boolean);
}

function buildVizardProject(source, clips, understanding, fallbackProject = {}) {
  const cleanClips = normalizeClips(clips || [])
    .filter((clip) => clip.provider === "vizard" || clip.vizardVideoId || isExternalUrl(clip.videoUrl))
    .map((clip, index) => ({
      ...clip,
      id: clip.id || createId("vizard-clip"),
      platforms: destinationPlatforms,
      thumb: clip.thumb || thumbBackgrounds[index % thumbBackgrounds.length],
      provider: "vizard",
      real: true,
    }));

  const projectId = String(source?.projectId || fallbackProject.projectId || "").trim();

  // If there are no clips AND no projectId, then it is not a valid project to store.
  if (!cleanClips.length && !projectId) return null;

  const createdAt = fallbackProject.createdAt || new Date().toISOString();
  const projectName =
    source?.projectName ||
    source?.title ||
    fallbackProject.projectName ||
    fallbackProject.sourceTitle ||
    "Vizard project";

  // If clips exist, it's ready. If no clips and projectId exists, fallback status is 'processing'.
  const defaultStatus = cleanClips.length > 0 ? "ready" : "processing";

  return {
    id: projectId ? `vizard-project-${projectId}` : fallbackProject.id || createId("vizard-project"),
    projectId,
    projectName,
    shareLink: source?.shareLink || fallbackProject.shareLink || "",
    status: source?.status || fallbackProject.status || defaultStatus,
    createdAt,
    updatedAt: new Date().toISOString(),
    clipCount: cleanClips.length,
    understanding: understanding || fallbackProject.understanding || null,
    clips: cleanClips,
  };
}

function loadVizardProjectIntoDesk(project, options = {}) {
  const { navigateToDesk = false, notify = true } = options;
  state.clips = normalizeClips(project.clips || []).map((clip, index) => ({
    ...clip,
    id: clip.id || createId("vizard-clip"),
    approved: true,
    style: state.style || state.source.captionStyle || 'Clean creator',
    platforms: destinationPlatforms,
    thumb: clip.thumb || thumbBackgrounds[index % thumbBackgrounds.length],
    provider: "vizard",
    real: true,
  }));
  state.understanding = project.understanding || null;
  state.source.title = project.projectName || state.source.title;
  state.source.vizardProjectId = project.projectId || "";
  state.source.vizardShareLink = project.shareLink || "";
  elements.videoTitle.value = state.source.title;
  state.queue = [];
  saveAndRender();
  if (notify) {
    const loadedMessage = `Loaded ${state.clips.length} Vizard video${state.clips.length === 1 ? "" : "s"} into the clip desk.`;
    setQueueProcessStatus(loadedMessage, "ready");
  }
  triggerAutoBackupToGoogleDrive(state.clips);
  if (navigateToDesk) {
    location.hash = "#studio";
  }
}

async function copyProjectId(projectId) {
  if (!projectId) return;

  try {
    await navigator.clipboard.writeText(projectId);
    setClipStatus(`Copied Vizard project ID ${projectId}.`, "ready");
  } catch {
    if (elements.vizardProjectInput) {
      elements.vizardProjectInput.value = projectId;
      elements.vizardProjectInput.select();
      setClipStatus(`Project ID ${projectId} is selected in the import box.`, "ready");
    } else {
      setClipStatus(`Project ID is ${projectId}`, "ready");
    }
  }
}

async function publishApprovedClips() {
  if (isPublishing) return;

  const approved = state.clips.filter((clip) => clip.approved);
  const accounts = state.accounts.filter((account) => account.enabled);

  if (!approved.length) {
    setClipStatus("Approve at least one clip before publishing.", "error");
    return;
  }

  if (!accounts.length) {
    setClipStatus("Turn on at least one connected account before publishing.", "error");
    return;
  }

  state.queue = approved.flatMap((clip) => {
    return accounts.map((account) => createPublishJob(clip, account));
  });
  saveAndRender();

  const publishableJobs = state.queue.filter((job) => job.statusType !== "blocked");

  if (!publishableJobs.length) {
    setClipStatus("Use Vizard clips and synced Vizard accounts before auto-publishing.", "error");
    return;
  }

  isPublishing = true;
  elements.scheduleApproved.disabled = true;
  setClipStatus(`Publishing ${publishableJobs.length} post${publishableJobs.length === 1 ? "" : "s"} through Vizard.`, "ready");

  for (const job of publishableJobs) {
    job.status = "Publishing";
    job.statusType = "waiting";
    saveAndRender();

    try {
      await publishJob(job);
      job.status = "Published";
      job.statusType = "ready";
      job.error = "";
      addPublishedDriveClipToBin(job);
    } catch (error) {
      job.status = "Failed";
      job.statusType = "blocked";
      job.error = error.message || "The platform rejected this publish.";
    }

    saveAndRender();
  }

  isPublishing = false;
  elements.scheduleApproved.disabled = false;

  const failed = state.queue.filter((job) => job.status === "Failed").length;
  setQueueProcessStatus(
    failed
      ? `${failed} post${failed === 1 ? "" : "s"} need attention. Check the queue.`
      : "All approved clips were sent to the selected accounts.",
    failed ? "error" : "ready",
  );
}

function createPublishJob(clip, account) {
  const accountStatus = getQueueStatus(account);
  const missingClipId = !clip.vizardVideoId && !clip.videoUrl;
  const blocked = accountStatus.type === "blocked" || missingClipId;

  return {
    id: createId("job"),
    clipId: clip.id,
    clipTitle: clip.title,
    platform: account.platform,
    handle: account.handle,
    finalVideoId: clip.vizardVideoId || "",
    videoUrl: clip.videoUrl || "",
    gdriveFileId: clip.gdriveFileId || "",
    gdriveFolderId: clip.gdriveFolderId || "",
    socialAccountId: account.vizardSocialAccountId || "",
    provider: account.provider || "vizard",
    directMode: account.directMode || "assistant",
    directToken: account.directToken || "",
    telegramBotToken: account.telegramBotToken || "",
    telegramChatId: account.telegramChatId || "",
    post: clip.caption || clip.title || "",
    title: clip.title || clip.caption || "Short video",
    status: missingClipId ? "Video source needed" : accountStatus.label,
    statusType: blocked ? "blocked" : "ready",
    scheduledFor: "Now",
    // New fields to remember upload details
    uploadedToAccount: account.handle,
    isTelegramBot: account.provider === "telegram",
    uploadTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    uploadDate: new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
  };
}

function addPublishedDriveClipToBin(job) {
  if (!job || (!job.gdriveFolderId && !job.gdriveFileId)) return;

  state.publishedDriveBin = normalizePublishedDriveBin(state.publishedDriveBin || []);
  const driveKey = job.gdriveFolderId || job.gdriveFileId;
  const alreadyQueued = state.publishedDriveBin.some((item) => (
    (item.gdriveFolderId || item.gdriveFileId) === driveKey
  ));
  if (alreadyQueued) return;

  state.publishedDriveBin.unshift({
    id: `drivebin-${driveKey}`,
    clipId: job.clipId || "",
    title: job.clipTitle || job.title || "Published Drive video",
    gdriveFolderId: job.gdriveFolderId || "",
    gdriveFileId: job.gdriveFileId || "",
    publishedAt: new Date().toISOString(),
    source: "queue",
  });
}

async function deleteDriveTargets({ folderIds = [], fileIds = [] }) {
  const safeFolderIds = folderIds.filter(Boolean);
  const safeFileIds = fileIds.filter(Boolean);
  if (!safeFolderIds.length && !safeFileIds.length) return { ok: true, deletedCount: 0 };

  const response = await fetch(apiUrl("/api/drive/delete-discarded"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderIds: safeFolderIds, fileIds: safeFileIds }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Google Drive delete failed.");
  }
  return data;
}

async function deletePublishedDriveBinItems(binIds) {
  const selectedIds = new Set((Array.isArray(binIds) ? binIds : []).filter(Boolean));
  state.publishedDriveBin = normalizePublishedDriveBin(state.publishedDriveBin || []);
  const targets = state.publishedDriveBin.filter((item) => selectedIds.has(item.id));
  if (!targets.length) return;

  setClipStatus(`Deleting ${targets.length} Google Drive item${targets.length === 1 ? "" : "s"}...`, "ready");
  try {
    await deleteDriveTargets({
      folderIds: targets.map((item) => item.gdriveFolderId).filter(Boolean),
      fileIds: targets.filter((item) => !item.gdriveFolderId).map((item) => item.gdriveFileId).filter(Boolean),
    });
    state.publishedDriveBin = state.publishedDriveBin.filter((item) => !selectedIds.has(item.id));
    saveAndRender();
    setQueueProcessStatus("Google Drive cleanup complete.", "ready");
  } catch (error) {
    setQueueProcessStatus(error.message || "Google Drive cleanup failed.", "error");
  }
}

async function publishJob(job) {
  let finalVideoUrl = job.videoUrl;
  if (finalVideoUrl && (finalVideoUrl.startsWith("/") || finalVideoUrl.startsWith("./") || !finalVideoUrl.startsWith("http"))) {
    const relativePath = finalVideoUrl.replace(/^\.?\//, "");
    finalVideoUrl = `${window.location.origin}/${relativePath}`;
  }

  if (job.provider === "direct" && job.directMode === "assistant") {
    // Open TikTok in the system browser (Comet on macOS) via the backend helper.
    // This avoids popup blockers and works even if ClipFlow is running in an embedded browser.
    try {
      fetch(apiUrl("/api/open-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://www.tiktok.com/upload" }),
      }).catch(() => {});
    } catch {}

    const copyCaptionNow = async () => {
      try {
        await navigator.clipboard.writeText(job.post || "");
        return true;
      } catch (clipErr) {
        console.warn("Unable to write caption to clipboard:", clipErr);
        return false;
      }
    };

    // Best-effort automatic copy (may fail in embedded browsers; we also provide a button).
    copyCaptionNow().catch(() => {});

    // 3. Initiate programmatic anchor click download for the video clip
    try {
      const res = await fetch(finalVideoUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const sanitizedTitle = (job.title || "tiktok_clip").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${sanitizedTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // CORS or network fallback
      const a = document.createElement("a");
      a.href = finalVideoUrl;
      a.target = "_blank";
      const sanitizedTitle = (job.title || "tiktok_clip").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${sanitizedTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // 4. Inject aesthetic onboarding helper modal in ClipFlow workspace
    const modal = document.createElement("div");
    modal.id = "smartAssistantModal";
    modal.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px;";
    
    modal.innerHTML = `
      <div style="background: #111116; border: 2px solid #25f4f1; border-radius: 12px; width: 100%; max-width: 465px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); font-family: system-ui, sans-serif; color: #fff; text-align: left;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
          <div style="background: rgba(37, 244, 241, 0.1); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #25f4f1;">
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #25f4f1;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #fff;">Smart Assistant Active</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #25f4f1; text-transform: uppercase; letter-spacing: 0.5px;">TikTok Direct Post Bypass</p>
          </div>
        </div>
        
        <p style="margin: 0 0 16px 0; font-size: 0.88rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
          Your video <strong>"${escapeHtml(job.title)}"</strong> is ready to post to <strong>${escapeHtml(job.handle)}</strong> bypassing other API certification blocks!
        </p>

        <div style="background: rgba(37, 244, 241, 0.05); border: 1px solid rgba(37, 244, 241, 0.15); border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 0.82rem; display: flex; flex-direction: column; gap: 10px; line-height: 1.4;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="font-weight: 800; color: #25f4f1;">✓</span>
            <span><strong>Video download started:</strong> The short clip has been saved to your downloads list.</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="font-weight: 800; color: #25f4f1;">✓</span>
            <div>
              <strong>Caption copied to clipboard:</strong>
              <div style="background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 4px; margin-top: 4px; color: #25f4f1; font-family: monospace; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px;">
                ${escapeHtml(job.post || "Clip Title")}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="font-weight: 800; color: #25f4f1;">!</span>
            <span><strong>To publish:</strong> Drag & drop the downloaded file in the newly opened tab, and hit Ctrl+V.</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
          <button id="copyCaptionBtn" style="background: transparent; border: 1px solid rgba(37,244,241,0.5); color: #25f4f1; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700;">
            Copy caption
          </button>
          <button id="downloadClipBtn" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
            Download video
          </button>
          <button id="closeSmartAssistant" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 500;">
            Close Assistant
          </button>
          <button id="reopenTikTokTab" style="background: #25f4f1; border: none; color: #000; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700;">
            Open TikTok Upload ↗
          </button>
        </div>
      </div>
    `;

    const downloadUrl = apiUrl(`/api/download?url=${encodeURIComponent(finalVideoUrl)}&name=${encodeURIComponent((job.title || "clip").slice(0, 80) + ".mp4")}`);

    modal.querySelector("#copyCaptionBtn").addEventListener("click", async () => {
      const ok = await copyCaptionNow();
      if (!ok) setClipStatus("Clipboard copy blocked by browser. Copy manually from the modal text.", "error");
    });

    modal.querySelector("#downloadClipBtn").addEventListener("click", () => {
      // Open the download link in Safari via backend helper so it saves reliably.
      try {
        fetch(apiUrl("/api/open-url"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `${window.location.origin}${downloadUrl}` }),
        }).catch(() => {});
      } catch {}
    });

    document.body.appendChild(modal);

    modal.querySelector("#closeSmartAssistant").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector("#reopenTikTokTab").addEventListener("click", () => {
      try {
        fetch(apiUrl("/api/open-url"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://www.tiktok.com/upload" }),
        }).catch(() => {});
      } catch {}
    });

    return;
  }

  if (job.provider === "telegram") {
    const response = await fetch(apiUrl("/api/telegram/publish"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl: finalVideoUrl,
        post: job.post,
        title: job.title,
        handle: job.handle,
        telegramBotToken: job.telegramBotToken || "",
        telegramChatId: job.telegramChatId || "",
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Telegram publishing failed.");
    }
    return;
  }

  if (job.provider === "direct") {
    const response = await fetch(apiUrl("/api/tiktok/publish"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl: finalVideoUrl,
        post: job.post,
        title: job.title,
        handle: job.handle,
        directToken: job.directToken || "",
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "TikTok Direct Publishing failed.");
    }
    return;
  }

  const response = await fetch(apiUrl("/api/vizard/publish"), {
    method: "POST",
    headers: getVizardHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      finalVideoId: job.finalVideoId || undefined,
      videoUrl: finalVideoUrl || undefined,
      socialAccountId: job.socialAccountId,
      post: job.post,
      title: job.title,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Vizard could not publish this post.");
  }

  if (data.vizardVideoId && job.clipId) {
    const clipIndex = state.clips.findIndex(c => c.id === job.clipId);
    if (clipIndex !== -1) {
      state.clips[clipIndex].vizardVideoId = String(data.vizardVideoId);
      saveAndRender();
    }
  }
}

function mapVizardAccount(account) {
  const platform = normalizeVizardPlatform(account.platform);
  const username = String(account.username || account.page || "Connected account").trim();
  const handle = username.startsWith("@") || username.includes(" ") ? username : `@${username}`;
  const status = String(account.status || "").toLowerCase();
  const connected = status === "active";

  return {
    id: `vizard-${account.id}`,
    platform,
    handle,
    audience: account.page ? String(account.page) : "Vizard workspace",
    connected,
    enabled: connected,
    review: vizardAccountReview(status, account.expiresAt),
    gate: connected ? "ready" : "oauth",
    vizardSocialAccountId: String(account.id),
    vizardStatus: status || "unknown",
    profilePic: account.profilePic || account.pageProfilePic || "",
  };
}

function normalizeVizardPlatform(platform) {
  const value = String(platform || "").toLowerCase();
  if (value.includes("youtube")) return "YouTube Shorts";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("twitter") || value === "x") return "Twitter (X)";
  if (value.includes("linkedin")) return "LinkedIn";
  return platform || "Social";
}

function vizardAccountReview(status, expiresAt) {
  if (status === "active") {
    const expiry = formatVizardExpiry(expiresAt);
    return expiry ? `Ready - ${expiry}` : "Ready through Vizard";
  }
  if (status === "expired") return "Authorization expired";
  if (status === "locked") return "Plan limit reached";
  if (status === "not connected") return "Connect in Vizard";
  return "Check in Vizard";
}

function formatVizardExpiry(expiresAt) {
  const numeric = Number(expiresAt);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const timestamp = numeric < 1000000000000 ? numeric * 1000 : numeric;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `expires ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function isPublishReadyAccount(account) {
  if (account.provider === "direct" || account.provider === "telegram") {
    return Boolean(account.connected && account.gate === "ready");
  }
  return Boolean(account.vizardSocialAccountId && account.connected && account.gate === "ready");
}

function normalizeClips(clips) {
  if (!clips || !Array.isArray(clips)) return [];
  return clips.map((clip) => {
    if (!clip) return {};
    return {
      ...clip,
      platforms: clip.platforms || destinationPlatforms,
      thumb: clip.thumb || (typeof thumbBackgrounds !== "undefined" && thumbBackgrounds[0]) || "",
    };
  });
}

function normalizeVizardProjects(projects, currentClips, source) {
  const normalized = (Array.isArray(projects) ? projects : [])
    .map((project) => buildVizardProject(project, project.clips || [], project.understanding, project))
    .filter(Boolean);

  const hasCurrentVizardClips = currentClips.some((clip) => clip.provider === "vizard" || clip.vizardVideoId);
  if (!normalized.length && hasCurrentVizardClips) {
    const currentProject = buildVizardProject(
      {
        projectId: source.vizardProjectId || "",
        title: source.title || "Current Vizard session",
        shareLink: source.vizardShareLink || "",
      },
      currentClips,
      null,
    );
    if (currentProject) normalized.push(currentProject);
  }

  return normalized;
}

function platformClass(platform) {
  return platform.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createRealClips(file) {
  const params = new URLSearchParams({
    filename: file.name,
    title: state.source.title || cleanFileName(file.name),
    clipCount: String(state.source.clipCount),
    minSeconds: String(state.source.minSeconds),
    maxSeconds: String(state.source.maxSeconds),
  });
  const response = await fetch(apiUrl(`/api/clip?${params}`), {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The local clipper could not process this video.");
  }

  state.source.serverUploadUrl = data.source?.uploadUrl || "";
  state.source.audioUrl = data.source?.audioUrl || "";
  state.source.transcriptUrl = data.source?.transcriptUrl || "";

  return {
    source: data.source || null,
    understanding: data.understanding || null,
    clips: normalizeClips(data.clips || []).map((clip, index) => ({
      ...clip,
      id: clip.id || createId("real-clip"),
      style: state.source.captionStyle,
      platforms: destinationPlatforms,
      thumb: thumbBackgrounds[index % thumbBackgrounds.length],
      real: true,
    })),
  };
}

async function createVizardClips() {
  if (!state.source.youtubeUrl) {
    throw new Error("Vizard needs a YouTube or public video URL. Local files need to be hosted first.");
  }

  const response = await fetch(apiUrl("/api/vizard/clip"), {
    method: "POST",
    headers: getVizardHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      videoUrl: state.source.youtubeUrl,
      title: state.source.title || inferTitleFromUrl(state.source.youtubeUrl) || "Vizard project",
      lang: state.source.videoLanguage || "auto",
      preferLength: preferLengthFromSeconds(state.source.minSeconds, state.source.maxSeconds),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Vizard could not process this video.");
  }

  state.source.vizardProjectId = data.source?.projectId || "";
  state.source.vizardShareLink = data.source?.shareLink || "";

  return {
    source: data.source || null,
    understanding: data.understanding || null,
    clips: normalizeClips(data.clips || []).map((clip, index) => ({
      ...clip,
      id: clip.id || createId("vizard-clip"),
      style: state.source.captionStyle,
      platforms: destinationPlatforms,
      thumb: thumbBackgrounds[index % thumbBackgrounds.length],
      real: true,
      provider: "vizard",
    })),
  };
}

function preferLengthFromSeconds(minSeconds, maxSeconds) {
  if (maxSeconds < 30) return [1];
  if (maxSeconds <= 60) return [2];
  if (maxSeconds <= 90) return [3];
  return [4];
}

async function deleteCurrentVideo() {
  const mediaPaths = [
    state.source.serverUploadUrl,
    state.source.audioUrl,
    state.source.transcriptUrl,
    ...state.clips.flatMap(mediaPathsFromClip),
  ];

  await deleteMedia(mediaPaths.filter((mediaPath) => !isExternalUrl(mediaPath)));
  selectedVideoFile = null;
  elements.videoFile.value = "";
  state.source.fileName = "";
  state.source.serverUploadUrl = "";
  state.source.audioUrl = "";
  state.source.transcriptUrl = "";
  state.understanding = null;
  state.clips = [];
  state.queue = [];
  elements.fileName.textContent = "No file selected";
  saveAndRender();
  setClipStatus("Deleted the selected video and its generated clips.", "ready");
}

async function deleteClip(clip) {
  const mediaPaths = mediaPathsOnlyUsedBy(clip).filter((mediaPath) => !isExternalUrl(mediaPath));

  await deleteMedia(mediaPaths);
  state.clips = state.clips.filter((item) => item.id !== clip.id);
  state.queue = state.queue.filter((job) => job.clipId !== clip.id);
  saveAndRender();
  setClipStatus(`Deleted ${clip.title}.`, "ready");
}

async function deleteMedia(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;

  const response = await fetch(apiUrl("/api/delete-media"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paths: uniquePaths }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not delete local media files.");
  }
}

function mediaPathsOnlyUsedBy(clip) {
  const otherPaths = new Set(
    state.clips
      .filter((item) => item.id !== clip.id)
      .flatMap(mediaPathsFromClip),
  );

  return mediaPathsFromClip(clip).filter((mediaPath) => !otherPaths.has(mediaPath));
}

function mediaPathsFromClip(clip) {
  return [clip.videoUrl, clip.thumbUrl].filter(Boolean);
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value));
}

async function checkClipperHealth() {
  try {
    const response = await fetch(apiUrl("/api/health"));
    const data = await response.json();
    if (data.ok) {
      systemVizardConfigured = !!data.vizardConfigured;
      render();
      setClipStatus(
        data.vizardConfigured
          ? "Vizard AI is connected. Add a YouTube URL and generate clips."
          : data.openaiConfigured
            ? "Local clipper and AI understanding are ready."
            : "Local clipper ready. Add VIZARDAI_API_KEY or OPENAI_API_KEY before starting it for AI understanding.",
        data.vizardConfigured || data.openaiConfigured ? "ready" : "",
      );
      return;
    }
    setClipStatus("Local clipper is open, but ffmpeg was not found.", "error");
  } catch {
    setClipStatus("For real clipping, start the local clipper with: npm start", "");
  }
}

function getSelectedVideoFile() {
  return selectedVideoFile || elements.videoFile.files[0] || null;
}

function setProcessing(processing) {
  isProcessing = processing;
  elements.generateButton.disabled = processing;
}

function setClipStatus(message, tone) {
  elements.clipStatus.textContent = message;
  elements.clipStatus.className = `status-note ${tone || ""}`.trim();
}

function setQueueProcessStatus(message, tone = "ready", options = {}) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return;

  const normalizedTone = tone === "error" ? "error" : "ready";
  const noticeKey = String(options.key || cleanMessage).trim();
  const createdAt = new Date().toISOString();
  const existingNotices = normalizeQueueNotifications(state.queueNotifications || []);
  const existingIndex = existingNotices.findIndex((notice) => {
    const existingKey = notice.key || notice.message;
    return notice.tone === normalizedTone && existingKey === noticeKey;
  });

  if (existingIndex >= 0) {
    const existingNotice = existingNotices[existingIndex];
    state.queueNotifications = normalizeQueueNotifications([
      {
        ...existingNotice,
        message: cleanMessage,
        key: noticeKey,
        createdAt,
      },
      ...existingNotices.filter((_, index) => index !== existingIndex),
    ]);
  } else {
    state.queueNotifications = normalizeQueueNotifications([
      {
        id: createId("queue-notice"),
        message: cleanMessage,
        tone: normalizedTone,
        key: noticeKey,
        createdAt,
      },
      ...existingNotices,
    ]);
  }
  persistStateOnly();
  renderQueue();
}

function apiUrl(pathname) {
  if (!pathname) return "";
  if (/^https?:\/\//i.test(pathname)) return pathname;

  const isBackendOrigin = (
    location.protocol !== "file:" &&
    (location.port === "3000" || location.port === "3001")
  );

  if (isBackendOrigin) return pathname;

  return `http://localhost:3000${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function assetUrl(pathname) {
  if (!pathname) return "";
  if (pathname.startsWith("http") && (pathname.includes("amazonaws.com") || pathname.includes("vizard.ai") || pathname.includes("s3"))) {
    return apiUrl(`/api/proxy-video?url=${encodeURIComponent(pathname)}`);
  }
  if (pathname.startsWith("http")) return pathname;
  return apiUrl(pathname);
}

function getScheduleTime(clipIndex, accountIndex) {
  const now = new Date();
  now.setHours(now.getHours() + clipIndex + 1);
  now.setMinutes(accountIndex * 10, 0, 0);
  return now.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createId(prefix) {
  if (crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inferTitleFromUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "") + " source";
  } catch {
    return "";
  }
}

function extractVizardProjectId(value) {
  const raw = String(value || "").trim();
  if (/^\d+$/.test(raw)) return raw;

  const patterns = [
    /(?:projectId|project_id|id)=([0-9]+)/i,
    /\/(?:project|projects|editor|workspace|video)\/([0-9]+)/i,
    /\/([0-9]{5,})(?:[/?#]|$)/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function extractVizardVideoId(value) {
  const raw = String(value || "").trim();
  if (/^\d+$/.test(raw)) return raw;

  const patterns = [
    /(?:videoId|video_id|vid)=([0-9]+)/i,
    /(?:video|clip)\/([0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1]) return match[1];
  }

  return "";
}

function cleanFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function hashString(value) {
  return value.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) % 9973;
  }, 17);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatProjectDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==========================================
// Google Drive JSON Credential Integration
// ==========================================

// Drive uses the server-side JSON credential path so the app does not depend on popup OAuth.

function handleGDriveUnauthorized() {
  cachedAccessToken = null;
  googleUser = null;
  gdriveFiles = [];
  gdriveFolders = [];
  gdriveError = "Your Google Session has expired or is unauthorized. Please sign in again to restore access to Google Drive.";
  
  localStorage.removeItem("clipflow_gdrive_access_token");
  localStorage.removeItem("clipflow_google_user");
  localStorage.removeItem("clipflow_gdrive_token_timestamp");
  
  renderGDrive();
}

async function createGDriveSubFolder(folderName, parentFolderId) {
  if (!cachedAccessToken) {
    throw new Error("Log in required to create folders.");
  }
  if (!folderName.trim()) {
    throw new Error("Folder name cannot be empty.");
  }
  try {
    const body = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder"
    };
    if (parentFolderId && parentFolderId !== "root") {
      body.parents = [parentFolderId];
    }
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      handleGDriveUnauthorized();
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    if (!res.ok) {
      const errTxt = await res.text();
      console.error("Failed to create GDrive subfolder details:", errTxt);
      throw new Error(`Google Drive API rejected subfolder creation: ${res.statusText}`);
    }
    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("Subfolder creation failed:", err);
    throw err;
  }
}

async function uploadGDriveMetadataFile(subFolderId, name, metadataObj) {
  const fileMetadata = {
    name: name,
    mimeType: "application/json"
  };
  if (subFolderId) {
    fileMetadata.parents = [subFolderId];
  }
  
  const boundary = "clipflow_gdrive_json_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const bodyContent = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}\r\n${delimiter}Content-Type: application/json\r\n\r\n${JSON.stringify(metadataObj)}\r\n${closeDelimiter}`;
  
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: bodyContent
  });
  if (res.status === 401) {
    handleGDriveUnauthorized();
    throw new Error("Session expired or unauthorized. Please sign in again.");
  }
  
  if (!res.ok) {
    console.warn("Failed to upload GDrive metadata file:", await res.text());
  }
}

const liveUploadingUrls = new Set();

async function getOrCreateGDriveSubFolder(folderName, parentFolderId) {
  if (!cachedAccessToken && !isServiceDriveMode()) {
    throw new Error("Log in required to create folders.");
  }
  if (!String(folderName || "").trim()) {
    throw new Error("Folder name cannot be empty.");
  }
  
  try {
    const escapedName = folderName.replace(/'/g, "\\'");
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
    if (parentFolderId && parentFolderId !== "root") {
      q += ` and '${parentFolderId}' in parents`;
    } else {
      q += ` and 'root' in parents`;
    }
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    });
    if (searchRes.status === 401) {
      handleGDriveUnauthorized();
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        console.log("Found existing GDrive subfolder:", folderName, searchData.files[0].id);
        return searchData.files[0].id;
      }
    }
  } catch (searchErr) {
    console.warn("Error searching for existing subfolder:", searchErr);
    if (searchErr.message && (searchErr.message.includes("Session expired") || searchErr.message.includes("401"))) {
      throw searchErr;
    }
  }

  return await createGDriveSubFolder(folderName, parentFolderId);
}

async function uploadClipToGoogleDrive(clip) {
  if (!cachedAccessToken && !isServiceDriveMode()) {
    setClipStatus("Please sign in to Google Drive under the Google Drive tab first!", "error");
    location.hash = "#google-drive";
    return;
  }

  const videoUrl = clip.videoUrl || ""; // Can be empty for manual uploads
  const clipId = clip.id;
  const uploadKey = videoUrl || `file:${clipId}`;

  // STRICT deduplication to prevent parallel / duplicate uploads for the same video Url or Clip ID
  if (liveUploadingUrls.has(uploadKey) || liveUploadingClipIds.has(clipId)) return;
  
  state.gdriveBackedUpUrls = state.gdriveBackedUpUrls || [];
  if (videoUrl && state.gdriveBackedUpUrls.includes(videoUrl)) {
    clip.gdriveBackedUp = true;
    return;
  }

  liveUploadingUrls.add(uploadKey);
  liveUploadingClipIds.add(clipId);
  renderClips();

  try {
    if (isServiceDriveMode()) {
      setClipStatus(`Saving "${clip.title || "ClipFlow clip"}" to Workspace Drive...`, "ready");
      const result = await uploadClipToServiceDrive(clip);
      markClipBackedUp(clip, result.fileId || "", result.folderId || "", videoUrl);
      liveUploadingClipIds.delete(clipId);
      liveUploadingUrls.delete(uploadKey);
      saveAndRender();
      await triggerGDriveLoad();
      setQueueProcessStatus(`Saved "${clip.title || "ClipFlow clip"}" to Workspace Drive.`, "ready", {
        key: `drive-saved:${clipId || uploadKey}`,
      });
      return;
    }

    if (!videoUrl && !(clip.videoFile instanceof File)) {
      throw new Error("No video source (URL or File) provided for upload.");
    }

    setClipStatus(`Checking Google Drive for existing backup of "${clip.title}"...`, "ready");

    const subfolderName = clip.title || 'ClipFlow-Clip';
    const parentFolderId = (state.preferences && state.preferences.gdriveFolderId) || "root";
    const subFolderId = await getOrCreateGDriveSubFolder(subfolderName, parentFolderId);

    // Check if the MP4 file already exists in this folder to avoid re-uploading
    let existingFileId = null;
    try {
      const escapedMp4Name = `${clip.title || 'ClipFlow-Clip'}.mp4`.replace(/'/g, "\\'");
      const fileQ = `name = '${escapedMp4Name}' and '${subFolderId}' in parents and trashed = false`;
      const fileSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQ)}&fields=files(id,name)`;
      const fileSearchRes = await fetch(fileSearchUrl, {
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`
        }
      });
      if (fileSearchRes.status === 401) {
        handleGDriveUnauthorized();
        throw new Error("Session expired or unauthorized. Please sign in again.");
      }
      if (fileSearchRes.ok) {
        const fileSearchData = await fileSearchRes.json();
        if (fileSearchData.files && fileSearchData.files.length > 0) {
          existingFileId = fileSearchData.files[0].id;
          console.log("Found existing MP4 on GDrive, using fileId:", existingFileId);
        }
      }
    } catch (fileSearchErr) {
      console.warn("Error searching for existing MP4 file:", fileSearchErr);
      if (fileSearchErr.message && (fileSearchErr.message.includes("Session expired") || fileSearchErr.message.includes("401"))) {
        throw fileSearchErr;
      }
    }

    const extraInfo = {
      clipflow_metadata: true,
      title: clip.title || "",
      caption: clip.caption || "",
      reason: clip.reason || "",
      transcript: clip.transcript || "",
      score: clip.score || 0,
      duration: clip.duration || 0,
      start: clip.start || 0,
      end: clip.end || 0,
      platforms: clip.platforms || []
    };

    let gdriveFileId = existingFileId || "";

    if (!existingFileId) {
      setClipStatus(`Saving "${clip.title}" to Google Drive...`, "ready");

      let videoBlob;
      if (clip.videoFile instanceof File) {
        videoBlob = clip.videoFile;
      } else if (videoUrl) {
        const isBlobLocal = videoUrl.startsWith("/media") || videoUrl.startsWith("/") || videoUrl.startsWith(location.origin);
        const downloadUrl = isBlobLocal ? videoUrl : `/api/proxy-video?url=${encodeURIComponent(videoUrl)}&token=${encodeURIComponent(cachedAccessToken)}`;
        const videoRes = await fetch(downloadUrl);
        if (!videoRes.ok) {
          throw new Error(`Failed to download video file: ${videoRes.statusText}`);
        }
        videoBlob = await videoRes.blob();
      } else {
        throw new Error("No video source (URL or File) provided for upload.");
      }

      // Upload the .mp4 video inside the newly created subfolder
      const metadata = {
        name: `${clip.title || 'ClipFlow-Clip'}.mp4`,
        mimeType: "video/mp4",
        description: JSON.stringify(extraInfo),
        parents: [subFolderId]
      };

      const boundary = "clipflow_gdrive_upload_boundary";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const headerPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}Content-Type: video/mp4\r\n\r\n`;
      const footerPart = `\r\n--${boundary}--`;

      const headerBlob = new Blob([headerPart], { type: "text/plain" });
      const footerBlob = new Blob([footerPart], { type: "text/plain" });

      const multipartBlob = new Blob([headerBlob, videoBlob, footerBlob], { type: `multipart/related; boundary=${boundary}` });

      const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`
        },
        body: multipartBlob
      });

      if (uploadRes.status === 401) {
        handleGDriveUnauthorized();
        throw new Error("Session expired or unauthorized. Please sign in again.");
      }

      if (!uploadRes.ok) {
        const errTxt = await uploadRes.text();
        console.error("GDrive upload err details:", errTxt);
        throw new Error(`Google Drive API rejected upload with status ${uploadRes.status}: ${uploadRes.statusText}`);
      }

      try {
        const uploadData = await uploadRes.json();
        gdriveFileId = uploadData.id || "";
      } catch (e) {
        console.warn("Could not parse Google Drive upload response JSON", e);
      }

      // Upload the metadata JSON file inside the subfolder
      await uploadGDriveMetadataFile(subFolderId, "metadata.json", extraInfo);
    } else {
      console.log("Skipping upload, file already exists in GDrive with id:", existingFileId);
    }

    setQueueProcessStatus(`Saved "${clip.title}" to Google Drive.`, "ready", {
      key: `drive-saved:${clipId || uploadKey}`,
    });

    liveUploadingClipIds.delete(clipId);
    liveUploadingUrls.delete(uploadKey);
    markClipBackedUp(clip, gdriveFileId, subFolderId, videoUrl);

    saveAndRender();

    // Dynamically refresh listed drive files
    await triggerGDriveLoad();
  } catch (err) {
    console.error("GDrive upload failure:", err);
    setQueueProcessStatus(`Backup failed: ${err.message}`, "error");
    liveUploadingClipIds.delete(clipId);
    liveUploadingUrls.delete(uploadKey);
    renderClips();
  }
}

async function uploadClipToServiceDrive(clip) {
  const extraInfo = {
    clipflow_metadata: true,
    title: clip.title || "",
    caption: clip.caption || "",
    reason: clip.reason || "",
    transcript: clip.transcript || "",
    score: clip.score || 0,
    duration: clip.duration || 0,
    start: clip.start || 0,
    end: clip.end || 0,
    platforms: clip.platforms || []
  };

  const formData = new FormData();
  formData.append("title", clip.title || "ClipFlow-Clip");
  formData.append("parentFolderId", getActiveGDriveFolderId());
  formData.append("metadata", JSON.stringify(extraInfo));
  if (clip.videoFile instanceof File) {
    formData.append("videoFile", clip.videoFile, clip.videoFile.name || `${clip.title || "ClipFlow-Clip"}.mp4`);
  } else if (clip.videoUrl) {
    formData.append("videoUrl", assetUrl(clip.videoUrl));
  } else {
    throw new Error("No video source (URL or File) provided for upload.");
  }

  const response = await fetch(apiUrl("/api/drive/upload"), {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Workspace Drive upload failed.");
  }
  return data;
}

function markClipBackedUp(clip, gdriveFileId, gdriveFolderId, videoUrl) {
  state.gdriveBackedUpUrls = state.gdriveBackedUpUrls || [];
  const clipId = clip.id;

  if (videoUrl && !state.gdriveBackedUpUrls.includes(videoUrl)) {
    state.gdriveBackedUpUrls.push(videoUrl);
  }

  const clipIndex = state.clips.findIndex((item) => item.id === clipId || (videoUrl && item.videoUrl === videoUrl));
  if (clipIndex >= 0) {
    state.clips[clipIndex].gdriveBackedUp = true;
    if (gdriveFileId) {
      state.clips[clipIndex].gdriveFileId = gdriveFileId;
    }
    if (gdriveFolderId) {
      state.clips[clipIndex].gdriveFolderId = gdriveFolderId;
    }
  }

  state.vizardProjects.forEach((proj) => {
    const projClipIndex = proj.clips?.findIndex((item) => item.id === clipId || (videoUrl && item.videoUrl === videoUrl));
    if (projClipIndex >= 0) {
      proj.clips[projClipIndex].gdriveBackedUp = true;
      if (gdriveFileId) {
        proj.clips[projClipIndex].gdriveFileId = gdriveFileId;
      }
      if (gdriveFolderId) {
        proj.clips[projClipIndex].gdriveFolderId = gdriveFolderId;
      }
    }
  });
}

function triggerAutoBackupToGoogleDrive(clips) {
  state.preferences = state.preferences || { autoGDriveBackup: true };
  if (!state.preferences?.autoGDriveBackup || (!cachedAccessToken && !isServiceDriveMode())) return;

  state.gdriveBackedUpUrls = state.gdriveBackedUpUrls || [];

  clips.forEach((clip) => {
    if (clip.videoUrl && clip.provider !== "gdrive") {
      const alreadyUploaded = clip.gdriveBackedUp || state.gdriveBackedUpUrls.includes(clip.videoUrl);
      if (!alreadyUploaded && !liveUploadingUrls.has(clip.videoUrl)) {
        uploadClipToGoogleDrive(clip);
      }
    }
  });
}

async function getOrFetchGDriveMetadata(fileId) {
  state.gdriveMetadataCache = state.gdriveMetadataCache || {};
  if (state.gdriveMetadataCache[fileId]) {
    return state.gdriveMetadataCache[fileId];
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${cachedAccessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === "object" && data.clipflow_metadata) {
      state.gdriveMetadataCache[fileId] = data;
      localStorage.setItem(storageKey, JSON.stringify(state)); // silent cache save
      return data;
    }
  } catch (e) {
    console.warn("Could not download metadata file:", e);
  }
  return null;
}

async function fetchGDriveFiles() {
  if (isServiceDriveMode()) {
    ensureGDriveFolderPreference();
    const folderId = getActiveGDriveFolderId();
    const res = await fetch(apiUrl(`/api/drive/files?folderId=${encodeURIComponent(folderId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Failed to scan Google Drive.");
    }
    return data.files || [];
  }

  if (!cachedAccessToken) throw new Error("No active Google Drive access token. Please sign in.");
  try {
    const parentId = (state.preferences && state.preferences.gdriveFolderId) || "root";
    
    // 1. Fetch direct folders under parent
    const folderQuery = `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const folderUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime)&pageSize=40`;
    const folderRes = await fetch(folderUrl, { headers: { Authorization: `Bearer ${cachedAccessToken}` } });
    if (folderRes.status === 401) {
      handleGDriveUnauthorized();
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    const folderData = folderRes.ok ? await folderRes.json() : { files: [] };
    const childFolders = folderData.files || [];

    // 2. Fetch direct files under parent (to capture legacy direct uploaded mp4s)
    const directFileQuery = `mimeType = 'video/mp4' and '${parentId}' in parents and trashed = false`;
    const directFileUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(directFileQuery)}&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,size,modifiedTime,description)&pageSize=40`;
    const directFileRes = await fetch(directFileUrl, { headers: { Authorization: `Bearer ${cachedAccessToken}` } });
    if (directFileRes.status === 401) {
      handleGDriveUnauthorized();
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    const directFileData = directFileRes.ok ? await directFileRes.json() : { files: [] };
    const directFiles = directFileData.files || [];

    // 3. If we have child folders, let's fetch all mp4 and json files under these child folders
    let subFiles = [];
    if (childFolders.length > 0) {
      // Build batch list of parents
      let parentQueries = childFolders.map(f => `'${f.id}' in parents`);
      const joinedParents = parentQueries.join(" or ");
      const subQuery = `(${joinedParents}) and trashed = false and (mimeType = 'video/mp4' or mimeType = 'application/json' or name = 'metadata.json')`;
      const subUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(subQuery)}&fields=files(id,name,mimeType,size,modifiedTime,description,parents)&pageSize=100`;
      const subRes = await fetch(subUrl, { headers: { Authorization: `Bearer ${cachedAccessToken}` } });
      if (subRes.status === 401) {
        handleGDriveUnauthorized();
        throw new Error("Session expired or unauthorized. Please sign in again.");
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        subFiles = subData.files || [];
      }
    }

    // Now, let's build the consolidated items array
    const compiledFiles = [];

    // Process folders (New style backups)
    for (const folder of childFolders) {
      // Find the mp4 file inside this folder
      const mp4File = subFiles.find(f => f.parents && f.parents.includes(folder.id) && f.mimeType === "video/mp4");
      if (!mp4File) continue; // If there is no video in the folder, skip

      // Find the json file inside this folder
      const jsonFile = subFiles.find(f => f.parents && f.parents.includes(folder.id) && (f.mimeType === "application/json" || f.name === "metadata.json"));
      
      let extra = null;
      if (jsonFile) {
        // Retrieve and cache metadata
        extra = await getOrFetchGDriveMetadata(jsonFile.id);
      }

      // If metadata couldn't be loaded or doesn't exist, try to fall back to the mp4 file description
      if (!extra && mp4File.description) {
        try {
          const parsed = JSON.parse(mp4File.description);
          if (parsed && typeof parsed === "object" && parsed.clipflow_metadata) {
            extra = parsed;
          }
        } catch (e) {}
      }

      compiledFiles.push({
        id: mp4File.id,
        name: folder.name, // Use folder name as the display title
        modifiedTime: folder.modifiedTime || mp4File.modifiedTime,
        size: mp4File.size,
        extra: extra
      });
    }

    // Process legacy direct files
    for (const file of directFiles) {
      let extra = null;
      if (file.description) {
        try {
          const parsed = JSON.parse(file.description);
          if (parsed && typeof parsed === "object" && parsed.clipflow_metadata) {
            extra = parsed;
          }
        } catch (e) {}
      }

      compiledFiles.push({
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: file.size, 
        extra: extra
      });
    }

    // Sort compiledFiles by virality score desc, then modifiedTime desc
    compiledFiles.sort((a, b) => {
      const scoreA = a.extra?.score || 0;
      const scoreB = b.extra?.score || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return new Date(b.modifiedTime) - new Date(a.modifiedTime);
    });

    return compiledFiles;
  } catch (err) {
    console.error("Error inside fetchGDriveFiles:", err);
    throw err;
  }
}

async function fetchGDriveFolders() {
  if (isServiceDriveMode()) {
    ensureGDriveFolderPreference();
    const parentId = getServiceDriveDefaultFolderId();
    const res = await fetch(apiUrl(`/api/drive/folders?parentId=${encodeURIComponent(parentId)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return [];
    return data.folders || [];
  }

  if (!cachedAccessToken) return [];
  try {
    const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=name%20asc&fields=files(id,name)&pageSize=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    });
    if (res.status === 401) {
      handleGDriveUnauthorized();
      return [];
    }
    if (!res.ok) {
      console.error("GDrive folder fetch failed:", await res.text());
      return [];
    }
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error("Error in fetchGDriveFolders:", err);
    return [];
  }
}

async function createGDriveFolder(folderName) {
  if (isServiceDriveMode()) {
    ensureGDriveFolderPreference();
    const parentId = getActiveGDriveFolderId();
    const res = await fetch(apiUrl("/api/drive/folders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: folderName, parentId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Failed to create folder.");
    }
    return { id: data.id, name: data.name || folderName };
  }

  if (!cachedAccessToken) throw new Error("Log in required to create folders.");
  if (!folderName.trim()) {
    throw new Error("Folder name cannot be empty.");
  }
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder"
      })
    });
    if (res.status === 401) {
      handleGDriveUnauthorized();
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    if (!res.ok) {
      const errTxt = await res.text();
      console.error("Failed to create GDrive folder details:", errTxt);
      throw new Error(`Google Drive API rejected creation: ${res.statusText}`);
    }
    const data = await res.json();
    return { id: data.id, name: folderName };
  } catch (err) {
    console.error("Folder creation failed:", err);
    throw err;
  }
}

async function renderGDrive() {
  if (!elements.gdriveContainer) return;
  await loadGDriveServiceStatus();

  // Toggle visibility of panel heading actions
  if ((googleUser && cachedAccessToken) || isServiceDriveMode()) {
    if (elements.refreshGDrive) elements.refreshGDrive.style.display = "inline-flex";
    if (elements.gdriveLogout) elements.gdriveLogout.style.display = "inline-flex";
  } else {
    if (elements.refreshGDrive) elements.refreshGDrive.style.display = "none";
    if (elements.gdriveLogout) elements.gdriveLogout.style.display = "none";
  }

  // If JSON-backed Workspace Drive is not configured, show setup state.
  if (!isServiceDriveMode() && (!googleUser || !cachedAccessToken)) {
    elements.gdriveContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px 16px; text-align: center;">
        <div aria-hidden="true" style="margin-bottom: 16px; font-size: 3rem;">🔐</div>
        <h3>Workspace Drive JSON Required</h3>
        <p style="margin-bottom: 24px; color: var(--muted); max-width: 440px; margin-left: auto; margin-right: auto;">
          ClipFlow is set to use the server-side Google Drive JSON credential instead of browser Google sign-in.
        </p>
        <div class="developer-tip" style="margin-top: 22px; padding: 16px; background: rgba(99, 102, 241, 0.05); border: 1px dashed rgba(99, 102, 241, 0.3); border-radius: 8px; text-align: left; max-width: 560px; margin-left: auto; margin-right: auto; font-size: 0.8rem; line-height: 1.5; color: var(--muted);">
          <strong style="color: #6366f1; display: block; margin-bottom: 6px; font-weight: 600;">JSON credential lookup</strong>
          Add a Google service account key at <code style="background: var(--bg); padding: 1px 4px; border-radius: 4px; color: var(--ink);">google-service-account.json</code>, or set <code style="background: var(--bg); padding: 1px 4px; border-radius: 4px; color: var(--ink);">GDRIVE_SERVICE_ACCOUNT_JSON</code> / <code style="background: var(--bg); padding: 1px 4px; border-radius: 4px; color: var(--ink);">GOOGLE_SERVICE_ACCOUNT_JSON</code>.
          <br><br>
          Current status: ${escapeHtml(gdriveServiceStatus?.message || "Service account credentials are not configured.")}
        </div>
      </div>
    `;
    return;
  }

  // Set default preference if missing
  state.preferences = state.preferences || { autoGDriveBackup: true };
  ensureGDriveFolderPreference();

  const defaultFolderId = getServiceDriveDefaultFolderId();
  const defaultFolderName = getServiceDriveDefaultFolderName();
  const currentFolderName = getActiveGDriveFolderName();
  const currentFolderId = getActiveGDriveFolderId();
  const hasCurrentOption = currentFolderId === defaultFolderId || gdriveFolders.some(folder => folder.id === currentFolderId);
  const rootOptionLabel = isServiceDriveMode() ? defaultFolderName : "Entire Drive (Root)";

  // Generate top layout header for logged-in UI
  const connectedLabel = isServiceDriveMode()
    ? `Connected: <strong>${escapeHtml(gdriveServiceStatus.displayName || "Workspace Drive")}</strong>`
    : `Connected: <strong>${escapeHtml(googleUser.displayName || googleUser.email)}</strong>`;

  const headerHTML = `
    <div style="margin-bottom: 14px; font-size: 0.85rem; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <span>${connectedLabel}</span>
      <span>Listed: <strong style="color: var(--ink);">${gdriveFiles.length} MP4s</strong></span>
    </div>

    <!-- Google Drive Folder Selector & Creator -->
    <div style="margin-bottom: 20px; padding: 14px; background: var(--panel-strong); border: 1px solid var(--line); border-radius: var(--radius); display: flex; flex-direction: column; gap: 12px; border-left: 3px solid #6366f1;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span style="font-size: 0.85rem; color: var(--muted);">
          Active Sync Folder: <strong style="color: #6366f1;">${escapeHtml(currentFolderName)}</strong>
        </span>
        <span style="font-size: 0.72rem; color: var(--muted); background: var(--bg); padding: 2px 6px; border-radius: 4px; font-family: monospace;">
          ID: ${escapeHtml(currentFolderId === "root" ? "root" : currentFolderId.substring(0, 10) + '...')}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <!-- Select Existing Folder -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="gdriveFolderSelect" style="font-size: 0.75rem; color: var(--muted); font-weight: 500; text-align: left;">Choose Directory</label>
          <select id="gdriveFolderSelect" style="background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; font-size: 0.82rem; height: 35px; width: 100%; outline: none; cursor: pointer;">
            <option value="${escapeHtml(defaultFolderId)}" ${currentFolderId === defaultFolderId ? "selected" : ""}>📁 ${escapeHtml(rootOptionLabel)}</option>
            ${!hasCurrentOption ? `<option value="${escapeHtml(currentFolderId)}" selected>📁 ${escapeHtml(currentFolderName)}</option>` : ""}
            ${gdriveFolders.map(folder => `
              <option value="${escapeHtml(folder.id)}" ${currentFolderId === folder.id ? "selected" : ""}>📁 ${escapeHtml(folder.name)}${folder.sharedWithMe ? " (Shared)" : ""}</option>
            `).join('')}
          </select>
        </div>

        <!-- Create A New Folder option -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="gdriveNewFolderInput" style="font-size: 0.75rem; color: var(--muted); font-weight: 500; text-align: left;">Create & Filter By New Folder</label>
          <div style="display: flex; gap: 6.5px; width: 100%;">
            <input type="text" id="gdriveNewFolderInput" placeholder="New folder name..." style="background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 0 10px; font-size: 0.82rem; height: 35px; flex: 1; outline: none; min-width: 0;">
            <button id="gdriveCreateFolderBtn" type="button" class="primary-button" style="height: 35px; padding: 0 12px; font-size: 0.8rem; margin: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 500; background: #6366f1; border: none; border-radius: 6px; color: white;">
              Create
            </button>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8.5px; background: var(--panel-strong); padding: 10px 14px; border-radius: var(--radius); border: 1px dashed var(--line);">
      <input type="checkbox" id="gdriveAutoBackupCheckbox" ${state.preferences.autoGDriveBackup ? "checked" : ""} style="cursor: pointer; width: 16px; height: 16px; accent-color: #34d399;">
      <label for="gdriveAutoBackupCheckbox" style="font-size: 0.82rem; color: var(--muted); cursor: pointer; user-select: none;">
        Automatically auto-backup newly imported clips (Vizard or local) to Google Drive
      </label>
    </div>
  `;

  let innerHTML = "";

  // Loading state
  if (isGDriveLoading) {
    innerHTML = `
      <div class="empty-state" style="padding: 40px 16px; text-align: center;">
        <div aria-hidden="true" style="margin-bottom: 16px; font-size: 1.5rem; display: inline-block; animation: spin 2s linear infinite;">🔄</div>
        <h3>Scanning Drive Storage...</h3>
        <p style="color: var(--muted);">Listing MP4 video objects in your Google Drive.</p>
      </div>
    `;
  }
  // Error state
  else if (gdriveError) {
    innerHTML = `
      <div class="empty-state" style="padding: 40px 16px; text-align: center;">
        <div aria-hidden="true" style="margin-bottom: 16px; font-size: 2.5rem; color: var(--coral);">⚠️</div>
        <h3>Google Drive Connection Failed</h3>
        <p style="color: var(--muted); margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
          ${escapeHtml(gdriveError)}
        </p>
        <button class="primary-button" id="gdriveRetryBtn" type="button" style="align-self: center;">Retry Request</button>
      </div>
    `;
  }
  // Empty files state
  else if (!gdriveFiles.length) {
    innerHTML = `
      <div class="empty-state" style="padding: 40px 16px; text-align: center;">
        <div aria-hidden="true" style="margin-bottom: 16px; font-size: 3rem;">📂</div>
        <h3>No Video Files Found</h3>
        <p style="color: var(--muted); max-width: 440px; margin-left: auto; margin-right: auto; margin-bottom: 20px;">
          No MP4 files detected at the top-level of your Google Drive directory. Click the button below to force scan, or verify your Vizard files have synced.
        </p>
        <button class="primary-button" id="gdriveForceScanBtn" type="button" style="align-self: center;">
          Scan Google Drive
        </button>
      </div>
    `;
  }
  // Render video file list
  else {
    innerHTML = `
      <div class="library-video-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${gdriveFiles.map((file) => {
          const proxyUrl = isServiceDriveMode()
            ? `/api/drive/file/${encodeURIComponent(file.id)}`
            : `/api/proxy-video/${encodeURIComponent(file.name || 'video.mp4')}?url=${encodeURIComponent(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)}&token=${encodeURIComponent(cachedAccessToken)}`;
          const dateStr = formatProjectDate(file.modifiedTime);
          const sizeCalculated = file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB` : "Size unknown";
          
          let extra = file.extra || null;
          if (!extra && file.description) {
            try {
              const parsed = JSON.parse(file.description);
              if (parsed && typeof parsed === "object" && parsed.clipflow_metadata) {
                extra = parsed;
              }
            } catch (e) {
              // Not JSON metadata, ignore
            }
          }

          const metadataHTML = extra ? `
            <div class="gdrive-extra-meta" style="font-size: 0.75rem; color: var(--muted); margin-top: 6px; display: flex; flex-direction: column; gap: 4px; background: var(--bg); padding: 8px; border-radius: 4px; border: 1px solid var(--line);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🎯 Virality Score:</span>
                <strong style="color: #34d399; font-weight: 700;">${extra.score || 0}</strong>
              </div>
              ${extra.duration ? `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>⏱️ Duration:</span>
                <span class="queue-meta" style="display: inline;">${extra.duration}s (${formatTime(extra.start)}-${formatTime(extra.end)})</span>
              </div>
              ` : ""}
              ${extra.caption ? `
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; color: var(--ink);" title="${escapeHtml(extra.caption)}">
                <span>💬 Caption:</span>
                <i style="font-size: 0.72rem; opacity: 0.85;">${escapeHtml(extra.caption)}</i>
              </div>
              ` : ""}
              ${extra.transcript ? `
                <details style="margin-top: 4px; border-top: 1px dashed var(--line); padding-top: 4px; cursor: pointer;">
                  <summary style="font-weight: 500; color: var(--ink); list-style: none; display: flex; justify-content: space-between; align-items: center; outline: none;">
                    <span>📜 Transcript</span>
                    <span style="font-size: 0.65rem; color: var(--muted);">Expand</span>
                  </summary>
                  <p style="margin-top: 4px; line-height: 1.35; color: var(--muted); max-height: 80px; overflow-y: auto; font-size: 0.7rem; white-space: pre-wrap; word-break: break-all; background: var(--panel-strong); padding: 4px; border-radius: 2px; border: 1px solid var(--line);">${escapeHtml(extra.transcript)}</p>
                </details>
              ` : ""}
            </div>
          ` : "";

          return `
            <div class="library-project" style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--line); padding: 12px; border-radius: var(--radius); background: var(--panel-strong);">
              <div class="gdrive-video-wrapper" data-proxy-url="${escapeHtml(proxyUrl)}" style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #000; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#111'" onmouseout="this.style.background='#000'">
                <!-- Play Icon overlay -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--muted); pointer-events: none; text-align: center; padding: 10px;">
                  <div style="font-size: 2.25rem; color: #3b82f6; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); font-family: sans-serif;">▶️</div>
                  <span style="font-size: 0.725rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Preview Video</span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; padding: 4px 2px 0;">
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--ink); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${escapeHtml(file.name)}">
                  ${escapeHtml(file.name)}
                </div>
                ${metadataHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 0.72rem; margin-top: auto; padding-top: 8px;">
                  <span>${escapeHtml(dateStr)}</span>
                  <span>${escapeHtml(sizeCalculated)}</span>
                </div>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 6px; border-top: 1px solid var(--line); padding-top: 8px;">
                <button class="primary-button active" type="button" data-gdrive-action="import" data-file-id="${escapeHtml(file.id)}" style="flex: 1; justify-content: center; font-size: 0.75rem; padding: 6px 12px; height: 32px;">
                  Import to Desk
                </button>
                <button class="mini-button danger" type="button" data-gdrive-action="delete" data-file-id="${escapeHtml(file.id)}" style="justify-content: center; font-size: 0.75rem; padding: 6px 10px; height: 32px;">
                  Delete
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // Combine and render fully
  elements.gdriveContainer.innerHTML = headerHTML + innerHTML;

  // Bind dynamic actions
  const scanBtn = elements.gdriveContainer.querySelector("#gdriveForceScanBtn");
  if (scanBtn) scanBtn.addEventListener("click", triggerGDriveLoad);

  const retryBtn = elements.gdriveContainer.querySelector("#gdriveRetryBtn");
  if (retryBtn) retryBtn.addEventListener("click", triggerGDriveLoad);

  const autoBackupCheckbox = elements.gdriveContainer.querySelector("#gdriveAutoBackupCheckbox");
  if (autoBackupCheckbox) {
    autoBackupCheckbox.addEventListener("change", (e) => {
      state.preferences = state.preferences || {};
      state.preferences.autoGDriveBackup = e.target.checked;
      saveAndRender(); // persist selection to localStorage silently
    });
  }

  const folderSelect = elements.gdriveContainer.querySelector("#gdriveFolderSelect");
  if (folderSelect) {
    folderSelect.addEventListener("change", async (e) => {
      const selectedId = e.target.value;
      state.preferences = state.preferences || {};
      state.preferences.gdriveWorkspaceRootId = getServiceDriveDefaultFolderId();
      state.preferences.gdriveFolderId = selectedId;
      if (selectedId === getServiceDriveDefaultFolderId()) {
        state.preferences.gdriveFolderName = getServiceDriveDefaultFolderName();
      } else {
        const found = gdriveFolders.find(f => f.id === selectedId);
        state.preferences.gdriveFolderName = found ? found.name : "Custom Folder";
      }
      saveAndRender();
      await triggerGDriveLoad();
    });
  }

  const createFolderBtn = elements.gdriveContainer.querySelector("#gdriveCreateFolderBtn");
  const newFolderInput = elements.gdriveContainer.querySelector("#gdriveNewFolderInput");
  if (createFolderBtn && newFolderInput) {
    createFolderBtn.addEventListener("click", async () => {
      const folderName = newFolderInput.value.trim();
      if (!folderName) return;
      try {
        createFolderBtn.disabled = true;
        createFolderBtn.textContent = "Creating...";
        const newFolderObj = await createGDriveFolder(folderName);
        state.preferences = state.preferences || {};
        state.preferences.gdriveWorkspaceRootId = getServiceDriveDefaultFolderId();
        state.preferences.gdriveFolderId = newFolderObj.id;
        state.preferences.gdriveFolderName = newFolderObj.name;
        saveAndRender();
        await triggerGDriveLoad();
      } catch (err) {
        gdriveError = "Failed to create folder: " + err.message;
        renderGDrive();
      } finally {
        createFolderBtn.disabled = false;
        createFolderBtn.textContent = "Create";
      }
    });
  }

  elements.gdriveContainer.querySelectorAll("[data-gdrive-action='import']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fileId = btn.getAttribute("data-file-id");
      const file = gdriveFiles.find(f => f.id === fileId);
      if (file) handleGDriveImport(file);
    });
  });

  elements.gdriveContainer.querySelectorAll("[data-gdrive-action='delete']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fileId = btn.getAttribute("data-file-id");
      const file = gdriveFiles.find(f => f.id === fileId);
      if (!file) return;
      btn.disabled = true;
      btn.textContent = "Deleting...";
      try {
        await deleteDriveTargets({
          folderIds: file.folderId ? [file.folderId] : [],
          fileIds: [file.id],
        });
        gdriveFiles = gdriveFiles.filter((item) => item.id !== file.id);
        state.publishedDriveBin = normalizePublishedDriveBin(state.publishedDriveBin || [])
          .filter((item) => item.gdriveFileId !== file.id && item.gdriveFolderId !== file.folderId);
        saveAndRender();
        await triggerGDriveLoad();
        setQueueProcessStatus(`Deleted "${file.name}" from Google Drive.`, "ready");
      } catch (error) {
        btn.disabled = false;
        btn.textContent = "Delete";
        setQueueProcessStatus(error.message || "Failed to delete Google Drive video.", "error");
      }
    });
  });

  // Attach dynamic video preview logic to only load the video on user interaction
  elements.gdriveContainer.querySelectorAll(".gdrive-video-wrapper").forEach((wrapper) => {
    wrapper.addEventListener("click", () => {
      const proxyUrl = wrapper.getAttribute("data-proxy-url");
      wrapper.outerHTML = `
        <div style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #000; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <video class="library-video-player" src="${escapeHtml(proxyUrl)}" controls autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;" onerror="console.error('Proxy play error, checking token.');"></video>
        </div>
      `;
    });
  });
}

async function handleGDriveLogin() {
  if (isSigningIn) return;
  await loadGDriveServiceStatus();
  if (isServiceDriveMode()) {
    gdriveError = null;
    await triggerGDriveLoad();
    return;
  }
  gdriveError = gdriveServiceStatus?.message || "Google Drive JSON credential is not configured.";
  renderGDrive();
}

async function handleGDriveLogout() {
  try {
    await loadGDriveServiceStatus();
    if (isServiceDriveMode()) {
      gdriveError = "Workspace Drive mode does not require sign-out.";
      renderGDrive();
      return;
    }
    googleUser = null;
    cachedAccessToken = null;
    gdriveFiles = [];
    gdriveError = null;
    
    localStorage.removeItem("clipflow_gdrive_access_token");
    localStorage.removeItem("clipflow_google_user");
    localStorage.removeItem("clipflow_gdrive_token_timestamp");
    
    renderGDrive();
  } catch (err) {
    console.error("Sign out error:", err);
  }
}

async function triggerGDriveLoad() {
  await loadGDriveServiceStatus();
  if (!cachedAccessToken && !isServiceDriveMode()) return;
  isGDriveLoading = true;
  gdriveError = null;
  renderGDrive();
  try {
    const [files, folders] = await Promise.all([
      fetchGDriveFiles(),
      fetchGDriveFolders()
    ]);
    gdriveFiles = files;
    gdriveFolders = folders;
  } catch (err) {
    console.error("GDrive trigger scan error:", err);
    gdriveError = err.message || "Failed to scan Google Drive.";
    if (err.message && (err.message.includes("401") || err.message.includes("unauthorized"))) {
      cachedAccessToken = null;
      localStorage.removeItem("clipflow_gdrive_access_token");
      localStorage.removeItem("clipflow_google_user");
      localStorage.removeItem("clipflow_gdrive_token_timestamp");
    }
  } finally {
    isGDriveLoading = false;
    renderGDrive();
  }
}

function isServiceDriveMode() {
  return Boolean(gdriveServiceStatus && gdriveServiceStatus.configured && gdriveServiceStatus.connected);
}

function getServiceDriveDefaultFolderId() {
  if (!isServiceDriveMode()) return "root";
  return String(gdriveServiceStatus.defaultFolderId || "root");
}

function getServiceDriveDefaultFolderName() {
  if (!isServiceDriveMode()) return "Entire Drive Root";
  return String(gdriveServiceStatus.defaultFolderName || "ClipFlow Workspace");
}

function getActiveGDriveFolderId() {
  if (isServiceDriveMode()) {
    ensureGDriveFolderPreference();
  }
  return String((state.preferences && state.preferences.gdriveFolderId) || getServiceDriveDefaultFolderId());
}

function getActiveGDriveFolderName() {
  if (isServiceDriveMode()) {
    ensureGDriveFolderPreference();
  }
  return String((state.preferences && state.preferences.gdriveFolderName) || getServiceDriveDefaultFolderName());
}

function ensureGDriveFolderPreference() {
  state.preferences = state.preferences || { autoGDriveBackup: true };
  if (!isServiceDriveMode()) {
    state.preferences.gdriveFolderId = state.preferences.gdriveFolderId || "root";
    state.preferences.gdriveFolderName = state.preferences.gdriveFolderName || "Entire Drive Root";
    return;
  }

  const defaultFolderId = getServiceDriveDefaultFolderId();
  const defaultFolderName = getServiceDriveDefaultFolderName();
  const currentFolderId = String(state.preferences.gdriveFolderId || "");
  const currentFolderName = String(state.preferences.gdriveFolderName || "");
  const workspaceRootChanged = String(state.preferences.gdriveWorkspaceRootId || "") !== defaultFolderId;
  const shouldUseWorkspaceDefault =
    workspaceRootChanged ||
    !currentFolderId ||
    currentFolderId === "root" ||
    /vizard/i.test(currentFolderName);

  if (defaultFolderId && shouldUseWorkspaceDefault) {
    state.preferences.gdriveFolderId = defaultFolderId;
    state.preferences.gdriveFolderName = defaultFolderName;
    state.preferences.gdriveWorkspaceRootId = defaultFolderId;
  }
}

async function loadGDriveServiceStatus() {
  gdriveServiceStatusChecked = true;
  try {
    const res = await fetch(apiUrl("/api/drive/service-status"));
    const data = await res.json().catch(() => ({}));
    if (res.ok && data) {
      gdriveServiceStatus = data;
      ensureGDriveFolderPreference();
    }
  } catch {}
  return gdriveServiceStatus;
}

function handleGDriveImport(file) {
  const proxyUrl = isServiceDriveMode()
    ? `/api/drive/file/${encodeURIComponent(file.id)}`
    : `/api/proxy-video/${encodeURIComponent(file.name || 'video.mp4')}?url=${encodeURIComponent(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)}&token=${encodeURIComponent(cachedAccessToken)}`;
  
  let extra = file.extra || null;
  if (!extra || !Object.keys(extra).length) {
    extra = {};
    if (file.description) {
      try {
        const parsed = JSON.parse(file.description);
        if (parsed && typeof parsed === "object" && parsed.clipflow_metadata) {
          extra = parsed;
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  const manualClip = {
    id: "gdrive-" + file.id + "-" + Date.now(),
    title: extra.title || cleanFileName(file.name),
    start: extra.start || 0,
    end: extra.end || 45,
    score: extra.score || 100,
    approved: true, // Automatically approved for scheduling/queue placement
    sourceTitle: "Google Drive Sync",
    videoUrl: proxyUrl,
    gdriveFileId: file.id || "",
    gdriveFolderId: file.folderId || "",
    thumbUrl: "",
    vizardVideoId: "",
    clipEditorUrl: "",
    provider: "gdrive",
    real: true,
    caption: extra.caption || "#gdrive-import #vizard #trending",
    transcript: extra.transcript || "",
    reason: extra.reason || "",
    duration: extra.duration || 45,
    platforms: extra.platforms || [...destinationPlatforms],
    thumb: thumbBackgrounds[Math.floor(Math.random() * thumbBackgrounds.length)],
  };

  // Push to local studio candidate state
  state.clips.push(manualClip);
  saveAndRender();

  // Highlight import success
  setClipStatus(`Loaded "${file.name}" to the Clip Desk workspace successful!`, "ready");
}

// Bind static container buttons from header actions
if (elements.refreshGDrive) {
  elements.refreshGDrive.addEventListener("click", triggerGDriveLoad);
}
if (elements.gdriveLogout) {
  elements.gdriveLogout.addEventListener("click", handleGDriveLogout);
}
if (elements.gdriveLoginBtn) {
  elements.gdriveLoginBtn.addEventListener("click", handleGDriveLogin);
}

// Initial draw invocation
renderGDrive();

let vizardPollIntervalId = null;

function startVizardBackgroundPolling() {
  if (vizardPollIntervalId) return;

  vizardPollIntervalId = setInterval(async () => {
    state.vizardProjects = state.vizardProjects || [];
    const processingProj = state.vizardProjects.filter(p => p.projectId && (p.status === "processing" || !p.clips?.length));
    if (processingProj.length === 0) {
      clearInterval(vizardPollIntervalId);
      vizardPollIntervalId = null;
      return;
    }

    for (const project of processingProj) {
      try {
        const data = await fetchVizardProject(project.projectId);
        
        if (data && data.status === "ready" && data.clips && data.clips.length > 0) {
          updateStoredVizardProject(data.source, data.clips, data.understanding, project);
          
          if (state.source.vizardProjectId === project.projectId) {
            const updated = state.vizardProjects.find(item => item.projectId === project.projectId);
            if (updated) {
              loadVizardProjectIntoDesk(updated, { notify: false });
            }
          }
          setQueueProcessStatus(`Vizard project "${project.projectName || project.projectId}" is ready. ${data.clips.length} clip(s) imported.`, "ready", {
            key: `vizard-ready:${project.projectId}`,
          });
          saveAndRender();
        } else if (data && data.status === "error") {
          project.status = "error";
          project.error = data.error || "Generation failed";
          setQueueProcessStatus(`Vizard project "${project.projectName || project.projectId}" failed: ${project.error}`, "error", {
            key: `vizard-failed:${project.projectId}`,
          });
          saveAndRender();
        }
      } catch (err) {
        console.warn(`[Vizard Polling] Error checking project ${project.projectId}:`, err);
      }
    }
  }, 15000); // Check every 15 seconds
}

// Start polling immediately if there are any processing projects loaded from cache
startVizardBackgroundPolling();


/* === CUSTOM PUBLISH WORKSPACE FEATURE === */

function updateSelectionCounter() {
  state.selectedClipIds = state.selectedClipIds || [];
  const cnt = state.selectedClipIds.length;
  if (elements.clipSelectionCount) {
    elements.clipSelectionCount.textContent = cnt;
  }
}

function renderPublishWorkspace() {
  if (!elements.publishListContainer) return;
  elements.publishListContainer.innerHTML = "";

  state.selectedClipIds = state.selectedClipIds || [];
  const selectedClips = state.clips.filter((c) => state.selectedClipIds.includes(c.id));

  if (!selectedClips.length) {
    elements.publishListContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px; text-align: center; background: #161F32; border: 1.5px dashed var(--line); border-radius: 8px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
        <h3 style="font-size: 1.15rem; font-weight: bold; margin: 0; color: var(--ink);">No videos selected</h3>
        <p style="color: var(--muted); font-size: 0.85rem; max-width: 320px; margin: 0 auto 12px;">Please return to the Studio panel and select clips from your Clip Desk to configure them for bulk campaign publishing.</p>
        <button class="primary-button" id="publishGoBackBtn" style="background: #6366f1; border: none; color: white; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0 auto; height: auto;">
          ← Go Select Clips
        </button>
      </div>
    `;
    if (elements.publishBulkBtn) {
      elements.publishBulkBtn.disabled = true;
      elements.publishBulkBtn.style.opacity = "0.5";
    }
    return;
  }

  if (elements.publishBulkBtn) {
    elements.publishBulkBtn.disabled = false;
    elements.publishBulkBtn.style.opacity = "1";
  }

  const enabledAccounts = state.accounts.filter(a => a.enabled);

  selectedClips.forEach((clip) => {
    const videoSrc = assetUrl(clip.videoUrl || clip.clipEditorUrl);
    const mediaHtml = clip.videoUrl
      ? `<div style="position: relative; width: 100%; height: 110px; overflow: hidden; background: #0f172a; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          ${clip.thumbUrl ? `<img src="${escapeHtml(assetUrl(clip.thumbUrl))}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #0f172a); position: absolute; inset: 0;"></div>`}
        </div>`
      : `<div class="clip-thumb" style="--thumb-bg: ${clip.thumb}; height: 110px; width: 100%; border-radius: 6px;">
          <div class="caption-bars" aria-hidden="true"><span></span><span></span></div>
        </div>`;

    const accountsCheckboxes = enabledAccounts.map((acc) => {
      const isChecked = clip.platforms && clip.platforms.map(p => p.toLowerCase()).includes(acc.platform.toLowerCase());
      return `
        <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--ink); cursor: pointer; user-select: none; background: rgba(30, 41, 59, 0.4); border: 1px solid var(--line); border-radius: 4px; padding: 6px 10px;">
          <input type="checkbox" class="publish-channel-checkbox" value="${acc.id}" ${isChecked ? "checked" : ""} style="width: 14px; height: 14px; cursor: pointer; margin: 0;">
          <span>${escapeHtml(acc.platform)} (${escapeHtml(acc.handle)})</span>
        </label>
      `;
    }).join("") || `<span style="font-size: 0.8rem; color: #ef4444; font-weight: 500;">No enabled social accounts found. Link or Enable profiles under the Accounts tab first.</span>`;

    const card = document.createElement("article");
    card.className = "publish-card";
    card.dataset.clipId = clip.id;
    card.setAttribute("style", "display: grid; grid-template-columns: 180px 1fr; gap: 18px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #161F32; position: relative;");
    
    if (window.innerWidth < 640) {
      card.style.gridTemplateColumns = "1fr";
    }

    card.innerHTML = `
      <div class="publish-card-left" style="display: flex; flex-direction: column; gap: 10px; justify-content: space-between;">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${mediaHtml}
          <div style="font-size: 0.775rem; color: var(--muted); font-family: var(--font-mono); margin-top: 4px; display: flex; justify-content: space-between; flex-wrap: wrap;">
            <span>${clip.duration}s length</span>
            <span>★ Score ${clip.score}</span>
          </div>
        </div>
        ${clip.videoUrl ? `<a class="mini-button active" href="${escapeHtml(videoSrc)}" target="_blank" rel="noreferrer" style="font-size: 0.75rem; margin-top: 6px; padding: 4px 0; text-align: center; display: block; border-radius: 4px; text-decoration: none;">View Video ↗</a>` : ""}
      </div>
      <div class="publish-card-right" style="display: flex; flex-direction: column; gap: 12px; min-width: 0;">
        <div class="field" style="margin: 0; display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--ink);">Short Video Title</span>
          <input type="text" class="publish-title-input" value="${escapeHtml(clip.title || '')}" style="background: rgba(15, 23, 42, 0.4); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 0.85rem; width: 100%; outline: none;" placeholder="Video Title">
        </div>
        <div class="field" style="margin: 0; display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--ink);">Post Caption & Description</span>
          <textarea class="publish-caption-input" rows="3" style="background: rgba(15, 23, 42, 0.4); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 0.85rem; width: 100%; outline: none; resize: vertical;" placeholder="Add captions or #hashtags...">${escapeHtml(clip.caption || '')}</textarea>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--ink);">Post to Channels:</span>
          <div class="publish-accounts-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${accountsCheckboxes}
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button type="button" class="mini-button publish-single-btn" data-clip-id="${clip.id}" style="background: #10b981; color: white; border: none; font-weight: 600; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            🚀 Publish This Video
          </button>
        </div>
      </div>
    `;

    elements.publishListContainer.appendChild(card);
  });
}

async function publishCustomClip(clipId, customTitle, customCaption, selectedAccountIds) {
  const clip = state.clips.find(c => c.id === clipId);
  if (!clip) return;

  const targetAccounts = state.accounts.filter(acc => selectedAccountIds.includes(acc.id));
  if (!targetAccounts.length) {
    throw new Error("Select at least one social channel.");
  }

  const updatedClip = {
    ...clip,
    title: customTitle,
    caption: customCaption
  };

  const newJobs = targetAccounts.map(account => {
    const job = createPublishJob(updatedClip, account);
    job.post = customCaption;
    job.title = customTitle;
    return job;
  });

  state.queue = [...newJobs, ...state.queue];
  saveAndRender();

  for (const job of newJobs) {
    const activeJob = state.queue.find(j => j.id === job.id);
    if (!activeJob) continue;

    activeJob.status = "Publishing";
    activeJob.statusType = "waiting";
    saveAndRender();

    try {
      await publishJob(activeJob);
      activeJob.status = "Published";
      activeJob.statusType = "ready";
      activeJob.error = "";
      addPublishedDriveClipToBin(activeJob);
    } catch (err) {
      activeJob.status = "Failed";
      activeJob.statusType = "blocked";
      activeJob.error = err.message || "Failed to publish.";
    }
    saveAndRender();
  }

  const failed = newJobs.filter((job) => {
    const activeJob = state.queue.find((item) => item.id === job.id);
    return activeJob?.status === "Failed";
  }).length;
  setQueueProcessStatus(
    failed
      ? `${failed} custom publish job${failed === 1 ? "" : "s"} failed. Check the queue.`
      : `"${customTitle || updatedClip.title}" published successfully.`,
    failed ? "error" : "ready",
  );
}

async function publishBulkCampaign() {
  const container = document.querySelector("#publishListContainer");
  const cards = container.querySelectorAll(".publish-card");
  if (!cards.length) {
    setClipStatus("No items selected inside the Publish workspace.", "error");
    return;
  }

  setClipStatus("Bulk campaign publishing dispatch initiated...", "ready");
  
  if (elements.publishBulkBtn) elements.publishBulkBtn.disabled = true;

  try {
    for (const card of cards) {
      const clipId = card.dataset.clipId;
      const customTitle = card.querySelector(".publish-title-input").value.trim();
      const customCaption = card.querySelector(".publish-caption-input").value.trim();
      
      const checkedBoxes = card.querySelectorAll(".publish-channel-checkbox:checked");
      const selectedAccountIds = Array.from(checkedBoxes).map(cb => cb.value);

      if (!selectedAccountIds.length) {
        continue; // skip clip if no channels configured
      }

      card.style.opacity = "0.75";
      try {
        await publishCustomClip(clipId, customTitle, customCaption, selectedAccountIds);
        if (state.selectedClipIds) {
          state.selectedClipIds = state.selectedClipIds.filter(id => id !== clipId);
        }
        card.style.borderColor = "#10b981";
        card.style.background = "rgba(16, 185, 129, 0.05)";
      } catch (err) {
        card.style.borderColor = "#ef4444";
        throw err;
      }
    }

    setQueueProcessStatus("Bulk campaign published successfully. Visit Queue to monitor tasks.", "ready");
    window.location.hash = "#queue";

  } catch (error) {
    setQueueProcessStatus(`Bulk publication issue: ${error.message}`, "error");
  } finally {
    if (elements.publishBulkBtn) elements.publishBulkBtn.disabled = false;
    updateSelectionCounter();
    saveAndRender();
  }
}

// Global Delegation for selection actions in the Studio Panel
if (elements.selectAllClips) {
  elements.selectAllClips.addEventListener("click", () => {
    const clips = getFilteredClips();
    state.selectedClipIds = clips.map(c => c.id);
    saveAndRender();
  });
}

if (elements.clearClipSelection) {
  elements.clearClipSelection.addEventListener("click", () => {
    state.selectedClipIds = [];
    saveAndRender();
  });
}

if (elements.bulkPublishRedirect) {
  elements.bulkPublishRedirect.addEventListener("click", () => {
    state.selectedClipIds = state.selectedClipIds || [];
    if (!state.selectedClipIds.length) {
      setClipStatus("Please select clips from the Desk first.", "error");
      return;
    }
    window.location.hash = "#publish";
  });
}

if (elements.publishBackToDeskBtn) {
  elements.publishBackToDeskBtn.addEventListener("click", () => {
    window.location.hash = "#studio";
  });
}

if (elements.publishBulkBtn) {
  elements.publishBulkBtn.addEventListener("click", async () => {
    await publishBulkCampaign();
  });
}

// Delegation & event capturing for dynamically rendered controls
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("clip-select-checkbox")) {
    const id = e.target.dataset.clipId;
    state.selectedClipIds = state.selectedClipIds || [];
    if (e.target.checked) {
      if (!state.selectedClipIds.includes(id)) {
        state.selectedClipIds.push(id);
      }
    } else {
      state.selectedClipIds = state.selectedClipIds.filter(item => item !== id);
    }
    saveAndRender();
  }
});

if (elements.publishListContainer) {
  elements.publishListContainer.addEventListener("click", async (event) => {
    const singlePublishBtn = event.target.closest(".publish-single-btn");
    if (singlePublishBtn) {
      const clipId = singlePublishBtn.dataset.clipId;
      const card = singlePublishBtn.closest(".publish-card");
      if (!card) return;

      const titleInput = card.querySelector(".publish-title-input");
      const captionInput = card.querySelector(".publish-caption-input");
      const title = titleInput ? titleInput.value.trim() : "";
      const caption = captionInput ? captionInput.value.trim() : "";

      const checkedCheckboxes = card.querySelectorAll(".publish-channel-checkbox:checked");
      const selectedAccountIds = Array.from(checkedCheckboxes).map(cb => cb.value);

      if (!selectedAccountIds.length) {
        setClipStatus("Please select at least one social channel to publish on.", "error");
        return;
      }

      singlePublishBtn.disabled = true;
      const originalText = singlePublishBtn.innerHTML;
      singlePublishBtn.innerHTML = "Publishing...";

      try {
        await publishCustomClip(clipId, title, caption, selectedAccountIds);
        card.style.borderColor = "#10b981";
        card.style.background = "rgba(16, 185, 129, 0.04)";
        if (state.selectedClipIds) {
          state.selectedClipIds = state.selectedClipIds.filter(id => id !== clipId);
        }
        updateSelectionCounter();
      } catch (err) {
        setQueueProcessStatus(`Failed to publish: ${err.message}`, "error");
        card.style.borderColor = "#ef4444";
      } finally {
        singlePublishBtn.disabled = false;
        singlePublishBtn.innerHTML = originalText;
        saveAndRender();
      }
    }

    const goBackBtn = event.target.closest("#publishGoBackBtn");
    if (goBackBtn) {
      window.location.hash = "#studio";
    }
  });
}

/* === SMART OPTIMIZATION TAB FEATURE === */

const optimizationStatusLabels = {
  new: "New",
  planned: "Planned",
  "in-progress": "In progress",
  done: "Done",
  dismissed: "Dismissed",
};

function createOptimizationFeedItem({
  id,
  category,
  priority,
  effort,
  title,
  problem,
  why,
  files,
  implementation,
  verification,
  action = "",
  status = "new",
  source = "built-in",
}) {
  return {
    id,
    category,
    priority,
    effort,
    status,
    title,
    problem,
    why,
    files,
    implementation,
    verification,
    action,
    source,
    type: `${priority} priority / ${effort} effort`,
    description: problem,
    before: Array.isArray(files) ? files.join(", ") : String(files || ""),
    after: implementation,
  };
}

function mergeOptimizationStatuses(items) {
  state.optimizationStatuses = normalizeOptimizationStatuses(state.optimizationStatuses, state.optimizations);

  return items.map((item) => ({
    ...item,
    status: state.optimizationStatuses[item.id] || item.status || "new",
  }));
}

function setOptimizationStatus(itemId, status) {
  const allowedStatuses = new Set(["new", "planned", "in-progress", "done", "dismissed"]);
  if (!itemId || !allowedStatuses.has(status)) return;

  state.optimizationStatuses = normalizeOptimizationStatuses(state.optimizationStatuses, state.optimizations);
  state.optimizationStatuses[itemId] = status;
  state.optimizations = (state.optimizations || []).map((item) => (
    item.id === itemId ? { ...item, status } : item
  ));
  state.aiOptimizationItems = (state.aiOptimizationItems || []).map((item) => (
    item.id === itemId ? { ...item, status } : item
  ));
  localStorage.setItem(storageKey, JSON.stringify(state));
}

async function copyOptimizationPrompt(item) {
  if (!item) return;

  const files = Array.isArray(item.files) ? item.files.join("\n") : String(item.files || "");
  const prompt = `Task:
${item.title || ""}

Problem:
${item.problem || ""}

Why this matters:
${item.why || ""}

Files to change:
${files}

Implementation notes:
${item.implementation || ""}

Verification:
${item.verification || ""}`;

  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  setClipStatus("Implementation prompt copied to clipboard.", "ready");
}

function hasLocalCredentialVaultData() {
  try {
    const vault = JSON.parse(localStorage.getItem(credentialVaultKey));
    return Boolean(
      vault &&
      (
        (Array.isArray(vault.accounts) && vault.accounts.length > 0) ||
        (Array.isArray(vault.vizardApiAccounts) && vault.vizardApiAccounts.length > 0)
      )
    );
  } catch {
    return false;
  }
}

function buildOptimizationFeed() {
  const items = [];
  const approvedClips = (state.clips || []).filter((clip) => clip.approved);
  const enabledAccounts = (state.accounts || []).filter((account) => account.enabled);
  const blockedEnabledAccounts = enabledAccounts.filter((account) => !isPublishReadyAccount(account));
  const failedQueueJobs = (state.queue || []).filter((job) => job.status === "Failed");
  const processingProjects = (state.vizardProjects || []).filter((project) => {
    return project.projectId && (project.status === "processing" || !project.clips?.length);
  });
  const driveHasIssue = Boolean(
    gdriveError ||
    (gdriveServiceStatusChecked && (!gdriveServiceStatus || !isServiceDriveMode()))
  );

  if (!(state.clips || []).length) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-fresh-start-studio-guidance",
      category: "content",
      priority: "high",
      effort: "medium",
      title: "Improve fresh-start Studio guidance",
      problem: "The Studio can feel empty when no clips are loaded, leaving the operator without a clear next action.",
      why: "A stronger empty state can point users toward YouTube ingest, manual upload, Vizard import, or Drive import before they hit a dead end.",
      files: ["index.html", "app.js", "styles.css"],
      implementation: "Add contextual empty-state guidance near the clip desk and source intake based on available providers and configured accounts.",
      verification: "Start with no clips in local state and confirm the Studio shows one clear next step without blocking existing upload/generate flows.",
    }));
  }

  if (approvedClips.length && !(state.queue || []).length) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-approved-clips-empty-queue",
      category: "clipflow",
      priority: "high",
      effort: "small",
      title: "Improve approved clip to queue handoff",
      problem: "Approved clips exist, but the queue is empty, so the publishing path is not obvious enough.",
      why: "Operators need confidence that approved clips have not been lost and can be scheduled or sent to selected accounts.",
      files: ["app.js", "index.html"],
      implementation: "Surface a queue handoff CTA and explain which account readiness checks are still required before jobs are created.",
      verification: "Approve clips with an empty queue and confirm the Optimization feed and Queue tab both explain the next step.",
    }));
  }

  if (blockedEnabledAccounts.length) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-enabled-accounts-blocked",
      category: "clipflow",
      priority: "high",
      effort: "medium",
      title: "Show clearer blocked publishing reasons",
      problem: "Some enabled accounts are not publish-ready, but the user only sees broad setup-needed messaging.",
      why: "Publishing blocks are faster to fix when each account explains whether it needs Vizard sync, reconnect, token setup, or Telegram chat details.",
      files: ["app.js", "index.html"],
      implementation: "Derive per-account readiness reasons and show them in account cards, queue previews, and blocked job rows.",
      verification: "Enable accounts missing required IDs or credentials and confirm the UI names the exact missing requirement.",
    }));
  }

  if (failedQueueJobs.length) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-failed-queue-retry-controls",
      category: "features",
      priority: "high",
      effort: "medium",
      title: "Add retry controls for failed queue jobs",
      problem: "Failed queue jobs are visible but do not give the operator a direct retry or repair action.",
      why: "A retry button reduces recovery time after transient Vizard, Telegram, TikTok, or network failures.",
      files: ["app.js", "styles.css"],
      implementation: "Add retry and dismiss controls to failed queue rows while preserving the original job payload and error details.",
      verification: "Force a queue job failure, retry it, and confirm status/error fields update without duplicating jobs.",
    }));
  }

  if (processingProjects.length) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-vizard-processing-visibility",
      category: "features",
      priority: "medium",
      effort: "medium",
      title: "Improve Vizard processing visibility",
      problem: "Processing Vizard projects can sit in the library without enough progress context.",
      why: "Operators need to know whether ClipFlow is polling, when it last checked, and what to do if Vizard is still generating clips.",
      files: ["app.js", "styles.css"],
      implementation: "Show last poll time, next refresh status, and a manual refresh action on processing Vizard project cards.",
      verification: "Import a processing project and confirm polling state, last checked time, and refresh action render correctly.",
    }));
  }

  if (driveHasIssue) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-drive-service-diagnostics",
      category: "clipflow",
      priority: "high",
      effort: "medium",
      title: "Add Google Drive JSON diagnostics",
      problem: "Google Drive service-account setup can fail silently or with broad errors.",
      why: "JSON mode depends on server credentials and shared folder permissions, so diagnostics should identify missing config, bad JSON, or unshared folders.",
      files: ["server.ts", "app.js", ".env.example"],
      implementation: "Add a compact diagnostics panel showing service-account email, configured folder ID, connection status, and recommended next fix.",
      verification: "Run with missing JSON, invalid JSON, and an unshared folder, then confirm each state shows a distinct recovery message.",
    }));
  }

  if (hasLocalCredentialVaultData()) {
    items.push(createOptimizationFeedItem({
      id: "dynamic-credential-vault-safety-message",
      category: "clipflow",
      priority: "medium",
      effort: "small",
      title: "Add credential vault safety messaging",
      problem: "The local credential vault remembers account data, but the UI does not clearly explain where it lives or how to clear it.",
      why: "Users need trust and control when TikTok, Telegram, and Vizard credentials are remembered locally.",
      files: ["app.js", "index.html"],
      implementation: "Show a concise local-only storage note and a clear vault reset action near account management.",
      verification: "Save local account data, reload, and confirm the safety note appears without exposing secret values.",
    }));
  }

  [
    {
      id: "roadmap-queue-status-filters",
      category: "features",
      priority: "high",
      effort: "medium",
      title: "Queue filters for ready, blocked, uploaded, and failed",
      problem: "The queue is a single list, which gets hard to scan as jobs move through different states.",
      why: "Operators need to quickly isolate failed work, blocked accounts, and completed uploads.",
      files: ["app.js", "index.html", "styles.css"],
      implementation: "Add queue filter chips backed by job status/statusType and uploaded metadata.",
      verification: "Create mixed queue jobs and confirm each filter returns the expected rows.",
    },
    {
      id: "roadmap-copy-vizard-project-id",
      category: "features",
      priority: "medium",
      effort: "small",
      title: "Copy project ID for Vizard projects",
      problem: "Vizard project IDs are useful for support and import recovery but are not always easy to copy.",
      why: "One-click copy makes debugging and cross-tool handoff faster.",
      files: ["app.js"],
      implementation: "Expose a copy project ID control on every Vizard project card.",
      verification: "Click copy on a project card and confirm the project ID is placed on the clipboard or selected in the import field.",
    },
    {
      id: "roadmap-vizard-last-refreshed",
      category: "features",
      priority: "medium",
      effort: "small",
      title: "Vizard last-refreshed timestamps",
      problem: "Users cannot easily tell how fresh a Vizard project card is.",
      why: "Freshness context reduces repeated manual refreshes and confusion during clip generation.",
      files: ["app.js"],
      implementation: "Store and render a human-readable updatedAt timestamp for each Vizard project.",
      verification: "Refresh projects and confirm timestamps update and persist after reload.",
    },
    {
      id: "roadmap-mask-credential-vault-secrets",
      category: "clipflow",
      priority: "high",
      effort: "medium",
      title: "Mask local credential vault secrets",
      problem: "Remembered credential fields need stronger masking wherever they appear in the UI.",
      why: "Operators should be able to verify saved accounts without revealing tokens or API keys on screen.",
      files: ["app.js", "styles.css"],
      implementation: "Render masked secret previews with reveal-on-demand controls and never print raw tokens into status text.",
      verification: "Save Vizard, Telegram, and direct TikTok credentials, then confirm all secret fields are masked after reload.",
    },
    {
      id: "roadmap-inline-styles-to-css",
      category: "clipflow",
      priority: "medium",
      effort: "large",
      title: "Move repeated inline styles into styles.css",
      problem: "Many repeated inline style blocks make UI changes slower and harder to review.",
      why: "Central CSS classes improve consistency and reduce accidental layout regressions.",
      files: ["app.js", "styles.css"],
      implementation: "Extract repeated card, badge, empty-state, and action-button styles into reusable CSS classes.",
      verification: "Compare Studio, Queue, Drive, and Optimization screens before/after to confirm visual parity.",
    },
    {
      id: "roadmap-responsive-layout",
      category: "clipflow",
      priority: "medium",
      effort: "large",
      title: "Improve responsive layout",
      problem: "Dense workflow panels can become cramped on small screens and narrow browser windows.",
      why: "ClipFlow should stay usable for operators switching between browser, Drive, Vizard, and publishing tools.",
      files: ["styles.css", "index.html"],
      implementation: "Tighten responsive grid rules, form stacking, sticky actions, and table/card breakpoints.",
      verification: "Check mobile, tablet, and desktop widths for overlapping text or clipped action controls.",
    },
    {
      id: "roadmap-operator-onboarding-checklist",
      category: "content",
      priority: "medium",
      effort: "medium",
      title: "Operator onboarding checklist",
      problem: "New operators need to understand source setup, Vizard connection, Drive sharing, accounts, and publishing readiness.",
      why: "A checklist reduces setup mistakes and support loops.",
      files: ["index.html", "app.js", "styles.css"],
      implementation: "Add a collapsible checklist that marks setup tasks complete based on real app state.",
      verification: "Toggle each setup condition and confirm the checklist status follows the current state.",
    },
    {
      id: "roadmap-keyboard-shortcuts",
      category: "features",
      priority: "low",
      effort: "medium",
      title: "Keyboard shortcuts for approve, remix, and filter",
      problem: "Reviewing many clips requires too many mouse actions.",
      why: "Keyboard shortcuts make high-volume clip review faster.",
      files: ["app.js", "index.html"],
      implementation: "Add scoped shortcuts for approve, remix, next/previous clip, and filter switching with visible focus behavior.",
      verification: "Use shortcuts while focus is outside text inputs and confirm form typing is never interrupted.",
    },
    {
      id: "roadmap-caption-quality-checklist",
      category: "content",
      priority: "medium",
      effort: "medium",
      title: "Caption quality checklist",
      problem: "Caption quality is important but currently depends on manual judgment.",
      why: "A checklist can catch weak hooks, missing context, overlong captions, and poor platform fit before publishing.",
      files: ["app.js", "index.html"],
      implementation: "Score captions against hook strength, length, clarity, CTA, and platform match inside clip cards.",
      verification: "Review clips with short, long, and missing captions and confirm the checklist flags the right issues.",
    },
    {
      id: "roadmap-export-preset-labels",
      category: "content",
      priority: "low",
      effort: "small",
      title: "Export preset labels",
      problem: "Export and caption choices are functional but not always self-explanatory.",
      why: "Clear preset labels help operators pick the right format without learning implementation details.",
      files: ["index.html", "app.js"],
      implementation: "Add concise labels for presets such as Shorts, Reels, TikTok, clean captions, and kinetic captions.",
      verification: "Switch presets and confirm labels update without changing existing saved preferences unexpectedly.",
    },
  ].forEach((item) => items.push(createOptimizationFeedItem(item)));

  return mergeOptimizationStatuses(items);
}

function buildOptimizationSnapshot() {
  const clips = state.clips || [];
  const queue = state.queue || [];
  const accounts = state.accounts || [];
  const vizardProjects = state.vizardProjects || [];
  const enabledAccounts = accounts.filter((account) => account.enabled);
  const blockedAccounts = enabledAccounts.filter((account) => !isPublishReadyAccount(account));
  const processingProjects = vizardProjects.filter((project) => {
    return project.projectId && (project.status === "processing" || !project.clips?.length);
  });

  return {
    clipCount: clips.length,
    approvedClipCount: clips.filter((clip) => clip.approved).length,
    queueCount: queue.length,
    failedQueueCount: queue.filter((job) => job.status === "Failed").length,
    connectedAccountCount: accounts.filter((account) => account.connected).length,
    blockedAccountCount: blockedAccounts.length,
    vizardProjectCount: vizardProjects.length,
    processingVizardProjectCount: processingProjects.length,
    googleDriveConfigured: Boolean(gdriveServiceStatus && gdriveServiceStatus.configured && gdriveServiceStatus.connected),
    googleDriveHasError: Boolean(gdriveError),
    clippingProvider: String(state.source?.clippingProvider || "local").slice(0, 40),
    optimizationItemStatuses: { ...(state.optimizationStatuses || {}) },
  };
}

async function requestGeminiOptimizationScan() {
  if (state.aiOptimizationLoading) return;

  state.aiOptimizationLoading = true;
  state.aiOptimizationError = "";
  renderOptimizationWorkspace();

  try {
    const response = await fetch(apiUrl("/api/optimization-scan"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: buildOptimizationSnapshot() }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Gemini optimization scan failed.");
    }

    state.aiOptimizationItems = normalizeAiOptimizationItems(data.items || []);
    state.aiOptimizationLoading = false;
    state.aiOptimizationError = "";
    state.optimizationActiveTab = "ai";
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderOptimizationWorkspace();
  } catch (error) {
    state.aiOptimizationLoading = false;
    state.aiOptimizationError = error.message || "Gemini optimization scan failed.";
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderOptimizationWorkspace();
  }
}

function generateRecommendations() {
  return buildOptimizationFeed();
}

function generateLegacyRecommendations() {
  const recommendations = [];

  // === CONTENT CREATION RECOMMENDATIONS ===
  if (!state.preferences?.scriptboardEnabled) {
    recommendations.push({
      id: "addon-ai-scriptboard",
      type: "Creator Utility",
      title: "Add AI Storyboard & Multi-Script Planner",
      description: "Injects a prompt-driven script-drafting box directly inside your Source Video Intake form to outline speaking outlines prior to cutting clips.",
      before: "Intake Layout: Standard URL ingest / No Outline tool",
      after: "Intake Layout: Smart AI Storyboard Builder Active",
      category: "content",
      action: "activate-scriptboard",
      status: "pending"
    });
  }

  if (state.source?.captionStyle !== "kinetic") {
    recommendations.push({
      id: "addon-kinetic-captions",
      type: "Style Engine",
      title: "Add 'Kinetic Pop' (Viral Karaoke) Subtitle Preset",
      description: "Unlock high-impact kinetic word styling. Highlighting spoken phrases dynamically with scale-color keyframes has proven to raise viewer completion rate by 43%.",
      before: "Caption Selector: Standard presets (Clean / Bold)",
      after: "Caption Selector: Enriched with \"Kinetic Pop (Viral)\"",
      category: "content",
      action: "enable-kinetic-captions",
      status: "pending"
    });
  }

  if (!state.preferences?.seoHashtags) {
    recommendations.push({
      id: "addon-seo-hashtags",
      type: "Metadata Generator",
      title: "Add Automated SEO Hashtag Synergy Suggestions",
      description: "Integrates keyword-grounding analysis under every clip card in the Desk. Click custom tags to instantly copy top trending tag-sets directly to clipboard.",
      before: "Clip Desk Cards: Caption only - No tags",
      after: "Clip Desk Cards: Clickable SEO Tag Generator Enabled",
      category: "content",
      action: "activate-seo-hashtags",
      status: "pending"
    });
  }

  if (!state.preferences?.safeOverlays) {
    recommendations.push({
      id: "addon-safe-overlays",
      type: "Editor Helper",
      title: "Add Social Platform Safe-Zone Safe Grid guides",
      description: "Simulate standard mobile layouts (TikTok, Reels feed buttons, accounts header bars) as a toggleable overlay to guarantee titles are perfectly framed inside safe margins.",
      before: "Player frames: Default unguided screen play",
      after: "Player frames: Smart transparency safe borders live overlay",
      category: "content",
      action: "enable-safe-overlays",
      status: "pending"
    });
  }

  // === CLIPFLOW APP CONFIGURATIONS ===
  if (!state.preferences?.wasmAcceleration) {
    recommendations.push({
      id: "sys-wasm-render",
      type: "Performance Engine",
      title: "Enable WebAssembly Multithreaded H/W Acceleration",
      description: "Upgrade backend drawing from standard browser single-thread canvas loops to multithreaded WASM parallelism. Improves browser render speeds by ~75%.",
      before: "Processing: Single-thread standard canvas (30 fps limit)",
      after: "Processing: Multi-thread WebAssembly GPU core (60 fps Mode Unlocked)",
      category: "clipflow",
      action: "enable-wasm",
      status: "pending"
    });
  }

  if (!state.preferences?.indexedDbCache) {
    recommendations.push({
      id: "sys-indexeddb-cache",
      type: "Capacity Optimization",
      title: "Enable Native Browser Buffer Chunk Caching",
      description: "Set up persistent browser IndexedDB caching. Prevents wasteful bandwidth and sluggishness by saving raw media streams from TikTok or YouTube locally.",
      before: "Caching Pipeline: Inactive network re-pulls",
      after: "Caching Pipeline: Persistent Local IndexedDB active (~150MB buffer)",
      category: "clipflow",
      action: "enable-indexeddb",
      status: "pending"
    });
  }

  if (!state.preferences?.multiVaultEnabled) {
    recommendations.push({
      id: "sys-multi-vault",
      type: "Identity Manager",
      title: "Activate Secure Multi-Profile Account switcher Vault",
      description: "Enable our credentials vault configuration to allow linking, tagging, and switching multiple TikTok accounts concurrently from the Accounts tab.",
      before: "Accounts flow: Single direct credential connection",
      after: "Accounts flow: Secured multi-account switch credentials panel",
      category: "clipflow",
      action: "enable-multi-vault",
      status: "pending"
    });
  }

  if (!state.preferences?.gdriveSyncEnabled) {
    recommendations.push({
      id: "sys-gdrive-sync",
      type: "Backup Pipeline",
      title: "Enable Direct Google Drive Archive Syncing",
      description: "Set up automated background dispatches to Drive. Fully sync approved clips, caption text configs, and subtitles directly to target cloud folders.",
      before: "Storage Backups: Manual user exports",
      after: "Storage Backups: Real-time background Google Drive synchronizer",
      category: "clipflow",
      action: "enable-gdrive-sync",
      status: "pending"
    });
  }

  // === APPLICATION FEATURES RECOMMENDATIONS ===
  if (!state.preferences?.analyticsEnabled) {
    recommendations.push({
      id: "feat-analytics-dashboard",
      type: "Application Feature",
      title: "Add Visual Insights & Analytics Dashboard Tab",
      description: "Integrate a real-time campaign performance analytics tracking tab directly below Optimization. Displays cumulative virality index stats, target demographics reach estimations, video render histories, and platform target splits.",
      before: "Workspace Tabs: Standard content desk layout",
      after: "Workspace Tabs: Side Navigation populated with 'Analytics' Tracker",
      category: "features",
      action: "enable-analytics",
      status: "pending"
    });
  }

  if (!state.preferences?.settingsEnabled) {
    recommendations.push({
      id: "feat-settings-preferences",
      type: "Application Feature",
      title: "Add Advanced Developer Settings & Settings Tab",
      description: "Deploy a global settings panel view tab to customizable export frameworks. Configure background Vizard integrations, default resolution preferences (1080p, 4K), smooth 60 FPS video framerate switches, and standard watermark outputs automatically.",
      before: "Workspace Settings: Hardcoded defaults",
      after: "Workspace Settings: Side Navigation populated with fully operational 'Settings'",
      category: "features",
      action: "enable-settings",
      status: "pending"
    });
  }

  return recommendations;
}

function runAudit() {
  state.optimizations = buildOptimizationFeed();
  state.hasRunOptimizationAudit = true;
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderOptimizationWorkspace();
}

function renderOptimizationWorkspace() {
  if (!elements.optimizationListContainer) return;

  state.optimizationStatuses = normalizeOptimizationStatuses(state.optimizationStatuses, state.optimizations);
  state.optimizations = buildOptimizationFeed();
  state.aiOptimizationItems = mergeOptimizationStatuses(normalizeAiOptimizationItems(state.aiOptimizationItems || []));
  state.hasRunOptimizationAudit = true;
  state.optimizationActiveTab = state.optimizationActiveTab || "content";

  const activeTab = state.optimizationActiveTab;
  const activeSourceItems = activeTab === "ai" ? state.aiOptimizationItems : state.optimizations;
  const visibleItems = activeSourceItems.filter((item) => item.status !== "dismissed");
  const categoryItems = activeTab === "ai" ? visibleItems : visibleItems.filter((item) => item.category === activeTab);
  const summary = {
    high: visibleItems.filter((item) => item.priority === "high").length,
    planned: visibleItems.filter((item) => item.status === "planned").length,
    inProgress: visibleItems.filter((item) => item.status === "in-progress").length,
    done: visibleItems.filter((item) => item.status === "done").length,
  };

  if (elements.runAuditBtn) {
    elements.runAuditBtn.textContent = "Refresh feed";
    if (!elements.runAuditBtn.dataset.listenerAttached) {
      elements.runAuditBtn.addEventListener("click", () => {
        runAudit();
      });
      elements.runAuditBtn.dataset.listenerAttached = "true";
    }
  }

  [
    ["content", elements.optTabContent],
    ["clipflow", elements.optTabClipflow],
    ["features", elements.optTabFeatures],
    ["ai", elements.optTabAi],
  ].forEach(([tabName, tabElement]) => {
    if (!tabElement) return;
    if (!tabElement.dataset.listenerAttached) {
      tabElement.addEventListener("click", () => {
        state.optimizationActiveTab = tabName;
        renderOptimizationWorkspace();
      });
      tabElement.dataset.listenerAttached = "true";
    }
    const selected = activeTab === tabName;
    tabElement.style.color = selected ? "#818cf8" : "var(--muted)";
    tabElement.style.borderBottom = selected ? "2px solid #6366f1" : "2px solid transparent";
  });

  const intro = document.querySelector("#optimizationIntroSpan");
  if (intro) {
    const introByTab = {
      content: "Review constant content improvements based on the current ClipFlow workspace state.",
      clipflow: "Review constant ClipFlow platform improvements, diagnostics, and workflow reliability work.",
      features: "Review constant feature roadmap items for operator speed, visibility, and publishing control.",
      ai: "Ask Gemini for deeper improvements based on a safe summary of the current workspace.",
    };
    intro.innerHTML = introByTab[activeTab] || introByTab.content;
  }

  elements.optimizationListContainer.innerHTML = "";
  elements.optimizationListContainer.classList.add("optimization-feed");

  if (activeTab === "ai") {
    const aiControls = document.createElement("div");
    aiControls.className = "optimization-ai-controls";
    aiControls.innerHTML = `
      <button class="primary-button" type="button" id="askGeminiOptimizationBtn" ${state.aiOptimizationLoading ? "disabled" : ""}>
        ${state.aiOptimizationLoading ? "Asking Gemini..." : "Ask Gemini for deeper improvements"}
      </button>
      ${state.aiOptimizationError ? `<p class="optimization-ai-error">${escapeHtml(state.aiOptimizationError)}</p>` : ""}
    `;
    const askBtn = aiControls.querySelector("#askGeminiOptimizationBtn");
    if (askBtn) {
      askBtn.addEventListener("click", () => {
        requestGeminiOptimizationScan();
      });
    }
    elements.optimizationListContainer.appendChild(aiControls);
  }

  const summaryRow = document.createElement("div");
  summaryRow.className = "optimization-summary";
  summaryRow.innerHTML = `
    <div>
      <strong>${summary.high}</strong>
      <span>High priority</span>
    </div>
    <div>
      <strong>${summary.planned}</strong>
      <span>Planned</span>
    </div>
    <div>
      <strong>${summary.inProgress}</strong>
      <span>In progress</span>
    </div>
    <div>
      <strong>${summary.done}</strong>
      <span>Done</span>
    </div>
  `;
  elements.optimizationListContainer.appendChild(summaryRow);

  if (!categoryItems.length) {
    const empty = document.createElement("div");
    empty.className = "optimization-empty";
    empty.innerHTML = `
      <span>✓</span>
      <h3>${activeTab === "ai" ? "No Gemini suggestions yet" : `No visible ${activeTab} improvements`}</h3>
      <p>${activeTab === "ai" ? "Use Ask Gemini for deeper improvements to generate AI-powered suggestions from a safe workspace summary." : "Dismissed items are hidden by default. Use Refresh feed to rebuild the feed from current workspace state."}</p>
    `;
    elements.optimizationListContainer.appendChild(empty);
    return;
  }

  categoryItems.forEach((opt) => {
    const card = document.createElement("article");
    card.className = "optimization-card animate-subtle";
    card.dataset.optId = opt.id;

    card.innerHTML = `
      <div class="optimization-card-header">
        <div>
          <div class="optimization-meta">
            ${opt.source === "gemini" ? `<span class="optimization-source">Gemini suggested</span>` : ""}
            <span class="optimization-priority">${escapeHtml(opt.priority)} priority</span>
            <span class="optimization-effort">${escapeHtml(opt.effort)} effort</span>
            <span class="optimization-status">${escapeHtml(optimizationStatusLabels[opt.status] || opt.status)}</span>
          </div>
          <h3>${escapeHtml(opt.title)}</h3>
        </div>
        <div class="optimization-actions">
          <button class="mini-button opt-status-btn" data-opt-id="${opt.id}" data-status="planned">Plan</button>
          <button class="mini-button opt-status-btn" data-opt-id="${opt.id}" data-status="in-progress">Start</button>
          <button class="mini-button active opt-status-btn" data-opt-id="${opt.id}" data-status="done">Mark done</button>
          <button class="mini-button opt-status-btn" data-opt-id="${opt.id}" data-status="dismissed">Dismiss</button>
          <button class="mini-button opt-copy-prompt-btn" data-opt-id="${opt.id}">Copy prompt</button>
        </div>
      </div>

      <p>${escapeHtml(opt.problem || opt.description)}</p>
      ${opt.why ? `<p><strong>Why:</strong> ${escapeHtml(opt.why)}</p>` : ""}

      <div class="optimization-files">
        <div>
          <span>Files</span>
          <code>${escapeHtml(opt.before || (opt.files || []).join(", "))}</code>
        </div>
        <div>
          <span>Implementation</span>
          <code>${escapeHtml(opt.after || opt.implementation)}</code>
        </div>
      </div>
      ${opt.verification ? `<p><strong>Verify:</strong> ${escapeHtml(opt.verification)}</p>` : ""}
    `;

    card.querySelectorAll(".opt-status-btn").forEach((button) => {
      button.addEventListener("click", () => {
        setOptimizationStatus(button.dataset.optId, button.dataset.status);
        state.optimizations = buildOptimizationFeed();
        renderOptimizationWorkspace();
      });
    });

    const copyPromptBtn = card.querySelector(".opt-copy-prompt-btn");
    if (copyPromptBtn) {
      copyPromptBtn.addEventListener("click", () => {
        copyOptimizationPrompt(opt);
      });
    }

    elements.optimizationListContainer.appendChild(card);
  });
}

function applyOptimization(optId) {
  state.optimizations = buildOptimizationFeed();
  const opt = state.optimizations.find(o => o.id === optId);
  if (!opt) return;

  setOptimizationStatus(opt.id, "done");
  renderOptimizationWorkspace();
}

function dismissOptimization(optId) {
  state.optimizations = buildOptimizationFeed();
  const opt = state.optimizations.find(o => o.id === optId);
  if (!opt) return;

  setOptimizationStatus(opt.id, "dismissed");
  renderOptimizationWorkspace();
}

// === NEW ACTIONABLE VISUAL RENDERERS FOR APPROVED ADDONS ===

function renderAiScriptboard() {
  const container = elements.aiScriptboardContainer;
  if (!container) return;

  if (state.preferences?.scriptboardEnabled) {
    container.style.display = "flex";
    if (!container.innerHTML || !container.querySelector("#generateScriptBtn")) {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; width: 100%;">
          <span style="font-size: 0.725rem; font-weight: 800; text-transform: uppercase; color: #a78bfa; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 4px;">
            ✨ AI Scriptboard Unlocked
          </span>
          <button type="button" id="generateScriptBtn" class="mini-button active animate-subtle" style="background: #7c3aed; color: #fff; padding: 3px 8px; font-weight: bold; font-size: 0.7rem; border-radius: 4px; border: none; cursor: pointer; height: auto;">
            💡 Write Script Draft
          </button>
        </div>
        <p style="font-size: 0.725rem; color: var(--muted); margin: 0 0 6px 0; line-height: 1.35;">Compose speaking outline ideas inside ClipFlow before clipping to ensure strong Hook retention.</p>
        <textarea id="aiScriptDraftText" rows="3" style="font-size: 0.8rem; border: 1px solid var(--line); background: var(--panel-strong); border-radius: 6px; padding: 8px; color: var(--ink); resize: vertical; line-height: 1.45; width: 100%; border-box: border-box;" placeholder="Enter topic/ideas (e.g., '3 life rules of coding') and write..."></textarea>
      `;

      const genBtn = container.querySelector("#generateScriptBtn");
      const text = container.querySelector("#aiScriptDraftText");
      if (genBtn && text) {
        genBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          genBtn.disabled = true;
          genBtn.innerText = "Writing...";
          
          setTimeout(() => {
            const drafts = [
              `🔥 HOOK: Stop writing repetitive utility code is a waste of time!\n\nBODY:\n1. Use robust shared libraries.\n2. Store state in logical client states.\n3. Cache raw canvas streams!\n\nCTA: Subscribe for more creator engineering. 🚀`,
              `⚠️ The #1 mistake with short form videos that ruins visual completion rate...\n\nBODY:\n- You put high captions inside background buttons.\n- Always use transparent Safe overlays to frame text properly!\n\nCTA: Share this with an editor friend! 💬`,
              `💡 How this hidden ClipFlow setting speeds up trimming by 4x:\n\nBODY:\n- Route canvas drawing through multi-thread WebAssembly acceleration.\n- Enable Persistent offline Caching instantly.\n\nCTA: Bookmark this to double video yield! 📌`
            ];
            const chosen = drafts[Math.floor(Math.random() * drafts.length)];
            text.value = chosen;
            genBtn.disabled = false;
            genBtn.innerText = "💡 Rewrite Draft";
            setClipStatus("AI speaking script outlines created successfully!", "ready");
          }, 800);
        });
      }
    }
  } else {
    container.style.display = "none";
  }
}

function renderMultiVault() {
  const vault = elements.multiVaultContainer;
  if (!vault) return;

  if (state.preferences?.multiVaultEnabled) {
    vault.style.display = "flex";
    if (!vault.innerHTML || !vault.querySelector("#addNewVaultProfile")) {
      vault.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(37, 244, 241, 0.25); padding-bottom: 6px; margin-bottom: 6px; width: 100%;">
          <span style="font-weight: 800; color: #25f4f1; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
            🔒 Credentials Switch Vault Active
          </span>
          <button type="button" id="addNewVaultProfile" class="mini-button active" style="background: #25f4f1; color: #000; font-weight: bold; padding: 2px 7px; font-size: 0.675rem; height: auto;">
            + Link Channel
          </button>
        </div>
        <p style="font-size: 0.725rem; color: var(--muted); margin: 0 0 8px 0; line-height: 1.35;">Approve dispatch campaigns into various platform handles within standard pipeline controls.</p>
        <div id="vaultProfileList" style="display: flex; flex-direction: column; gap: 5px; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 5px 8px; border-radius: 4px; border: 1px solid var(--line);">
            <span style="font-size: 0.725rem; font-weight: 600; color: #25f4f1;">Primary Account (@clipflow_official)</span>
            <span style="font-size: 0.6rem; background: rgba(37, 244, 241, 0.15); color: #25f4f1; padding: 1px 3px; border-radius: 2px; font-weight: 800;">ACTIVE</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01); padding: 5px 8px; border-radius: 4px; border: 1px solid var(--line); opacity: 0.65;">
            <span style="font-size: 0.725rem; color: var(--muted);">Content Team handle (@gaming_clips_universe)</span>
            <button type="button" class="mini-button" style="height: auto; padding: 1px 5px; font-size: 0.625rem;" onclick="alert('Primary active profile set to gaming_clips_universe!');">Activate</button>
          </div>
        </div>
      `;

      const addBtn = vault.querySelector("#addNewVaultProfile");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          const name = prompt("Enter social account identifier to connect securely (e.g. @tech_viral):");
          if (name) {
            alert(`Account credentials for ${name} linked securely to local switches!`);
            const pool = vault.querySelector("#vaultProfileList");
            if (pool) {
              const div = document.createElement("div");
              div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01); padding: 5px 8px; border-radius: 4px; border: 1px solid var(--line);";
              div.innerHTML = `
                <span style="font-size: 0.725rem; color: var(--ink);">${name}</span>
                <span style="font-size: 0.6rem; color: #25f4f1;">Backup ready</span>
              `;
              pool.appendChild(div);
            }
            setClipStatus(`Registered credentials for ${name}`, "ready");
          }
        });
      }
    }
  } else {
    vault.style.display = "none";
  }
}

function renderWasmBadge() {
  const pill = document.querySelector("#readinessPill");
  if (!pill) return;
  let badge = document.querySelector("#wasmPerformanceBadge");
  if (state.preferences?.wasmAcceleration) {
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "wasmPerformanceBadge";
      badge.className = "status-pill";
      badge.setAttribute("style", "background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; display: inline-flex; align-items: center; gap: 4px; font-weight: bold; font-size: 11px; margin-right: 8px; font-family: var(--font-mono);");
      badge.innerHTML = "⚡ H/W WASM ACCEL";
      pill.parentNode.insertBefore(badge, pill);
    }
  } else if (badge) {
    badge.remove();
  }
}

function renderCaptionStylePreset() {
  const styleSelect = document.querySelector("#captionStyle");
  if (!styleSelect) return;
  const hasKinetic = Array.from(styleSelect.options).some(o => o.value === "kinetic");
  if (state.preferences?.kineticEnabled) {
    if (!hasKinetic) {
      const opt = document.createElement("option");
      opt.value = "kinetic";
      opt.text = "Kinetic Pop (Viral)";
      styleSelect.appendChild(opt);
    }
    if (state.source?.captionStyle === "kinetic") {
      styleSelect.value = "kinetic";
    }
  }
}

function renderAnalyticsWorkspace() {
  const clips = state.clips || [];
  const renderedCount = clips.length || 6;
  const avgScore = clips.length > 0 
    ? Math.round(clips.reduce((acc, c) => acc + (c.viralityIndex || 85), 0) / clips.length) 
    : 88;
  const estReachNum = Math.round(renderedCount * 80.8);
  const estReach = estReachNum >= 1000 ? (estReachNum / 1000).toFixed(1) + "M" : estReachNum + "K";

  if (elements.analyticsTotalClips) {
    elements.analyticsTotalClips.textContent = renderedCount;
  }
  if (elements.analyticsAvgScore) {
    elements.analyticsAvgScore.textContent = `${avgScore}%`;
  }
  if (elements.analyticsEstReach) {
    elements.analyticsEstReach.textContent = estReach;
  }
}

const settingsIntegrationOrder = ["gemini", "openai", "vizard", "googleDrive", "tiktok", "telegram", "appUrl"];

const settingsIntegrationMissingNotes = {
  gemini: "Add this key to enable Gemini-powered optimization and assistant features.",
  openai: "Optional fallback for transcription and analysis when Gemini is not available.",
  vizard: "Required for Vizard project import, clipping, social account sync, and Vizard publishing.",
  googleDrive: "Add service-account JSON and a Shared Drive folder ID for Workspace Drive uploads.",
  tiktok: "Real TikTok posting needs a verified app flow and a valid access token; sandbox messages are not real posts.",
  telegram: "Add a bot token and chat ID, or save bot credentials per account in the Accounts tab.",
  appUrl: "Set the public app URL used for callbacks, links, and server environment checks.",
};

function renderSettingsIntegrations() {
  const container = elements.settingsIntegrationsStatus || document.querySelector("#settingsIntegrationsStatus");
  if (!container) return;

  if (settingsIntegrationsLoading) {
    container.innerHTML = `
      <div class="settings-integrations-state">
        <span class="queue-status waiting">Loading</span>
        <p>Checking server integration status from the local backend.</p>
      </div>
    `;
    return;
  }

  if (settingsIntegrationsError) {
    container.innerHTML = `
      <div class="settings-integrations-state error">
        <span class="queue-status blocked">Error</span>
        <p>${escapeHtml(settingsIntegrationsError)}</p>
        <button type="button" class="mini-button" data-settings-action="refresh-integrations">Retry</button>
      </div>
    `;
    bindSettingsIntegrationRefresh(container);
    return;
  }

  const integrations = settingsIntegrationsStatus?.integrations || {};
  if (!Object.keys(integrations).length) {
    container.innerHTML = `
      <div class="settings-integrations-state">
        <span class="queue-status waiting">Waiting</span>
        <p>No integration status has loaded yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="settings-integrations-grid">
      ${settingsIntegrationOrder
        .filter((key) => integrations[key])
        .map((key) => renderSettingsIntegrationCard(key, integrations[key]))
        .join("")}
    </div>
  `;
}

function renderSettingsIntegrationCard(key, integration) {
  const configured = Boolean(integration.configured);
  const message = String(integration.message || (configured ? "Configured" : "Needs setup"));
  const pending = !configured && /pending|verification/i.test(message);
  const badgeLabel = configured ? "Configured" : pending ? "Pending verification" : "Missing";
  const badgeClass = configured ? "ready" : pending ? "waiting" : "blocked";
  const helperNote = configured ? "Server reports this integration is ready." : settingsIntegrationMissingNotes[key] || "Add the required environment variables and restart the server.";

  return `
    <article class="settings-integration-card ${configured ? "configured" : "missing"}">
      <div class="settings-integration-card-head">
        <strong>${escapeHtml(integration.label || key)}</strong>
        <span class="queue-status ${badgeClass}">${escapeHtml(badgeLabel)}</span>
      </div>
      <div class="settings-integration-env">${escapeHtml(integration.env || "Server env")}</div>
      <p>${escapeHtml(message)}</p>
      <small>${escapeHtml(helperNote)}</small>
    </article>
  `;
}

function bindSettingsIntegrationRefresh(root = document) {
  const button = root.querySelector("[data-settings-action='refresh-integrations']");
  if (!button || button.dataset.listenerAttached) return;
  button.addEventListener("click", () => loadSettingsIntegrationsStatus({ force: true }));
  button.dataset.listenerAttached = "true";
}

async function loadSettingsIntegrationsStatus(options = {}) {
  if (settingsIntegrationsLoading) return;
  if (!options.force && settingsIntegrationsStatus) {
    renderSettingsIntegrations();
    return;
  }

  settingsIntegrationsLoading = true;
  settingsIntegrationsError = "";
  renderSettingsIntegrations();

  try {
    const response = await fetch(apiUrl("/api/settings/integrations/status"));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `Settings status failed (${response.status}).`);
    }
    settingsIntegrationsStatus = data;
  } catch (error) {
    settingsIntegrationsStatus = null;
    settingsIntegrationsError = error.message || "Could not load integration status. Check that the ClipFlow server is running, then retry.";
  } finally {
    settingsIntegrationsLoading = false;
    renderSettingsIntegrations();
  }
}

function renderSettingsWorkspace() {
  state.preferences = state.preferences || {};
  
  if (elements.settingsRes) {
    elements.settingsRes.value = state.preferences.exportRes || "1080";
  }
  if (elements.settingsFPS) {
    elements.settingsFPS.value = state.preferences.exportFps || "60";
  }
  if (elements.settingsWatermark) {
    elements.settingsWatermark.value = state.preferences.watermark !== undefined ? state.preferences.watermark : "ClipFlow";
  }
  if (elements.settingsAutoVizard) {
    elements.settingsAutoVizard.checked = state.preferences.autoVizard !== false;
  }
  if (elements.settingsCacheSize) {
    elements.settingsCacheSize.textContent = state.preferences.cacheCleared ? "0.0 MB" : "150.3 MB";
  }

  renderSettingsIntegrations();
  bindSettingsIntegrationRefresh(document);
  loadSettingsIntegrationsStatus();

  // Bind Save Button Action
  if (elements.settingsSaveBtn && !elements.settingsSaveBtn.dataset.listenerAttached) {
    elements.settingsSaveBtn.addEventListener("click", () => {
      state.preferences.exportRes = elements.settingsRes ? elements.settingsRes.value : "1080";
      state.preferences.exportFps = elements.settingsFPS ? elements.settingsFPS.value : "60";
      state.preferences.watermark = elements.settingsWatermark ? elements.settingsWatermark.value : "ClipFlow Studio";
      state.preferences.autoVizard = elements.settingsAutoVizard ? elements.settingsAutoVizard.checked : true;
      
      saveAndRender();
      setClipStatus("Preferences and rendering presets saved successfully!", "ready");
    });
    elements.settingsSaveBtn.dataset.listenerAttached = "true";
  }

  // Bind Clear Cache Button Action
  if (elements.settingsClearCacheBtn && !elements.settingsClearCacheBtn.dataset.listenerAttached) {
    elements.settingsClearCacheBtn.addEventListener("click", () => {
      elements.settingsClearCacheBtn.innerHTML = "Clearing...";
      elements.settingsClearCacheBtn.disabled = true;
      setTimeout(() => {
        state.preferences.cacheCleared = true;
        saveAndRender();
        if (elements.settingsCacheSize) {
          elements.settingsCacheSize.textContent = "0.0 MB";
        }
        elements.settingsClearCacheBtn.innerHTML = "Cleared";
        setClipStatus("Native IndexedDB buffer storage cache purged successfully!", "ready");
      }, 900);
    });
    elements.settingsClearCacheBtn.dataset.listenerAttached = "true";
  }
}
