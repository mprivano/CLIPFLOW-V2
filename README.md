# ClipFlow

A local MVP for a platform that turns long-form video sources into short-form clip candidates, routes approved clips to multiple social accounts, and shows the publishing queue with platform-readiness gates.

## Open The App

For real video clipping, install FFmpeg, then run:

```bash
npm start
```

For transcription and AI clip selection, start it with an OpenAI API key:

```bash
OPENAI_API_KEY="your_api_key_here" npm start
```

If a preview server is already using that port, choose another local port:

```bash
PORT=5059 OPENAI_API_KEY="your_api_key_here" npm start
```

For Vizard AI clipping, start it with a Vizard API key:

```bash
VIZARDAI_API_KEY="your_vizard_key_here" npm start
```

For Gemini-powered Optimization suggestions:

1. Go to Google AI Studio.
2. Create a Gemini API key.
3. Create or edit `.env` in the project root.
4. Add:

```bash
GEMINI_API_KEY=your_key_here
```

5. Restart ClipFlow.

Do not commit `.env`.

Open `http://127.0.0.1:5059` in a browser, or use the port you started it with. The app saves demo state in local storage.

## Link Accounts And Publish

The fastest real publishing path is through Vizard's connected social accounts:

1. Open the Accounts panel and choose **Link**.
2. In Vizard, connect TikTok, Instagram, and YouTube accounts from Social Accounts.
3. Return to ClipFlow and choose **Sync**.
4. Generate Vizard clips from a YouTube/public video URL.
5. Approve the clips you want to publish.
6. Choose **Publish approved** to send each approved clip to every selected connected account.

Vizard handles the account OAuth and platform posting. ClipFlow uses the connected account IDs returned by Vizard, then calls Vizard's publish endpoint for each approved clip.

## Vizard Video Library

The **Videos** section keeps a local library of Vizard projects created through ClipFlow. Each project shows the generated videos, lets you preview them, and can load that project back into the Clip desk. Use **Refresh** to re-query saved Vizard project IDs and update temporary video links.

Vizard's public API retrieves output videos by `projectId`; it does not currently expose a documented endpoint for listing every project in a workspace. Projects created outside ClipFlow need to be opened in Vizard unless their project ID has been saved here.

## What This MVP Does

- Accepts a YouTube URL, video title, or local video file reference.
- Cuts uploaded local videos into vertical MP4 clips when the local clipper is running.
- Transcribes and analyzes videos when the local clipper starts with `OPENAI_API_KEY`.
- Sends YouTube/public video URLs to Vizard AI when the local server starts with `VIZARDAI_API_KEY`.
- Deletes selected source videos, generated clips, and local output files from the workspace.
- Generates simulated short-form clip candidates with titles, captions, durations, timestamps, and scores.
- Lets an operator approve clips, remix candidates, and filter the review desk.
- Tracks TikTok, Instagram, and YouTube Shorts account connection states.
- Builds a publishing queue for approved clips across selected accounts.
- Shows whether queued jobs are ready or blocked by OAuth / platform review.

## Production Build Notes

This version is a polished local prototype. A real platform would need a backend media pipeline and official platform integrations:

- Source ingest: only process videos the user owns or has permission to repurpose. Prefer original file upload or an authorized YouTube channel connection. YouTube's Data API can manage uploads and metadata, but it is not a general-purpose downloader for arbitrary YouTube URLs.
- Clip generation: store originals in object storage, run transcription, scene detection, highlight scoring, vertical crop detection, caption burn-in, and FFmpeg export as background jobs.
- AI understanding: extract audio, transcribe it with timestamped segments, analyze the transcript for hooks and useful moments, then pass selected timestamps to FFmpeg.
- Vizard provider: send a public video URL to Vizard, poll for clips, then import Vizard's transcript, viral score, viral reason, and clip URL into the same review desk.
- Vizard publishing: sync connected social accounts from Vizard and publish approved generated clips to selected accounts through Vizard.
- TikTok: use TikTok's Content Posting API. Direct Post requires an app configuration and review/audit before public publishing is available beyond constrained/sandbox flows.
- Instagram: use Meta's Instagram Platform content publishing flow for professional accounts. Reels publishing is a container creation plus publish step and requires the right account type, permissions, OAuth, and app review.
- YouTube Shorts: use the YouTube Data API upload flow for authorized channel uploads, then apply Shorts-ready exports, metadata, and channel-level OAuth scopes.
- Publishing: each platform needs token refresh, retry logic, media validation, rate-limit handling, audit logs, and per-account consent.
- Compliance: keep rights confirmation, creator consent, caption review, brand-safety review, and a takedown workflow.

## Useful Official Docs

- TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started/
- Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- YouTube Data API videos resource: https://developers.google.com/youtube/v3/docs/videos
- YouTube Data API upload guide: https://developers.google.com/youtube/v3/guides/uploading_a_video
