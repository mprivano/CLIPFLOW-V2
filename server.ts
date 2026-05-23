import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geminiApiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const rootDir = __dirname;
const mediaDir = path.join(rootDir, "media");
const uploadDir = path.join(mediaDir, "uploads");
const outputDir = path.join(mediaDir, "outputs");
const audioDir = path.join(mediaDir, "audio");
const transcriptDir = path.join(mediaDir, "transcripts");
const port = 3000;
const ffmpegPath = findBinary("ffmpeg");
const ffprobePath = findBinary("ffprobe");
const openaiApiKey = process.env.OPENAI_API_KEY || "";
const vizardApiKey = process.env.VIZARDAI_API_KEY || "";
const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";
const analysisModel = process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.4-mini";
const maxTranscriptionBytes = 24 * 1024 * 1024;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".webp": "image/webp",
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function start() {
  await fsp.mkdir(uploadDir, { recursive: true });
  await fsp.mkdir(outputDir, { recursive: true });
  await fsp.mkdir(audioDir, { recursive: true });
  await fsp.mkdir(transcriptDir, { recursive: true });

  const server = http.createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (url.pathname === "/api/health") {
        sendJson(response, {
          ok: Boolean(ffmpegPath && ffprobePath),
          ffmpegPath,
          ffprobePath,
          openaiConfigured: Boolean(openaiApiKey),
          geminiConfigured: Boolean(geminiApiKey),
          vizardConfigured: Boolean(vizardApiKey),
          transcriptionModel: geminiApiKey ? "gemini-3.5-flash" : transcriptionModel,
          analysisModel: geminiApiKey ? "gemini-3.5-flash" : analysisModel,
        });
        return;
      }

      if (url.pathname === "/api/clip" && request.method === "POST") {
        const result = await handleClipRequest(request, url);
        sendJson(response, result);
        return;
      }

      const clientVizardKey = request.headers["x-vizard-api-key"] || request.headers["X-Vizard-Api-Key"];
      const activeVizardApiKey = (typeof clientVizardKey === "string" && clientVizardKey.trim()) ? clientVizardKey.trim() : vizardApiKey;

      if (url.pathname === "/api/vizard/clip" && request.method === "POST") {
        const result = await handleVizardClipRequest(request, activeVizardApiKey);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/vizard/project" && request.method === "GET") {
        const result = await handleVizardProjectRequest(url, activeVizardApiKey);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/vizard/social-accounts" && request.method === "GET") {
        const result = await handleVizardSocialAccountsRequest(activeVizardApiKey);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/vizard/publish" && request.method === "POST") {
        const result = await handleVizardPublishRequest(request, activeVizardApiKey);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/tiktok/publish" && request.method === "POST") {
        const result = await handleTikTokPublishRequest(request);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/telegram/publish" && request.method === "POST") {
        const result = await handleTelegramPublishRequest(request);
        sendJson(response, result);
        return;
      }

      if (url.pathname === "/api/delete-media" && request.method === "POST") {
        const result = await handleDeleteMediaRequest(request);
        sendJson(response, result);
        return;
      }

      if (url.pathname.startsWith("/api/proxy-video") && (request.method === "GET" || request.method === "HEAD")) {
        const videoUrlStr = url.searchParams.get("url");
        if (!videoUrlStr) {
          response.writeHead(400);
          response.end("Missing url parameter");
          return;
        }

        try {
          const token = url.searchParams.get("token");
          let currentUrl = videoUrlStr;
          let videoRes: any = null;
          let redirectCount = 0;
          const maxRedirects = 5;

          while (redirectCount < maxRedirects) {
            const fetchHeaders: any = {};
            if (request.headers.range) {
              fetchHeaders["Range"] = request.headers.range;
            }

            // Only send the Authorization token to the initial Google APIs origin.
            // When redirected, the destination storage domain (e.g. *.googleusercontent.com) gets its own secure token in query params,
            // and sending a custom Authorization header causes cross-origin auth errors or access denials.
            if (token && (currentUrl === videoUrlStr || new URL(currentUrl).origin.includes("googleapis.com"))) {
              fetchHeaders["Authorization"] = `Bearer ${token}`;
            }

            // In HEAD requests to our proxy, we still fetch using GET to safely fetch Google Drive redirections and handle headers reliably,
            // but we won't serve the response body down to the client.
            videoRes = await fetch(currentUrl, {
              headers: fetchHeaders,
              redirect: "manual"
            });

            if (videoRes.status >= 300 && videoRes.status < 400) {
              const location = videoRes.headers.get("location");
              if (location) {
                currentUrl = new URL(location, currentUrl).toString();
                redirectCount++;
                continue;
              }
            }
            break;
          }

          if (!videoRes) {
            throw new Error("No response received from proxy target");
          }
          
          const headers: any = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Range",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            "Accept-Ranges": "bytes",
          };

          const contentType = videoRes.headers.get("content-type") || "video/mp4";
          const contentLength = videoRes.headers.get("content-length");
          const contentRange = videoRes.headers.get("content-range");

          if (contentType) headers["Content-Type"] = contentType;
          if (contentLength) headers["Content-Length"] = contentLength;
          if (contentRange) headers["Content-Range"] = contentRange;

          response.writeHead(videoRes.status, headers);

          if (request.method === "GET" && videoRes.body) {
            if (typeof (videoRes.body as any).getReader === "function") {
              const reader = (videoRes.body as any).getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                response.write(value);
              }
            } else if (typeof (videoRes.body as any).pipe === "function") {
              (videoRes.body as any).pipe(response);
              await new Promise((resolve) => {
                response.on("finish", resolve);
                response.on("close", resolve);
              });
            } else if (typeof Symbol.asyncIterator !== "undefined" && (videoRes.body as any)[Symbol.asyncIterator]) {
              for await (const chunk of (videoRes.body as any)) {
                response.write(chunk);
              }
            }
          }
          response.end();
        } catch (err: any) {
          response.writeHead(500);
          response.end(`Proxy error: ${err.message}`);
        }
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error: any) {
      let message = error.message || "Something went wrong";
      const errMsgLower = message.toLowerCase();
      const isVizardPath = request.url && request.url.includes("/vizard");
      if (
        (isVizardPath || errMsgLower.includes("vizard")) &&
        (errMsgLower.includes("own") ||
         errMsgLower.includes("permission") ||
         errMsgLower.includes("workspace") ||
         errMsgLower.includes("belong") ||
         errMsgLower.includes("access") ||
         errMsgLower.includes("authorize") ||
         errMsgLower.includes("api key") ||
         errMsgLower.includes("privilege"))
      ) {
        message = `${message} (Troubleshooting: Vizard API keys are workspace-specific. Please make sure that your VIZARDAI_API_KEY belongs to the exact same Vizard Workspace where this video/project was created. Projects in other workspaces cannot be loaded.)`;
      }
      sendJson(response, { error: message }, 500);
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`ClipFlow local clipper running at http://0.0.0.0:${port}`);
    console.log(`Using ffmpeg: ${ffmpegPath || "not found"}`);
    console.log(`Using ffprobe: ${ffprobePath || "not found"}`);
    console.log(`AI understanding: ${openaiApiKey ? "enabled" : "waiting for OPENAI_API_KEY"}`);
    console.log(`Vizard AI: ${vizardApiKey ? "enabled" : "waiting for VIZARDAI_API_KEY"}`);
  });
}

