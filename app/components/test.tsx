'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseTest() {
  const [testStatus, setTestStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestStatus('Testing Supabase connection...');

    try {
      // Test direct connection first
      console.log('Testing direct connection...');
      
      // First try to ping Supabase with a direct request
      const { data, error } = await supabase.from('qr_data').select('*').limit(1);
      
      if (error) {
        console.error('Connection error details:', error);
        setError(`Error connecting to Supabase: ${error.message} (${error.code})`);
        return;
      }
      
      setTestStatus('✅ Connected to Supabase and qr_data table exists!');
      
      // Now test insertion
      const testId = `test_${Math.random().toString(36).substring(2, 8)}`;
      const testData = {
        id: testId,
        qr_data: 'test content',
        pin_hash: 'test hash',
        expires_at: new Date(Date.now() + 60000).toISOString() // 1 minute from now
      };
      
      console.log('Testing insert with data:', testData);
      
      const { error: insertError } = await supabase
        .from('qr_data')
        .insert(testData);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        setError(`Insert test failed: ${insertError.message}`);
        return;
      }
      
      setTestStatus('✅ Insert test successful! Trying delete...');
      
      // Test delete
      const { error: deleteError } = await supabase
        .from('qr_data')
        .delete()
        .eq('id', testId);
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        setError(`Delete test failed: ${deleteError.message}`);
        return;
      }
      
      setTestStatus('✅ All tests passed! Your Supabase connection is working correctly.');
    } catch (err) {
      setError(`Exception during test: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Test exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="supabase-test">
      <h3>Supabase Connection Test</h3>
      
      <button 
        onClick={testConnection} 
        disabled={isLoading}
        className="test-btn"
      >
        {isLoading ? 'Testing...' : 'Test Supabase Connection'}
      </button>
      
      {testStatus && (
        <div className="status-box">
          <strong>Status:</strong> {testStatus}
        </div>
      )}
      
      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
          
          <div className="help-text">
            <p>Possible fixes:</p>
            <ul>
              <li>Check your .env.local file has correct NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              <li>Make sure the qr_data table exists in your Supabase project</li>
              <li>Verify that Row Level Security (RLS) allows anonymous inserts to the qr_data table</li>
              <li>Check browser console for CORS errors</li>
            </ul>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .supabase-test {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        h3 {
          margin-top: 0;
          margin-bottom: 15px;
        }
        .test-btn {
          background-color: #3b82f6;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .test-btn:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        .status-box {
          margin-top: 15px;
          padding: 10px;
          background-color: #e8f4ff;
          border-radius: 4px;
        }
        .error-box {
          margin-top: 15px;
          padding: 10px;
          background-color: #fee2e2;
          border-radius: 4px;
          color: #ef4444;
        }
        .help-text {
          margin-top: 10px;
          color: #4b5563;
          font-size: 0.9rem;
        }
        .help-text ul {
          margin-left: 20px;
        }
      `}</style>
    </div>
  );
}