
import { createClient } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log connection details (for debugging)
console.log('Supabase connection initialized with:', { 
  url: supabaseUrl!.substring(0, 15) + '...',
  keyProvided: !!supabaseAnonKey
});

// Create the Supabase client
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});



// Add this function to your supabase.ts file:

// Fetch QR data by PIN hash only (no ID required)
export async function fetchQRDataByPin(pin: string, letters: string): Promise<string | null> {
  try {
    console.log('Fetching QR data with PIN and letters');
    
    // Generate hash from PIN and letters
    const pinHash = hashPin(pin, letters);
    console.log('Generated PIN hash:', pinHash.substring(0, 10) + '...');
    
    // Find records with matching pin_hash
    const { data, error } = await supabase
      .from('qr_data')
      .select('id, qr_data, expires_at')
      .eq('pin_hash', pinHash)
      .order('expires_at', { ascending: false }) // Get the newest one if multiple exist
      .limit(1);
    
    if (error) {
      console.error('Fetch error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('No data found with pin hash');
      return null;
    }
    
    const record = data[0];
    
    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      console.log('Data has expired');
      await deleteQRData(record.id); // Clean up expired data
      return null;
    }
    
    console.log('Found QR data with ID:', record.id);
    return record.qr_data;
  } catch (err) {
    console.error('Exception fetching QR data by PIN:', err);
    return null;
  }
}

// Create PIN hash
export function hashPin(pin: string, letters: string): string {
  try {
    console.log(`Creating hash for PIN: ${pin} and letters: ${letters}`);
    // Create a hash using SHA-256
    const hash = SHA256(`${pin}-${letters}`).toString(Hex);
    console.log(`Hash created successfully: ${hash.substring(0, 10)}...`);
    return hash;
  } catch (error) {
    console.error('Error creating PIN hash:', error);
    // Return a fallback hash to avoid complete failure
    return SHA256(Date.now().toString()).toString(Hex);
  }
}

// Store QR data
export async function storeQRData(qrData: string, pinHash: string): Promise<string | null> {
  try {
    // Generate a unique ID for this data
    const id = Math.random().toString(36).substring(2, 12);
    
    // Set expiry time (5 minutes from now)
    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    
    // const created_at = new Date().toISOString();
    
    console.log('Attempting to store data with:', { id, qrData, pinHash, expiresAt });

    // Insert data into Supabase
    const { data, error } = await supabase.from('qr_data').insert({
      id,
      qr_data: qrData,
      pin_hash: pinHash,
      expires_at: expiresAt
    }).select();

    if (error) {
      console.error('Supabase error when storing data:', error);
      return null;
    }
    
    console.log('Data stored successfully:', data);
    return id;
  } catch (err) {
    console.error('Exception when storing data:', err);
    return null;
  }
}

// Fetch QR data
export async function fetchQRData(id: string, pinHash: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('qr_data')
      .select('qr_data, expires_at')
      .eq('id', id)
      .eq('pin_hash', pinHash)
      .single();

    if (error || !data) return null;
    
    // Check if data has expired
    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('qr_data').delete().eq('id', id);
      return null;
    }

    return data.qr_data;
  } catch (err) {
    console.error('Error fetching data:', err);
    return null;
  }
}

// Delete QR data
export async function deleteQRData(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('qr_data').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting data:', err);
    return false;
  }
}

// Clean up expired data
export async function cleanupExpiredData(): Promise<void> {
  try {
    await supabase
      .from('qr_data')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (err) {
    console.error('Error cleaning up data:', err);
  }
}