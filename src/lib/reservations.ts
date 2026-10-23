import { supabase, supabaseConfigured } from './supabase';

export type GiftStatus = {
  gift_id: string;
  status: 'available' | 'reserved' | 'purchased';
  reserved_by: string | null;
  booked_at: string | null;
  updated_at: string;
};

export async function fetchStatuses(): Promise<GiftStatus[]> {
  if (!supabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('gift_status').select('gift_id,status,reserved_by,booked_at,updated_at');
  if (error) throw error;
  return (data ?? []) as GiftStatus[];
}

export async function reserveGift(giftId: string, name: string) {
  if (!supabase) throw new Error('Облачная база пока не настроена.');
  const { data, error } = await supabase.rpc('reserve_gift', { p_gift_id: giftId, p_name: name });
  if (error) throw error;
  return data as { token: string };
}

export async function changeReservation(action: 'cancel_gift' | 'mark_purchased', giftId: string, token: string) {
  if (!supabase) throw new Error('Облачная база пока не настроена.');
  const { error } = await supabase.rpc(action, { p_gift_id: giftId, p_token: token });
  if (error) throw error;
}

export function subscribeStatuses(onChange: () => void) {
  if (!supabase) return () => {};
  const channel = supabase.channel('gift-status-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_status' }, onChange)
    .subscribe();
  return () => { void supabase!.removeChannel(channel); };
}