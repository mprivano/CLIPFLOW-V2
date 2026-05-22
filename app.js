import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const storageKey = "clipflow-studio-state-v1";

let googleUser = null;
let cachedAccessToken = null;
let isSigningIn = false;
let gdriveFiles = [];
let gdriveFolders = [];
let isGDriveLoading = false;
let gdriveError = null;
let systemVizardConfigured = false;
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
};

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
        setClipStatus(`Imported ${state.clips.length} Vizard clips.`, "ready");
      }
    } else if (file && state.source.clippingProvider === "local") {
      setProcessing(true);
      setClipStatus("Transcribing, understanding, and cutting the video locally. This can take a few minutes.", "ready");
      const result = await createRealClips(file);
      state.clips = result.clips;
      state.understanding = result.understanding;
      setClipStatus(`Created ${state.clips.length} real clips from ${file.name}.`, "ready");
    } else {
      state.clips = generateClips();
      state.understanding = null;
      setClipStatus("Generated demo candidates. Select a video file when you want real cuts.", "");
    }
    state.queue = [];
    saveAndRender();
    triggerAutoBackupToGoogleDrive(state.clips);
  } catch (error) {
    setClipStatus(error.message || "Could not create clips.", "error");
  } finally {
    setProcessing(false);
  }
});

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

  const allSections = [secStudio, secAccounts, secVizardAccounts, secGDrive, secQueue, secVizardLibrary];
  allSections.forEach(s => { if (s) s.style.display = "none"; });

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
  } else if (hash === "#queue") {
    if (secQueue) secQueue.style.display = "grid";
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
  const account = state.accounts.find((item) => item.id === action.dataset.accountId);
  if (!account) return;

  if (action.dataset.accountAction === "connect") {
    window.open(vizardSocialAccountsUrl, "_blank", "noreferrer");
  }

  saveAndRender();
});

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
          if (!cachedAccessToken) {
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
      loadVizardProjectIntoDesk(project);
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
  Object.assign(state, createInitialState());
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
      autoGDriveBackup: true
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
    clips: [],
    accounts: baseAccounts.map((account) => ({ ...account })),
    vizardProjects: [],
    queue: [],
    vizardApiAccounts: [],
    activeVizardAccountId: "system",
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.source && Array.isArray(saved.accounts)) {
      const clips = normalizeClips(saved.clips || []);
      return {
        ...createInitialState(),
        ...saved,
        accounts: normalizeAccounts(saved.accounts),
        clips,
        vizardProjects: normalizeVizardProjects(saved.vizardProjects || [], clips, saved.source || {}),
      };
    }
  } catch (error) {
    console.warn("Unable to load saved studio state", error);
  }
  return createInitialState();
}

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
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
  renderGDrive();
}