async function handleClipRequest(request: any, url: any) {
  if (!ffmpegPath || !ffprobePath) {
    throw new Error("FFmpeg is not available. Install ffmpeg and restart the local clipper.");
  }

  const title = url.searchParams.get("title") || "Uploaded video";
  const filename = safeFilename(url.searchParams.get("filename") || "source-video.mp4");
  const clipCount = clamp(Number(url.searchParams.get("clipCount")) || 6, 1, 12);
  const minSeconds = clamp(Number(url.searchParams.get("minSeconds")) || 18, 4, 90);
  const maxSeconds = clamp(Number(url.searchParams.get("maxSeconds")) || 58, minSeconds, 180);
  const uploadId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const sourcePath = path.join(uploadDir, `${uploadId}-${filename}`);

  await writeRequestToFile(request, sourcePath);

  const duration = await probeDuration(sourcePath);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not read the uploaded video duration.");
  }

  const analysisResult = await understandVideo(sourcePath, uploadId, title, duration, {
    clipCount,
    minSeconds,
    maxSeconds,
  });
  const segments = analysisResult.clipPlans.length
    ? analysisResult.clipPlans
    : buildSegments(duration, clipCount, minSeconds, maxSeconds).map((segment, index) => defaultClipPlan(segment, index, title, duration));
  const clips: any[] = [];

  for (const [index, segment] of segments.entries()) {
    const clipId = `${uploadId}-clip-${index + 1}`;
    const outputName = `${clipId}.mp4`;
    const thumbName = `${clipId}.jpg`;
    const outputPath = path.join(outputDir, outputName);
    const thumbPath = path.join(outputDir, thumbName);

    await createVerticalClip(sourcePath, outputPath, segment.start, segment.duration);
    await createThumbnail(outputPath, thumbPath).catch(() => {});

    clips.push({
      id: `real-${clipId}`,
      title: segment.title || clipTitle(title, index),
      caption: segment.caption || clipCaption(index),
      reason: segment.reason || "",
      transcript: segment.transcript || "",
      duration: Math.round(segment.duration),
      start: Math.round(segment.start),
      end: Math.round(segment.start + segment.duration),
      score: segment.score || Math.min(98, 78 + ((index * 7 + Math.round(duration)) % 18)),
      approved: segment.approved ?? index < 2,
      sourceTitle: title,
      videoUrl: `/media/outputs/${outputName}`,
      thumbUrl: `/media/outputs/${thumbName}`,
    });
  }

  return {
    source: {
      title,
      duration: Math.round(duration),
      filename,
      uploadUrl: `/media/uploads/${path.basename(sourcePath)}`,
      audioUrl: analysisResult.audioUrl,
      transcriptUrl: analysisResult.transcriptUrl,
    },
    understanding: analysisResult.understanding,
    clips,
  };
}

async function handleDeleteMediaRequest(request: any) {
  const body = await readJsonRequest(request);
  const requestedPaths = Array.isArray(body.paths) ? body.paths : [];
  const deleted: string[] = [];

  for (const requestedPath of requestedPaths) {
    const filePath = resolveMediaPath(requestedPath);
    if (!filePath) continue;
    await fsp.rm(filePath, { force: true });
    deleted.push(requestedPath);
  }

  return { deleted };
}

async function handleVizardClipRequest(request: any, apiKey: string) {
  if (!apiKey) {
    throw new Error("Vizard API key is not configured. Start the server with VIZARDAI_API_KEY or configure a Vizard API Account.");
  }

  const body = await readJsonRequest(request);
  const videoUrl = String(body.videoUrl || "").trim();
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
    throw new Error("Vizard needs a public YouTube or video URL.");
  }

  const projectName = String(body.title || "ClipFlow Vizard project").slice(0, 120);
  const lang = String(body.lang || "auto");
  const preferLength = normalizePreferLength(body.preferLength);
  const videoType = inferVizardVideoType(videoUrl);
  const payload: any = {
    lang,
    preferLength,
    projectName,
    videoUrl,
    videoType,
    subtitleSwitch: 1,
    headlineSwitch: 1,
  };

  if (videoType === 1) {
    payload.ext = extensionFromUrl(videoUrl);
  }

  const created = await callVizard("/project/create", {
    method: "POST",
    body: payload,
  }, apiKey);

  if (created.code !== 2000 || !created.projectId) {
    throw new Error(created.errMsg || created.msg || "Vizard did not create the project.");
  }

  // Check once immediately to see if it's magically ready
  let result;
  try {
    result = await callVizard(`/project/query/${created.projectId}`, { method: "GET" }, apiKey);
  } catch (e) {
    result = { code: 1000 };
  }

  if (result.code === 2000 && Array.isArray(result.videos) && result.videos.length) {
    const clips = result.videos.map((clip, index) => vizardClipToClipflow(clip, projectName, index));
    return {
      status: "ready",
      source: {
        title: projectName,
        projectId: created.projectId,
        shareLink: result.shareLink || created.shareLink || "",
      },
      understanding: {
        status: "ready",
        summary: `Vizard analyzed the video and returned ${clips.length} clips.`,
        topics: topicsFromVizard(clips),
        transcriptPreview: clips.map((clip) => clip.transcript).filter(Boolean).join(" ").slice(0, 1200),
        segmentCount: clips.length,
        provider: "vizard",
      },
      clips,
    };
  }

  return {
    status: "processing",
    source: {
      title: projectName,
      projectId: created.projectId,
      shareLink: created.shareLink || "",
    },
    understanding: {
      status: "waiting",
      summary: "Vizard has received the video and is processing it.",
      topics: [],
      transcriptPreview: "",
      segmentCount: 0,
      provider: "vizard",
    },
    clips: [],
  };
}

