export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					created_at: string;
					timezone: string;
					subscription_status: 'trial' | 'active' | 'cancelled';
					trial_ends_at: string;
					stripe_customer_id: string | null;
					stripe_subscription_id: string | null;
				};
				Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'> & {
					created_at?: string;
				};
				Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
			};
			letters: {
				Row: {
					id: string;
					user_id: string;
					content: string;
					delivered_at: string;
					week_start: string;
					created_at: string;
				};
				Insert: Omit<Database['public']['Tables']['letters']['Row'], 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Database['public']['Tables']['letters']['Insert']>;
			};
			entries: {
				Row: {
					id: string;
					user_id: string;
					content: string;
					type: 'text' | 'voice';
					transcript: string | null;
					created_at: string;
					week_start: string;
				};
				Insert: Omit<Database['public']['Tables']['entries']['Row'], 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Database['public']['Tables']['entries']['Insert']>;
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
}
