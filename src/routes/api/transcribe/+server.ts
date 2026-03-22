import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ELEVENLABS_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const audio = formData.get('audio') as File | null;

	if (!audio) {
		throw error(400, 'No audio file');
	}

	// ElevenLabs Speech-to-Text
	const el = new FormData();
	el.append('file', audio, 'recording.webm');
	el.append('model_id', 'scribe_v1');

	const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
		method: 'POST',
		headers: {
			'xi-api-key': ELEVENLABS_API_KEY
		},
		body: el
	});

	if (!response.ok) {
		const msg = await response.text();
		console.error('ElevenLabs STT error:', msg);
		throw error(502, 'Transcription failed');
	}

	const data = await response.json();
	const text = data.text ?? data.transcription ?? '';

	return json({ text });
};