async function handleVizardSocialAccountsRequest(apiKey: string) {
  if (!apiKey) {
    throw new Error("Vizard API key is not configured. Start the server with VIZARDAI_API_KEY or configure a Vizard API Account.");
  }

  const data = await callVizard("/project/social-accounts", { method: "GET" }, apiKey);
  const accounts = Array.isArray(data.publishAccounts) ? data.publishAccounts : [];

  return {
    accounts,
    total: Number(data.total || accounts.length),
  };
}

async function handleVizardProjectRequest(url: any, apiKey: string) {
  if (!apiKey) {
    throw new Error("Vizard API key is not configured. Start the server with VIZARDAI_API_KEY or configure a Vizard API Account.");
  }

  const projectId = String(url.searchParams.get("projectId") || "").trim();
  if (!/^\d+$/.test(projectId)) {
    throw new Error("Choose a saved Vizard project first.");
  }

  const result = await callVizard(`/project/query/${encodeURIComponent(projectId)}`, { method: "GET" }, apiKey);
  if (result.code === 1000) {
    return {
      status: "processing",
      source: {
        projectId,
        title: `Vizard project ${projectId}`,
      },
      understanding: {
        status: "waiting",
        summary: "Vizard is still processing this project.",
        topics: [],
        transcriptPreview: "",
        segmentCount: 0,
        provider: "vizard",
      },
      clips: [],
    };
  }

  if (result.code !== 2000) {
    throw new Error(result.errMsg || result.msg || `Vizard returned status ${result.code}.`);
  }

  const projectName = result.projectName || `Vizard project ${projectId}`;
  const clips = (Array.isArray(result.videos) ? result.videos : []).map((clip, index) => vizardClipToClipflow(clip, projectName, index));

  return {
    status: "ready",
    source: {
      title: projectName,
      projectName,
      projectId: result.projectId || projectId,
      shareLink: result.shareLink || "",
    },
    understanding: {
      status: "ready",
      summary: `Vizard returned ${clips.length} saved clip${clips.length === 1 ? "" : "s"}.`,
      topics: topicsFromVizard(clips),
      transcriptPreview: clips.map((clip) => clip.transcript).filter(Boolean).join(" ").slice(0, 1200),
      segmentCount: clips.length,
      provider: "vizard",
    },
    clips,
  };
}

async function handleVizardPublishRequest(request: any, apiKey: string) {
  if (!apiKey) {
    throw new Error("Vizard API key is not configured. Start the server with VIZARDAI_API_KEY or configure a Vizard API Account.");
  }

  const body = await readJsonRequest(request);
  let finalVideoId = Number(body.finalVideoId);
  const socialAccountId = String(body.socialAccountId || "").trim();
  const videoUrl = String(body.videoUrl || "").trim();
  const title = String(body.title || "").trim();

  if (!socialAccountId) {
    throw new Error("Choose a connected Vizard social account first.");
  }

  let newlyCreatedVideoId: number | null = null;
  let publishSuccessful = false;
  let publishResult: any = null;

  // Attempt direct publish first if a finite valid finalVideoId is supplied
  if (Number.isFinite(finalVideoId) && finalVideoId > 0) {
    try {
      console.log(`Vizard publish: Attempting direct publish with existing finalVideoId ${finalVideoId}`);
      const payload: any = {
        finalVideoId,
        socialAccountId,
        post: String(body.post || "").slice(0, 5000),
        title: String(body.title || "").slice(0, 100),
      };

      if (Number.isFinite(Number(body.publishTime)) && Number(body.publishTime) > Date.now()) {
        payload.publishTime = Number(body.publishTime);
      }

      const result = await callVizard("/project/publish-video", {
        method: "POST",
        body: payload,
      }, apiKey);

      if (result.code === 2000) {
        publishResult = { ok: true, result, vizardVideoId: finalVideoId };
        publishSuccessful = true;
      } else {
        console.warn(`Vizard publish failed with code ${result.code}: ${result.errMsg || result.msg}. Will attempt fallback if video URL is present.`);
        if (!videoUrl) {
          throw new Error(result.errMsg || result.msg || "Vizard could not publish this clip.");
        }
      }
    } catch (err: any) {
      console.warn(`Vizard direct publish error: ${err.message || err}. Will attempt fallback if video URL is present.`);
      if (!videoUrl) {
        throw err;
      }
    }
  }

  // Fallback to upload/create project and publish if not successful yet
  if (!publishSuccessful) {
    if (!videoUrl) {
      throw new Error("This clip does not have a valid Vizard video ID, and no video URL was provided.");
    }

    console.log(`Vizard direct upload/publish: Creating fallback project for URL "${videoUrl}"`);
    const videoType = inferVizardVideoType(videoUrl);
    const payload: any = {
      lang: "auto",
      projectName: title || "Direct TikTok Publish",
      videoUrl: videoUrl,
      videoType: videoType,
      subtitleSwitch: 1,
      headlineSwitch: 1,
    };

    if (videoType === 1) {
      payload.ext = extensionFromUrl(videoUrl);
    }

    const created = await callVizard("/project/create", {
      method: "POST",
      body: payload,
    }, apiKey);

    if (created.code !== 2000 || !created.projectId) {
      throw new Error(created.errMsg || created.msg || "Vizard did not create the project for direct upload.");
    }

    // poll using quick intervals
    const pollResult = await pollVizardProjectQuick(created.projectId, apiKey);
    if (!pollResult.videos || !pollResult.videos.length) {
      throw new Error("Vizard processed the video but returned no sub-clips.");
    }

    finalVideoId = Number(pollResult.videos[0].videoId);
    if (!Number.isFinite(finalVideoId) || finalVideoId <= 0) {
      throw new Error("Vizard processed the video but returned an invalid Video ID.");
    }

    newlyCreatedVideoId = finalVideoId;

    // Now publish the newly created video ID
    const publishPayload: any = {
      finalVideoId,
      socialAccountId,
      post: String(body.post || "").slice(0, 5000),
      title: String(body.title || "").slice(0, 100),
    };

    if (Number.isFinite(Number(body.publishTime)) && Number(body.publishTime) > Date.now()) {
      publishPayload.publishTime = Number(body.publishTime);
    }

    const result = await callVizard("/project/publish-video", {
      method: "POST",
      body: publishPayload,
    }, apiKey);

    if (result.code !== 2000) {
      throw new Error(result.errMsg || result.msg || "Vizard could not publish the fallback clip.");
    }

    publishResult = { ok: true, result, vizardVideoId: newlyCreatedVideoId };
  }

  return publishResult;
}

