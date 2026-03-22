import { supabase } from './supabase';

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: `${window.location.origin}/auth/callback`
		}
	});

	if (error) return { error: error.message };
	return { error: null };
}

export async function signOut(): Promise<void> {
	await supabase.auth.signOut();
}

export async function getSession() {
	const { data } = await supabase.auth.getSession();
	return data.session;
}
