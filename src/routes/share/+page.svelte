<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	type State = 'idle' | 'recording' | 'transcribing' | 'submitting' | 'done' | 'error';

	let text = '';
	let state: State = 'idle';
	let errorMsg = '';
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let recordingSeconds = 0;
	let recordingInterval: ReturnType<typeof setInterval>;

	onDestroy(() => {
		stopRecording();
		clearInterval(recordingInterval);
	});

	function getWeekStart(): string {
		const d = new Date();
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		d.setDate(diff);
		return d.toISOString().split('T')[0];
	}

	async function submit() {
		if (!text.trim() || state === 'submitting') return;
		state = 'submitting';

		const { data: { session } } = await supabase.auth.getSession();
		if (!session) { goto('/login'); return; }

		const { error } = await supabase
			.from('entries')
			.insert({
				user_id: session.user.id,
				content: text.trim(),
				type: 'text',
				week_start: getWeekStart()
			});

		if (error) {
			errorMsg = 'Something went wrong. Try again.';
			state = 'error';
		} else {
			state = 'done';
		}
	}

	async function startRecording() {
		if (state !== 'idle') return;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioChunks = [];
			mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) audioChunks.push(e.data);
			};

			mediaRecorder.onstop = async () => {
				stream.getTracks().forEach(t => t.stop());
				await transcribeAudio();
			};

			mediaRecorder.start(250);
			state = 'recording';
			recordingSeconds = 0;
			recordingInterval = setInterval(() => { recordingSeconds++; }, 1000);
		} catch {
			errorMsg = 'Microphone access denied.';
			state = 'error';
		}
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
			clearInterval(recordingInterval);
		}
	}

	async function transcribeAudio() {
		state = 'transcribing';

		const blob = new Blob(audioChunks, { type: 'audio/webm' });
		const formData = new FormData();
		formData.append('audio', blob, 'recording.webm');

		try {
			const res = await fetch('/api/transcribe', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) throw new Error('Transcription failed');

			const data = await res.json();
			text = data.text;
			state = 'idle';
		} catch {
			errorMsg = 'Could not transcribe audio. Type it instead?';
			state = 'error';
		}
	}

	function formatTime(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			submit();
		}
	}
</script>

<main class="share-page">
	<div class="share-container" in:fade={{ duration: 600 }}>

		{#if state === 'done'}
			<div class="done-state" in:fade={{ duration: 800 }}>
				<p class="done-msg">Received.</p>
				<button class="back-btn ui-text" on:click={() => goto('/')}>← back</button>
			</div>
		{:else}
			<header class="share-header">
				<button class="back-btn ui-text" on:click={() => goto('/')}>← back</button>
			</header>

			<div class="input-area">
				<label for="entry" class="sr-only">Share something with Nia</label>
				<textarea
					id="entry"
					bind:value={text}
					on:keydown={handleKeydown}
					placeholder="What's been on your mind."
					disabled={state !== 'idle' && state !== 'error'}
					class="entry-textarea"
					rows={10}
					spellcheck="true"
					autofocus
				></textarea>

				{#if state === 'error'}
					<p class="error-msg ui-text" in:fade={{ duration: 300 }}>{errorMsg}</p>
				{/if}

				<div class="controls">
					<!-- Voice button -->
					<div class="voice-area">
						{#if state === 'recording'}
							<button
								class="voice-btn recording ui-text"
								on:click={stopRecording}
								aria-label="Stop recording"
							>
								<span class="rec-dot"></span>
								{formatTime(recordingSeconds)}
							</button>
						{:else if state === 'transcribing'}
							<span class="ui-text transcribing-label">transcribing...</span>
						{:else}
							<button
								class="voice-btn ui-text"
								on:click={startRecording}
								disabled={state !== 'idle' && state !== 'error'}
								aria-label="Record voice note"
							>
								voice
							</button>
						{/if}
					</div>

					<!-- Submit -->
					<button
						class="submit-btn ui-text"
						on:click={submit}
						disabled={!text.trim() || (state !== 'idle' && state !== 'error')}
					>
						{state === 'submitting' ? 'sending...' : 'send'}
					</button>
				</div>

				<p class="hint ui-text">⌘ + Enter to send</p>
			</div>
		{/if}

	</div>
</main>

<style>
	.share-page {
		min-height: 100dvh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--side-padding);
		padding-top: clamp(3rem, 8vw, 5rem);
		background: var(--bg);
	}

	.share-container {
		width: 100%;
		max-width: var(--max-width);
	}

	.share-header {
		margin-bottom: 2.5rem;
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: 0.8125rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		cursor: pointer;
		padding: 0;
		transition: color 300ms ease;
	}

	.back-btn:hover {
		color: var(--accent);
	}

	.input-area {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.entry-textarea {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-letter);
		font-size: clamp(1rem, 2.5vw, 1.125rem);
		line-height: 1.8;
		padding: 0 0 1.5rem 0;
		resize: none;
		outline: none;
		transition: border-color var(--transition-medium);
		caret-color: var(--accent);
	}

	.entry-textarea::placeholder {
		color: var(--text-muted);
		font-style: italic;
	}

	.entry-textarea:focus {
		border-bottom-color: var(--accent-dim);
	}

	.entry-textarea:disabled {
		opacity: 0.5;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.25rem;
	}

	.voice-area {
		display: flex;
		align-items: center;
	}

	.voice-btn {
		background: none;
		border: 1px solid var(--border);
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 300;
		letter-spacing: 0.08em;
		padding: 0.4rem 0.875rem;
		border-radius: 1px;
		cursor: pointer;
		transition: border-color 300ms ease, color 300ms ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.voice-btn:hover:not(:disabled) {
		border-color: var(--accent-dim);
		color: var(--accent);
	}

	.voice-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.voice-btn.recording {
		border-color: #c97b4c;
		color: #c97b4c;
	}

	.rec-dot {
		width: 6px;
		height: 6px;
		background: #c97b4c;
		border-radius: 50%;
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.transcribing-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}

	.submit-btn {
		background: transparent;
		border: 1px solid var(--accent-dim);
		color: var(--accent);
		font-family: var(--font-ui);
		font-size: 0.8125rem;
		font-weight: 300;
		letter-spacing: 0.1em;
		padding: 0.5rem 1.25rem;
		border-radius: 1px;
		cursor: pointer;
		transition: background 300ms ease, opacity 300ms ease;
	}

	.submit-btn:hover:not(:disabled) {
		background: rgba(201, 168, 76, 0.06);
	}

	.submit-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		letter-spacing: 0.04em;
		opacity: 0.6;
	}

	.error-msg {
		font-size: 0.75rem;
		color: #c97b4c;
		letter-spacing: 0.04em;
	}

	.done-state {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding-top: 2rem;
	}

	.done-msg {
		font-family: var(--font-letter);
		font-size: clamp(1.5rem, 5vw, 2rem);
		color: var(--text);
		font-weight: 400;
	}
</style>