function renderClips() {
  const clips = getFilteredClips();
  elements.clipGrid.innerHTML = "";

  if (!clips.length) {
    elements.clipGrid.appendChild(elements.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  clips.forEach((clip) => {
    const article = document.createElement("article");
    article.className = `clip-card ${clip.approved ? "approved" : "review"}`;
    const videoSrc = assetUrl(clip.videoUrl || clip.clipEditorUrl);
    const isBackedUp = (state.gdriveBackedUpUrls && state.gdriveBackedUpUrls.includes(clip.videoUrl)) || clip.gdriveBackedUp || (clip.videoUrl && state.gdriveBackedUpUrls?.includes(clip.videoUrl));
    
    const media = clip.videoUrl
      ? `<div class="click-to-play-wrapper" data-video-src="${escapeHtml(videoSrc)}" data-editor-url="${escapeHtml(clip.clipEditorUrl || clip.videoUrl)}" style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #0f172a; border-radius: 6px 6px 0 0; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${clip.thumbUrl ? `<img src="${escapeHtml(assetUrl(clip.thumbUrl))}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #0f172a); position: absolute; inset: 0;"></div>`}
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
    article.innerHTML = `
      ${media}
      <div class="clip-body">
        <div class="clip-topline">
          <span class="clip-state ${clip.approved ? "approved" : "review"}">${clip.approved ? "Approved" : "Review"}</span>
          <span class="queue-meta">${formatTime(clip.start)}-${formatTime(clip.end)}</span>
        </div>
        <div>
          <h3>${escapeHtml(clip.title)}</h3>
          <p>${escapeHtml(clip.caption)}</p>
          ${clip.reason ? `<p class="clip-reason">${escapeHtml(clip.reason)}</p>` : ""}
          ${clip.transcript ? `<details class="transcript-snippet"><summary>Transcript</summary><p>${escapeHtml(clip.transcript)}</p></details>` : ""}
        </div>
        <div class="score-row">
          <div class="score-meter" aria-label="Virality score ${clip.score}">
            <span style="--score: ${clip.score}%"></span>
          </div>
          <strong>${clip.score}</strong>
          <span class="queue-meta">${clip.duration}s</span>
        </div>
        <div class="clip-actions" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 10px;">
          ${clip.platforms.map((platform) => `<span class="platform-chip ${platformClass(platform)}">${platform}</span>`).join("")}
          <button class="mini-button ${clip.approved ? "active" : ""}" type="button" data-action="approve" data-clip-id="${clip.id}">
            ${clip.approved ? "Approved" : "Approve"}
          </button>
          <button class="mini-button" type="button" data-action="duplicate" data-clip-id="${clip.id}">Remix</button>
          <button class="mini-button danger" type="button" data-action="delete" data-clip-id="${clip.id}">Delete</button>
        </div>
      </div>
    `;
    elements.clipGrid.appendChild(article);
  });
}

function renderAccounts() {
  elements.accountList.innerHTML = "";
  state.accounts.forEach((account) => {
    const ready = isPublishReadyAccount(account);
    const actionLabel = account.vizardSocialAccountId ? (ready ? "Connected" : "Reconnect") : "Link";
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
        <button class="mini-button ${ready ? "active" : ""}" type="button" data-account-action="connect" data-account-id="${account.id}">
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
        <small>${escapeHtml(job.platform)} ${escapeHtml(job.handle)} - ${escapeHtml(job.scheduledFor)}</small>
        ${job.error ? `<small class="queue-error">${escapeHtml(job.error)}</small>` : ""}
      </div>
      <span class="queue-status ${job.statusType}">${escapeHtml(job.status)}</span>
    `;
    elements.queueTable.appendChild(row);
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
    const accounts = (data.accounts || [])
      .filter((account) => account.id)
      .map((account) => {
        const mapped = mapVizardAccount(account);
        const saved = savedById.get(mapped.id);
        return {
          ...mapped,
          enabled: saved?.enabled ?? mapped.connected,
        };
      });

    state.accounts = accounts.length ? accounts : baseAccounts.map((account) => ({ ...account }));
    saveAndRender();
    setClipStatus(
      accounts.length
        ? `Synced ${accounts.length} connected Vizard account${accounts.length === 1 ? "" : "s"}.`
        : "No Vizard accounts found yet. Use Link, connect accounts in Vizard, then sync.",
      accounts.length ? "ready" : "",
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
    setClipStatus("Vizard video library refreshed. Currently loaded project highlights updated!", "ready");
  } else {
    setClipStatus("Vizard video library refreshed.", "ready");
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
        loadVizardProjectIntoDesk(savedProject);
        setClipStatus(`Retrieved ${savedProject.clips.length} video${savedProject.clips.length === 1 ? "" : "s"} from Vizard project ${projectId}.`, "ready");
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
    state.vizardProjects[existingIndex] = {
      ...state.vizardProjects[existingIndex],
      ...project,
      createdAt: state.vizardProjects[existingIndex].createdAt || project.createdAt,
    };
    return;
  }

  state.vizardProjects.unshift(project);
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

function loadVizardProjectIntoDesk(project) {
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
  setClipStatus(`Loaded ${state.clips.length} Vizard video${state.clips.length === 1 ? "" : "s"} into the clip desk.`, "ready");
  triggerAutoBackupToGoogleDrive(state.clips);
  location.hash = "#studio";
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
  setClipStatus(
    failed
      ? `${failed} post${failed === 1 ? "" : "s"} need attention. Check the queue.`
      : "All approved clips were sent to the selected accounts.",
    failed ? "error" : "ready",
  );
}

function createPublishJob(clip, account) {
  const accountStatus = getQueueStatus(account);
  const missingClipId = !clip.vizardVideoId;
  const blocked = accountStatus.type === "blocked" || missingClipId;

  return {
    id: createId("job"),
    clipId: clip.id,
    clipTitle: clip.title,
    platform: account.platform,
    handle: account.handle,
    finalVideoId: clip.vizardVideoId || "",
    socialAccountId: account.vizardSocialAccountId || "",
    post: clip.caption || clip.title || "",
    title: clip.title || clip.caption || "Short video",
    status: missingClipId ? "Vizard clip needed" : accountStatus.label,
    statusType: blocked ? "blocked" : "ready",
    scheduledFor: "Now",
  };
}

async function publishJob(job) {
  const response = await fetch(apiUrl("/api/vizard/publish"), {
    method: "POST",
    headers: getVizardHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      finalVideoId: job.finalVideoId,
      socialAccountId: job.socialAccountId,
      post: job.post,
      title: job.title,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Vizard could not publish this post.");
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
  return Boolean(account.vizardSocialAccountId && account.connected && account.gate === "ready");
}

function normalizeAccounts(accounts) {
  const savedById = new Map(accounts.map((account) => [account.id, account]));
  const normalized = baseAccounts.map((account) => {
    const saved = savedById.get(account.id);
    if (!saved || !saved.vizardSocialAccountId) {
      return {
        ...account,
        enabled: saved?.enabled ?? account.enabled,
      };
    }
    return {
      ...account,
      ...saved,
    };
  });

  accounts.forEach((account) => {
    if (!savedById.has(account.id) || baseAccounts.some((baseAccount) => baseAccount.id === account.id)) {
      return;
    }
    normalized.push(account);
  });

  return normalized;
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

function apiUrl(pathname) {
  return pathname;
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
// Google Drive & Firebase Auth Integration
// ==========================================

let app = null;
let auth = null;
let provider = null;
let firebaseInitializedPromise = null;

async function ensureFirebaseInitialized() {
  if (firebaseInitializedPromise) return firebaseInitializedPromise;

  firebaseInitializedPromise = (async () => {
    try {
      const configRes = await fetch("./firebase-applet-config.json");
      const firebaseConfig = await configRes.json();
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive.readonly");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
      provider.addScope("https://www.googleapis.com/auth/userinfo.email");
      provider.setCustomParameters({
        prompt: "select_account"
      });

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          googleUser = user;
        } else {
          googleUser = null;
          cachedAccessToken = null;
          gdriveFiles = [];
          gdriveError = null;
        }
        renderGDrive();
      });
    } catch (err) {
      console.error("Failed to initialize Firebase:", err);
      firebaseInitializedPromise = null; // Reset to allow retry
      throw err;
    }
  })();

  return firebaseInitializedPromise;
}

// Start background initialization instantly
ensureFirebaseInitialized().catch(err => {
  console.error("Background Firebase initialization failed:", err);
});

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
  
  if (!res.ok) {
    console.warn("Failed to upload GDrive metadata file:", await res.text());
  }
}

const liveUploadingUrls = new Set();

async function getOrCreateGDriveSubFolder(folderName, parentFolderId) {
  if (!cachedAccessToken) {
    throw new Error("Log in required to create folders.");
  }
  if (!folderName.trim()) {
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
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        console.log("Found existing GDrive subfolder:", folderName, searchData.files[0].id);
        return searchData.files[0].id;
      }
    }
  } catch (searchErr) {
    console.warn("Error searching for existing subfolder:", searchErr);
  }

  return await createGDriveSubFolder(folderName, parentFolderId);
}

async function uploadClipToGoogleDrive(clip) {
  if (!cachedAccessToken) {
    setClipStatus("Please sign in to Google Drive under the Google Drive tab first!", "error");
    location.hash = "#google-drive";
    return;
  }

  const videoUrl = clip.videoUrl;
  if (!videoUrl) return;

  const clipId = clip.id;
  // STRICT deduplication to prevent parallel / duplicate uploads for the same video Url or Clip ID
  if (liveUploadingUrls.has(videoUrl) || liveUploadingClipIds.has(clipId)) return;
  
  state.gdriveBackedUpUrls = state.gdriveBackedUpUrls || [];
  if (state.gdriveBackedUpUrls.includes(videoUrl)) {
    clip.gdriveBackedUp = true;
    return;
  }

  liveUploadingUrls.add(videoUrl);
  liveUploadingClipIds.add(clipId);
  renderClips();

  try {
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
      if (fileSearchRes.ok) {
        const fileSearchData = await fileSearchRes.json();
        if (fileSearchData.files && fileSearchData.files.length > 0) {
          existingFileId = fileSearchData.files[0].id;
          console.log("Found existing MP4 on GDrive, using fileId:", existingFileId);
        }
      }
    } catch (fileSearchErr) {
      console.warn("Error searching for existing MP4 file:", fileSearchErr);
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

      const isBlobLocal = videoUrl.startsWith("/media") || videoUrl.startsWith("/") || videoUrl.startsWith(location.origin);
      const downloadUrl = isBlobLocal ? videoUrl : `/api/proxy-video?url=${encodeURIComponent(videoUrl)}&token=${encodeURIComponent(cachedAccessToken)}`;

      const videoRes = await fetch(downloadUrl);
      if (!videoRes.ok) {
        throw new Error(`Failed to download video file: ${videoRes.statusText}`);
      }
      const videoBlob = await videoRes.blob();

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

    setClipStatus(`Successfully saved clip "${clip.title}" inside folder!`, "ready");

    liveUploadingClipIds.delete(clipId);
    liveUploadingUrls.delete(videoUrl);

    // Track successfully backed up urls in local persistent state
    if (!state.gdriveBackedUpUrls.includes(videoUrl)) {
      state.gdriveBackedUpUrls.push(videoUrl);
    }

    // Update in stored clips so it doesn't try to auto-upload again
    const clipIndex = state.clips.findIndex((item) => item.id === clipId || item.videoUrl === videoUrl);
    if (clipIndex >= 0) {
      state.clips[clipIndex].gdriveBackedUp = true;
      if (gdriveFileId) {
        state.clips[clipIndex].gdriveFileId = gdriveFileId;
      }
    }

    // Update in Vizard projects library if applicable
    state.vizardProjects.forEach((proj) => {
      const projClipIndex = proj.clips?.findIndex((item) => item.id === clipId || item.videoUrl === videoUrl);
      if (projClipIndex >= 0) {
        proj.clips[projClipIndex].gdriveBackedUp = true;
        if (gdriveFileId) {
          proj.clips[projClipIndex].gdriveFileId = gdriveFileId;
        }
      }
    });

    saveAndRender();

    // Dynamically refresh listed drive files
    await triggerGDriveLoad();
  } catch (err) {
    console.error("GDrive upload failure:", err);
    setClipStatus(`Backup failed: ${err.message}`, "error");
    liveUploadingClipIds.delete(clipId);
    liveUploadingUrls.delete(videoUrl);
    renderClips();
  }
}

function triggerAutoBackupToGoogleDrive(clips) {
  state.preferences = state.preferences || { autoGDriveBackup: true };
  if (!state.preferences?.autoGDriveBackup || !cachedAccessToken) return;

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
  if (!cachedAccessToken) {
    throw new Error("No active Google Drive access token. Please sign in.");
  }
  try {
    const parentId = (state.preferences && state.preferences.gdriveFolderId) || "root";
    
    // 1. Fetch direct folders under parent
    const folderQuery = `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const folderUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime)&pageSize=40`;
    const folderRes = await fetch(folderUrl, { headers: { Authorization: `Bearer ${cachedAccessToken}` } });
    if (folderRes.status === 401) {
      cachedAccessToken = null;
      throw new Error("Session expired or unauthorized. Please sign in again.");
    }
    const folderData = folderRes.ok ? await folderRes.json() : { files: [] };
    const childFolders = folderData.files || [];

    // 2. Fetch direct files under parent (to capture legacy direct uploaded mp4s)
    const directFileQuery = `mimeType = 'video/mp4' and '${parentId}' in parents and trashed = false`;
    const directFileUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(directFileQuery)}&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,size,modifiedTime,description)&pageSize=40`;
    const directFileRes = await fetch(directFileUrl, { headers: { Authorization: `Bearer ${cachedAccessToken}` } });
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

    // Sort compiledFiles by modifiedTime desc
    compiledFiles.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

    return compiledFiles;
  } catch (err) {
    console.error("Error inside fetchGDriveFiles:", err);
    throw err;
  }
}

async function fetchGDriveFolders() {
  if (!cachedAccessToken) return [];
  try {
    const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=name%20asc&fields=files(id,name)&pageSize=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    });
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
  if (!cachedAccessToken) {
    throw new Error("Log in required to create folders.");
  }
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

  // Toggle visibility of panel heading actions
  if (googleUser && cachedAccessToken) {
    if (elements.refreshGDrive) elements.refreshGDrive.style.display = "inline-flex";
    if (elements.gdriveLogout) elements.gdriveLogout.style.display = "inline-flex";
  } else {
    if (elements.refreshGDrive) elements.refreshGDrive.style.display = "none";
    if (elements.gdriveLogout) elements.gdriveLogout.style.display = "none";
  }

  // If no auth, show standard Sign-In screen
  if (!googleUser || !cachedAccessToken) {
    elements.gdriveContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px 16px; text-align: center;">
        <div aria-hidden="true" style="margin-bottom: 16px; font-size: 3rem;">📂</div>
        <h3>Access Synced Videos</h3>
        <p style="margin-bottom: 24px; color: var(--muted); max-width: 440px; margin-left: auto; margin-right: auto;">
          Connect Google Drive to access all Mp4 videos synced from Vizard directly inside ClipFlow, without having to leave the app!
        </p>
        <button class="gsi-material-button" id="gdriveLoginBtn" type="button" style="align-self: center; background-color: white; border: 1px solid #747775; border-radius: 4px; box-sizing: border-box; color: #1f1f1f; cursor: pointer; font-family: 'Open Sans', arial, sans-serif; font-size: 14px; font-weight: 500; height: 40px; justify-content: center; letter-spacing: 0.25px; outline: none; overflow: hidden; padding: 0 12px; position: relative; text-align: center; transition: background-color .218s, border-color .218s, box-shadow .218s; user-select: none; width: auto; display: inline-flex; align-items: center; gap: 8px;">
          <div class="gsi-material-button-icon" style="height: 20px; min-width: 20px; width: 20px; display: flex; align-items: center; justify-content: center;">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display: block; width: 20px; height: 20px;">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
          </div>
          <span class="gsi-material-button-contents">Sign in with Google</span>
        </button>
      </div>
    `;
    const btn = elements.gdriveContainer.querySelector("#gdriveLoginBtn");
    if (btn) btn.addEventListener("click", handleGDriveLogin);
    return;
  }

  // Set default preference if missing
  state.preferences = state.preferences || { autoGDriveBackup: true };

  const currentFolderName = state.preferences.gdriveFolderName || "Entire Drive Root";
  const currentFolderId = state.preferences.gdriveFolderId || "root";

  // Generate top layout header for logged-in UI
  const headerHTML = `
    <div style="margin-bottom: 14px; font-size: 0.85rem; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <span>Connected: <strong>${escapeHtml(googleUser.displayName || googleUser.email)}</strong></span>
      <span>Total listed documents: <strong style="color: var(--ink);">${gdriveFiles.length} MP4s</strong></span>
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
            <option value="root" ${currentFolderId === "root" ? "selected" : ""}>📁 Entire Drive (Root)</option>
            ${gdriveFolders.map(folder => `
              <option value="${escapeHtml(folder.id)}" ${currentFolderId === folder.id ? "selected" : ""}>📁 ${escapeHtml(folder.name)}</option>
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
          const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)}&token=${encodeURIComponent(cachedAccessToken)}`;
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
      state.preferences.gdriveFolderId = selectedId;
      if (selectedId === "root") {
        state.preferences.gdriveFolderName = "Entire Drive Root";
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
  try {
    isSigningIn = true;
    await ensureFirebaseInitialized();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential && credential.accessToken) {
      cachedAccessToken = credential.accessToken;
      googleUser = result.user;
      gdriveError = null;
      await triggerGDriveLoad();
      // Auto-upload existing non-backed-up clips in the active list
      if (state.clips && state.clips.length) {
        triggerAutoBackupToGoogleDrive(state.clips);
      }
    } else {
      throw new Error("Failed to receive Google access token from popup.");
    }
  } catch (err) {
    console.error("Popup Error:", err);
    gdriveError = err.message || "Sign in failed.";
    renderGDrive();
  } finally {
    isSigningIn = false;
  }
}

async function handleGDriveLogout() {
  try {
    await ensureFirebaseInitialized();
    await signOut(auth);
    googleUser = null;
    cachedAccessToken = null;
    gdriveFiles = [];
    gdriveError = null;
    renderGDrive();
  } catch (err) {
    console.error("Sign out error:", err);
  }
}

async function triggerGDriveLoad() {
  if (!cachedAccessToken) return;
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
    }
  } finally {
    isGDriveLoading = false;
    renderGDrive();
  }
}

function handleGDriveImport(file) {
  const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)}&token=${encodeURIComponent(cachedAccessToken)}`;
  
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

  // Flow smoothly up to the clip candidates section
  const studioGrid = document.getElementById("studio");
  if (studioGrid) {
    studioGrid.scrollIntoView({ behavior: "smooth" });
  }
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
              loadVizardProjectIntoDesk(updated);
            }
          }
          setClipStatus(`Vizard project "${project.projectName || project.projectId}" is ready! ${data.clips.length} clip(s) imported.`, "ready");
          saveAndRender();
        } else if (data && data.status === "error") {
          project.status = "error";
          project.error = data.error || "Generation failed";
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