async function handleTikTokPublishRequest(request: any) {
  const body = await readJsonRequest(request);
  const videoUrl = String(body.videoUrl || "").trim();
  const post = String(body.post || "").trim();
  const title = String(body.title || "").trim();
  const handle = String(body.handle || "").trim();
  const directToken = String(body.directToken || "").trim();

  if (!videoUrl) {
    throw new Error("No video URL provided for direct TikTok posting.");
  }

  console.log(`TikTok Direct - Initiating direct post. Handle: ${handle}, Video Source: ${videoUrl}`);

  // 1. Download video content into a Buffer.
  let videoBuffer: Buffer;
  try {
    if (videoUrl.includes("url=") && videoUrl.includes("token=")) {
      console.log("TikTok Direct - Video source is proxied from Google Drive. Translating credentials...");
      const parsedUrl = new URL(videoUrl);
      const targetUrl = parsedUrl.searchParams.get("url") || "";
      const token = parsedUrl.searchParams.get("token") || "";

      const fetchHeaders: any = {};
      if (token) {
        fetchHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(targetUrl, { headers: fetchHeaders });
      if (!response.ok) {
        throw new Error(`Google Drive download card failed with status ${response.status}`);
      }
      const arrayBuf = await response.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuf);
    } else {
      console.log("TikTok Direct - Fetching direct video URL...");
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Direct download hit status ${response.status}`);
      }
      const arrayBuf = await response.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuf);
    }
  } catch (err: any) {
    throw new Error(`Could not access or download original video clip: ${err.message || err}`);
  }

  const fileSize = videoBuffer.byteLength;
  console.log(`TikTok Direct - Video successfully parsed. File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  // Choose Token
  const activeToken = directToken || process.env.TIKTOK_ACCESS_TOKEN || "";

  // 2. Perform Real TikTok API call or Sandbox Simulator
  if (activeToken) {
    console.log(`TikTok Direct - Access token found. Dispatching to actual TikTok Developer APIs...`);
    // Official TikTok Content Posting API Flow
    try {
      const initUrl = "https://open.tiktokapis.com/v2/post/publish/video/init/";
      const postInfo = {
        title: title || "Short custom clip",
        privacy_level: "PUBLIC_TO_EVERYONE",
        video_cover_timestamp_ms: 1000
      };
      
      const initRes = await fetch(initUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeToken}`,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          post_info: postInfo,
          source_info: {
            source: "FILE_UPLOAD",
            video_size: fileSize,
            chunk_size: fileSize,
            total_chunk_count: 1
          }
        })
      });

      const initData: any = await initRes.json().catch(() => ({}));
      if (!initRes.ok || initData.error) {
        throw new Error(`TikTok registration rejected: ${initData.error?.message || initRes.statusText}`);
      }

      const uploadUrl = initData.data?.upload_url;
      const publishId = initData.data?.publish_id;

      if (!uploadUrl) {
        throw new Error("TikTok init did not offer an upload URL.");
      }

      console.log(`TikTok Direct - Registration OK. Uploading raw binary stream of ${fileSize} bytes...`);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(fileSize),
          "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`
        },
        body: videoBuffer
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct binary segment load returned code: ${uploadRes.status}`);
      }

      console.log(`TikTok Direct - Post uploaded successfully! publishId: ${publishId}`);
      return {
        ok: true,
        message: "Video upload succeeded through TikTok API!",
        publishId,
        direct: true,
        sandbox: false,
      };
    } catch (apiErr: any) {
      console.error("TikTok Direct - Real API error, failing gracefully...", apiErr);
      throw new Error(`TikTok API Rejected Upload: ${apiErr.message || apiErr}`);
    }
  } else {
    // 3. Simulation sandbox fallback mode - perfectly rich and informative
    console.log(`TikTok Direct - [SANDBOX SIMULATOR] Token omitted. Authenticating simulated publish job...`);
    await new Promise((resolve) => setTimeout(resolve, 2200)); // Simulate beautiful network delay

    console.log(`TikTok Direct - [SANDBOX SIMULATOR] Direct publishing to account ${handle} completed successfully!`);
    return {
      ok: true,
      message: "Simulation Completed. TikTok post uploaded to feed successfully!",
      publishId: `sim-pub-${Date.now()}`,
      direct: true,
      sandbox: true,
      debug: {
        fileSize,
        title,
        caption: post,
        handle,
      }
    };
  }
}

async function handleTelegramPublishRequest(request: any) {
  const body = await readJsonRequest(request);
  const videoUrl = String(body.videoUrl || "").trim();
  const post = String(body.post || "").trim();
  const title = String(body.title || "").trim();
  const handle = String(body.handle || "").trim();
  const telegramBotToken = String(body.telegramBotToken || "").trim();
  const telegramChatId = String(body.telegramChatId || "").trim();

  if (!videoUrl) {
    throw new Error("No video URL provided for Telegram delivery.");
  }
  if (!telegramBotToken || !telegramChatId) {
    throw new Error("Telegram bot token and chat ID are required.");
  }

  console.log(`Telegram Bot - Preparing dispatch to Chat ID: ${telegramChatId}. Video source: ${videoUrl}`);

  // 1. Retrieve the video as a Buffer (using local filesystem path optimization when possible)
  let videoBuffer: Buffer;
  try {
    videoBuffer = await getVideoBuffer(videoUrl);
  } catch (err: any) {
    throw new Error(`Could not download or retrieve video clip: ${err.message || err}`);
  }

  const fileSize = videoBuffer.byteLength;
  console.log(`Telegram Bot - Video downloaded/loaded. Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  // 2. Dispatch to Telegram Bot API (sendVideo) using Native FormData
  try {
    const formData = new FormData();
    formData.append("chat_id", telegramChatId);
    
    // Slicing caption at 1000 characters to prevent Telegram's 1024-char limit rejection
    const captionText = post.slice(0, 1000);
    formData.append("caption", captionText);
    
    // We name the file matching the clean clip title or falling back
    const cleanFileName = safeFilename(title ? `${title}.mp4` : "clip.mp4");
    const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
    
    formData.append("video", videoBlob, cleanFileName);

    const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendVideo`, {
      method: "POST",
      body: formData,
    });

    const tgData: any = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !tgData.ok) {
      const description = tgData.description || tgRes.statusText;
      throw new Error(`Telegram error description: "${description}"`);
    }

    console.log(`Telegram Bot - Dispatch delivered successfully! Message ID: ${tgData.result?.message_id}`);
    return {
      ok: true,
      message: "Video and caption successfully sent to your Telegram!",
      messageId: tgData.result?.message_id,
      handle,
    };
  } catch (apiErr: any) {
    console.error("Telegram Bot API send error:", apiErr);
    throw new Error(`Telegram server delivery rejected: ${apiErr.message || apiErr}`);
  }
}

async function getVideoBuffer(videoUrl: string): Promise<Buffer> {
  // If it's a local clip served by our server
  if (videoUrl.includes("/media/")) {
    try {
      const mediaPathPart = videoUrl.substring(videoUrl.indexOf("/media/"));
      const localPath = path.normalize(path.join(rootDir, mediaPathPart));
      if (fs.existsSync(localPath)) {
        console.log(`getVideoBuffer - Reading direct local disk file: ${localPath}`);
        return await fsp.readFile(localPath);
      }
    } catch (err) {
      console.warn(`getVideoBuffer - Local disk file read fallback to fetch...`, err);
    }
  }

  // If it's a Google Drive proxied clip with query parameters
  if (videoUrl.includes("url=") && videoUrl.includes("token=")) {
    console.log("getVideoBuffer - Downloading proxied Google Drive file...");
    const parsedUrl = new URL(videoUrl);
    const targetUrl = parsedUrl.searchParams.get("url") || "";
    const token = parsedUrl.searchParams.get("token") || "";

    const fetchHeaders: any = {};
    if (token) {
      fetchHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(targetUrl, { headers: fetchHeaders });
    if (!response.ok) {
      throw new Error(`Google Drive proxy request failed with status ${response.status}`);
    }
    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  } else {
    // Standard external URL (e.g. public Vizard video URL)
    console.log(`getVideoBuffer - Downloading external video: ${videoUrl}`);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Fetch downloaded video hit status ${response.status}`);
    }
    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}

async function pollVizardProjectQuick(projectId: string, apiKey: string) {
  const attempts = 30; // up to 30 attempts
  const intervalMs = 5000; // 5 seconds interval

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await delay(intervalMs);
    }

    const result = await callVizard(`/project/query/${projectId}`, { method: "GET" }, apiKey);

    if (result.code === 2000 && Array.isArray(result.videos) && result.videos.length) {
      return result;
    }

    if (result.code === 1000) {
      continue;
    }

    throw new Error(result.errMsg || result.msg || `Vizard processing failed with code ${result.code}.`);
  }

  throw new Error("Vizard is taking longer than expected to process the clip. Please try publishing again in a few moments.");
}

async function pollVizardProject(projectId, apiKey) {
  const attempts = Number(process.env.VIZARD_POLL_ATTEMPTS || 40);
  const intervalMs = Number(process.env.VIZARD_POLL_INTERVAL_MS || 30000);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await delay(intervalMs);
    }

    const result = await callVizard(`/project/query/${projectId}`, { method: "GET" }, apiKey);

    if (result.code === 2000 && Array.isArray(result.videos) && result.videos.length) {
      return result;
    }

    if (result.code === 1000) {
      continue;
    }

    throw new Error(result.errMsg || result.msg || `Vizard processing failed with code ${result.code}.`);
  }

  throw new Error("Vizard is still processing. Try again later or increase VIZARD_POLL_ATTEMPTS.");
}

async function callVizard(pathname, options, apiKey) {
  const response = await fetch(`https://elb-api.vizard.ai/hvizard-server-front/open-api/v1${pathname}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      VIZARDAI_API_KEY: apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.errMsg || data.msg || `Vizard request failed with HTTP ${response.status}.`);
  }

  return data;
}

function vizardClipToClipflow(clip, sourceTitle, index) {
  const duration = Math.round(Number(clip.videoMsDuration || 0) / 1000) || 30;
  const score = Number(clip.viralScore || 0);

  return {
    id: `vizard-${clip.videoId || `${Date.now()}-${index}`}`,
    title: clip.title || clipTitle(sourceTitle, index),
    caption: clip.title || clipCaption(index),
    reason: clip.viralReason || "Selected by Vizard AI.",
    transcript: clip.transcript || "",
    duration,
    start: 0,
    end: duration,
    score: score ? Math.round(score * 10) : 85,
    approved: index < 2,
    sourceTitle,
    videoUrl: clip.videoUrl,
    thumbUrl: "",
    vizardVideoId: clip.videoId,
    clipEditorUrl: clip.clipEditorUrl || "",
    provider: "vizard",
  };
}

function inferVizardVideoType(videoUrl) {
  const host = new URL(videoUrl).hostname.replace(/^www\./, "");
  if (host.includes("youtube.com") || host.includes("youtu.be")) return 2;
  if (host.includes("drive.google.com")) return 3;
  if (host.includes("vimeo.com")) return 4;
  if (host.includes("streamyard.com")) return 5;
  if (host.includes("tiktok.com")) return 6;
  if (host.includes("twitter.com") || host.includes("x.com")) return 7;
  if (host.includes("twitch.tv")) return 9;
  if (host.includes("loom.com")) return 10;
  if (host.includes("facebook.com")) return 11;
  if (host.includes("linkedin.com")) return 12;
  return 1;
}

function extensionFromUrl(videoUrl) {
  const extension = path.extname(new URL(videoUrl).pathname).replace(".", "").toLowerCase();
  return ["mp4", "mov", "avi", "3gp"].includes(extension) ? extension : "mp4";
}

function normalizePreferLength(value) {
  const list = Array.isArray(value) ? value : [0];
  const clean = list.map(Number).filter((item) => [0, 1, 2, 3, 4].includes(item));
  if (!clean.length) return [0];
  if (clean.includes(0)) return [0];
  return [...new Set(clean)];
}

function topicsFromVizard(clips) {
  const topics = new Set();

  clips.forEach((clip) => {
    String(clip.reason || clip.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 5)
      .slice(0, 3)
      .forEach((word) => topics.add(word));
  });

  return [...topics].slice(0, 6);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function understandVideo(sourcePath, uploadId, title, duration, options) {
  const hasAI = Boolean(openaiApiKey || geminiApiKey);
  const emptyResult = {
    audioUrl: "",
    transcriptUrl: "",
    transcript: { text: "", segments: [] },
    understanding: {
      status: hasAI ? "not_started" : "needs_key",
      summary: hasAI
        ? "AI understanding has not run yet."
        : "Add GEMINI_API_KEY or OPENAI_API_KEY before starting the local clipper to transcribe and understand videos.",
      topics: [],
      transcriptPreview: "",
      segmentCount: 0,
      transcriptionModel: geminiApiKey ? "gemini-3.5-flash" : transcriptionModel,
      analysisModel: geminiApiKey ? "gemini-3.5-flash" : analysisModel,
    },
    clipPlans: [],
  };

  if (!hasAI) {
    return emptyResult;
  }

  const audioName = `${uploadId}-audio.mp3`;
  const transcriptName = `${uploadId}-transcript.json`;
  const audioPath = path.join(audioDir, audioName);
  const transcriptPath = path.join(transcriptDir, transcriptName);

  try {
    await extractAudio(sourcePath, audioPath);
    const transcript = await transcribeAudio(audioPath);
    const analysis = await analyzeTranscript(title, duration, transcript, options).catch(() => {
      return heuristicAnalysis(title, transcript, options);
    });
    const clipPlans = buildClipPlans(analysis, transcript, duration, options);

    await fsp.writeFile(transcriptPath, JSON.stringify({ transcript, analysis }, null, 2));

    return {
      audioUrl: `/media/audio/${audioName}`,
      transcriptUrl: `/media/transcripts/${transcriptName}`,
      transcript,
      understanding: {
        status: "ready",
        summary: analysis.summary || "Transcript analyzed.",
        topics: Array.isArray(analysis.topics) ? analysis.topics.slice(0, 6) : [],
        transcriptPreview: transcript.text.slice(0, 1200),
        segmentCount: transcript.segments.length,
        transcriptionModel,
        analysisModel,
      },
      clipPlans,
    };
  } catch (error) {
    return {
      ...emptyResult,
      audioUrl: fs.existsSync(audioPath) ? `/media/audio/${audioName}` : "",
      understanding: {
        ...emptyResult.understanding,
        status: "error",
        summary: error.message || "AI understanding failed.",
      },
    };
  }
}

function extractAudio(inputPath, audioPath) {
  return run(ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "32k",
    audioPath,
  ]);
}

async function transcribeAudio(audioPath) {
  const chunks = await audioChunksForTranscription(audioPath);
  const allSegments = [];
  let fullText = "";
  let offset = 0;

  for (const chunkPath of chunks) {
    const result = await transcribeAudioFile(chunkPath);
    const segments = Array.isArray(result.segments) ? result.segments : [];
    const adjusted = segments.map((segment) => ({
      start: roundTime(Number(segment.start || 0) + offset),
      end: roundTime(Number(segment.end || 0) + offset),
      text: String(segment.text || "").trim(),
    })).filter((segment) => segment.text);

    allSegments.push(...adjusted);
    fullText += `${result.text || adjusted.map((segment) => segment.text).join(" ")} `;
    offset += await probeDuration(chunkPath);
  }

  return {
    text: fullText.trim(),
    segments: allSegments,
  };
}

async function audioChunksForTranscription(audioPath) {
  const stat = await fsp.stat(audioPath);
  if (stat.size <= maxTranscriptionBytes) {
    return [audioPath];
  }

  const chunkDir = path.join(audioDir, `${path.basename(audioPath, ".mp3")}-chunks`);
  await fsp.mkdir(chunkDir, { recursive: true });
  const chunkPattern = path.join(chunkDir, "chunk-%03d.mp3");

  await run(ffmpegPath, [
    "-y",
    "-i",
    audioPath,
    "-f",
    "segment",
    "-segment_time",
    "600",
    "-reset_timestamps",
    "1",
    "-c",
    "copy",
    chunkPattern,
  ]);

  const files = await fsp.readdir(chunkDir);
  return files
    .filter((file) => file.endsWith(".mp3"))
    .sort()
    .map((file) => path.join(chunkDir, file));
}

async function transcribeAudioFile(audioPath) {
  if (geminiApiKey && ai) {
    const audioBuffer = await fsp.readFile(audioPath);
    const audioBase64 = audioBuffer.toString("base64");
    
    const prompt = 
      "Please transcribe this audio with precise timestamps. " +
      "Segment the speech naturally into standard sentences or meaningful phrases. " +
      "For each segment, provide its absolute start and end times in seconds, as well as the text. " +
      "You must return the transcription strictly matching the requested JSON format, with a top-level text field for the whole text and a segments array. " +
      "Make sure you never truncate or skip parts of the audio.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: audioBase64,
          },
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "Complete full transcription text"
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start: {
                    type: Type.NUMBER,
                    description: "Start timestamp in seconds of this segment"
                  },
                  end: {
                    type: Type.NUMBER,
                    description: "End timestamp in seconds of this segment"
                  },
                  text: {
                    type: Type.STRING,
                    description: "Transcribed text for this segment"
                  }
                },
                required: ["start", "end", "text"]
              }
            }
          },
          required: ["text", "segments"]
        }
      }
    });

    const resText = response.text;
    if (!resText) {
      throw new Error("Gemini returned empty transcription.");
    }

    try {
      return JSON.parse(resText.trim());
    } catch (e: any) {
      console.error("Failed to parse Gemini transcription JSON:", resText);
      throw new Error(`Failed to parse Gemini JSON transcription: ${e.message}`);
    }
  }

  const body = new FormData();
  const audio = await fsp.readFile(audioPath);

  body.append("file", new Blob([audio], { type: "audio/mpeg" }), path.basename(audioPath));
  body.append("model", transcriptionModel);
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "segment");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Transcription failed.");
  }
  return data;
}

async function analyzeTranscript(title, duration, transcript, options) {
  if (!transcript.text) {
    return heuristicAnalysis(title, transcript, options);
  }

  const transcriptLines = transcript.segments
    .map((segment) => `[${formatSeconds(segment.start)}-${formatSeconds(segment.end)}] ${segment.text}`)
    .join("\n")
    .slice(0, 60000);

  if (geminiApiKey && ai) {
    const prompt = [
      `Video title: ${title}`,
      `Video duration: ${Math.round(duration)} seconds`,
      `Need ${options.clipCount} clips between ${options.minSeconds} and ${options.maxSeconds} seconds.`,
      "Find hooks, surprising claims, concrete advice, emotional moments, product proof, and memorable quotes.",
      "",
      "Transcript segments:",
      transcriptLines,
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: 
          "You are a short-form video editor. " +
          "Choose the most compelling clip moments from the transcript. " +
          "Return JSON that fits the requested schema exactly. " +
          "Keep clips inside the video duration and prefer complete, self-contained thoughts.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Brief summary of the video content"
            },
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Top 3-6 topics/themes of the video"
            },
            clips: {
              type: Type.ARRAY,
              description: "Array of selected best short clips suitable for social media",
              items: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.NUMBER, description: "Start time of the clip in seconds" },
                  end: { type: Type.NUMBER, description: "End time of the clip in seconds" },
                  title: { type: Type.STRING, description: "Compelling hook title for this clip" },
                  caption: { type: Type.STRING, description: "Platform ready caption/description with hashtags" },
                  reason: { type: Type.STRING, description: "Detailed editorial reason/justification why this makes an amazing clip" },
                  score: { type: Type.NUMBER, description: "Viral potential score from 75 to 99" }
                },
                required: ["start", "end", "title", "caption", "reason", "score"]
              }
            }
          },
          required: ["summary", "topics", "clips"]
        }
      }
    });

    const resText = response.text;
    if (!resText) {
      throw new Error("Gemini returned empty analysis response.");
    }
    return JSON.parse(resText.trim());
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: analysisModel,
      instructions: [
        "You are a short-form video editor.",
        "Choose the most compelling clip moments from the transcript.",
        "Return JSON that fits the schema. Keep clips inside the video duration and prefer complete thoughts.",
      ].join(" "),
      input: [
        `Video title: ${title}`,
        `Video duration: ${Math.round(duration)} seconds`,
        `Need ${options.clipCount} clips between ${options.minSeconds} and ${options.maxSeconds} seconds.`,
        "Find hooks, surprising claims, concrete advice, emotional moments, product proof, and memorable quotes.",
        "",
        transcriptLines,
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "clip_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              topics: {
                type: "array",
                items: { type: "string" },
              },
              clips: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    start: { type: "number" },
                    end: { type: "number" },
                    title: { type: "string" },
                    caption: { type: "string" },
                    reason: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["start", "end", "title", "caption", "reason", "score"],
                },
              },
            },
            required: ["summary", "topics", "clips"],
          },
        },
      },
      max_output_tokens: 2600,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Transcript analysis failed.");
  }

  return JSON.parse(extractResponseText(data));
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  throw new Error("Transcript analysis returned no text.");
}

function heuristicAnalysis(title, transcript, options) {
  const scored = transcript.segments
    .map((segment) => ({
      ...segment,
      score: scoreTranscriptSegment(segment.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.clipCount);

  return {
    summary: transcript.text
      ? "Transcript generated. Clip choices use local transcript scoring because AI analysis was not available."
      : "No transcript text was available.",
    topics: inferTopics(transcript.text),
    clips: scored.map((segment, index) => ({
      start: segment.start,
      end: segment.end,
      title: clipTitle(title, index),
      caption: clipCaption(index),
      reason: "Selected because this transcript segment has hook-like language or a complete thought.",
      score: Math.min(98, Math.max(70, segment.score)),
    })),
  };
}

function buildClipPlans(analysis, transcript, duration, options) {
  const plans = [];
  const used = [];

  for (const clip of analysis.clips || []) {
    if (plans.length >= options.clipCount) break;

    const window = normalizeClipWindow(clip.start, clip.end, duration, options.minSeconds, options.maxSeconds);
    const overlap = used.some((item) => rangesOverlap(item, window));
    if (overlap) continue;

    used.push(window);
    plans.push({
      ...window,
      title: clip.title,
      caption: clip.caption,
      reason: clip.reason,
      score: clamp(Math.round(Number(clip.score) || 82), 70, 99),
      transcript: transcriptForWindow(transcript.segments, window.start, window.start + window.duration),
      approved: plans.length < 2,
    });
  }

  if (!plans.length && transcript.segments.length) {
    return heuristicAnalysis("", transcript, options).clips.map((clip, index) => {
      const window = normalizeClipWindow(clip.start, clip.end, duration, options.minSeconds, options.maxSeconds);
      return {
        ...window,
        title: clip.title,
        caption: clip.caption,
        reason: clip.reason,
        score: clip.score,
        transcript: transcriptForWindow(transcript.segments, window.start, window.start + window.duration),
        approved: index < 2,
      };
    });
  }

  return plans;
}

function normalizeClipWindow(start, end, duration, minSeconds, maxSeconds) {
  let cleanStart = clamp(Number(start) || 0, 0, Math.max(0, duration - 1));
  let cleanEnd = clamp(Number(end) || cleanStart + minSeconds, cleanStart + 1, duration);
  let length = cleanEnd - cleanStart;

  if (length < minSeconds) {
    const extra = minSeconds - length;
    cleanStart = Math.max(0, cleanStart - extra / 2);
    cleanEnd = Math.min(duration, cleanEnd + extra / 2);
  }

  length = cleanEnd - cleanStart;
  if (length > maxSeconds) {
    cleanEnd = cleanStart + maxSeconds;
  }

  if (cleanEnd > duration) {
    cleanEnd = duration;
    cleanStart = Math.max(0, cleanEnd - Math.min(maxSeconds, duration));
  }

  return {
    start: roundTime(cleanStart),
    duration: roundTime(Math.max(1, cleanEnd - cleanStart)),
  };
}

function defaultClipPlan(segment, index, title, duration) {
  return {
    ...segment,
    title: clipTitle(title, index),
    caption: clipCaption(index),
    reason: "Evenly spaced fallback clip because AI understanding is not configured yet.",
    transcript: "",
    score: Math.min(98, 78 + ((index * 7 + Math.round(duration)) % 18)),
    approved: index < 2,
  };
}

function scoreTranscriptSegment(text) {
  const lower = String(text).toLowerCase();
  const hookWords = ["why", "how", "mistake", "secret", "best", "worst", "never", "always", "actually", "important", "because", "learned"];
  const wordScore = hookWords.reduce((score, word) => score + (lower.includes(word) ? 5 : 0), 0);
  const lengthScore = Math.min(18, lower.split(/\s+/).filter(Boolean).length);
  const questionScore = lower.includes("?") ? 6 : 0;
  return 68 + wordScore + lengthScore + questionScore;
}

function inferTopics(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 5)
    .filter((word, index, words) => words.indexOf(word) === index)
    .slice(0, 6);
}

function transcriptForWindow(segments, start, end) {
  return segments
    .filter((segment) => segment.end >= start && segment.start <= end)
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
}

function rangesOverlap(a, b) {
  const aEnd = a.start + a.duration;
  const bEnd = b.start + b.duration;
  return Math.max(a.start, b.start) < Math.min(aEnd, bEnd);
}

function buildSegments(duration, clipCount, minSeconds, maxSeconds) {
  const clipDuration = Math.min(duration, Math.max(4, Math.min(minSeconds, maxSeconds)));
  const maxStart = Math.max(0, duration - clipDuration);

  if (maxStart === 0 || clipCount === 1) {
    return [{ start: 0, duration: clipDuration }];
  }

  return Array.from({ length: clipCount }, (_, index) => ({
    start: Math.round((maxStart * index) / (clipCount - 1)),
    duration: clipDuration,
  }));
}

function createVerticalClip(inputPath, outputPath, start, duration) {
  return run(ffmpegPath, [
    "-y",
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

function createThumbnail(inputPath, thumbPath) {
  return run(ffmpegPath, [
    "-y",
    "-ss",
    "0.5",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=360:640:force_original_aspect_ratio=increase,crop=360:640",
    thumbPath,
  ]);
}

async function probeDuration(filePath: string) {
  const output = await run(ffprobePath!, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ]);
  return Number(JSON.parse(output).format.duration);
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.split("\n").slice(-8).join("\n").trim() || `${command} failed`));
    });
  });
}

function writeRequestToFile(request: any, filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    request.pipe(stream);
    request.on("error", reject);
    stream.on("error", reject);
    stream.on("finish", () => resolve());
  });
}

function readJsonRequest(request: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("error", reject);
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
  });
}

function resolveMediaPath(mediaUrl) {
  if (typeof mediaUrl !== "string") return null;

  const pathname = new URL(mediaUrl, "http://clipflow.local").pathname;
  const allowed = [
    "/media/audio/",
    "/media/outputs/",
    "/media/transcripts/",
    "/media/uploads/",
  ].some((prefix) => pathname.startsWith(prefix));
  if (!allowed) return null;

  const filePath = path.normalize(path.join(rootDir, pathname));
  if (!filePath.startsWith(mediaDir)) return null;

  return filePath;
}

async function serveStatic(requestPath, response) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath = path.normalize(path.join(rootDir, cleanPath === "/" ? "index.html" : cleanPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
    });
    fs.createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function findBinary(name) {
  const envName = `${name.toUpperCase()}_PATH`;
  const candidates = [
    process.env[envName],
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    name,
  ].filter(Boolean);

  return candidates.find((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function safeFilename(filename) {
  const parsed = path.parse(filename);
  const extension = parsed.ext || ".mp4";
  const name = parsed.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "source-video";
  return `${name}${extension}`;
}

function clipTitle(sourceTitle, index) {
  const labels = [
    "Opening hook",
    "Best insight",
    "Proof moment",
    "Fast takeaway",
    "Quote clip",
    "Closing punch",
  ];
  return `${labels[index % labels.length]} from ${sourceTitle}`;
}

function clipCaption(index) {
  const captions = [
    "A short-ready moment pulled from the source video.",
    "Clean vertical cut with platform-ready framing.",
    "Review this clip, then send it to the queue.",
  ];
  return captions[index % captions.length];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTime(value) {
  return Math.round(Number(value) * 10) / 10;
}

function formatSeconds(value) {
  const minutes = Math.floor(Number(value) / 60);
  const seconds = String(Math.floor(Number(value) % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
