'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hashPin, storeQRData } from '@/lib/supabase';

export default function DebugStorage() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runDebugTest = async () => {
    setIsLoading(true);
    setStatus('Starting debug test...');
    setError('');
    
    try {
      // 1. Test with a simple text string
      setStatus('Testing with simple text...');
      const simpleText = "This is a test QR content";
      const simpleHash = hashPin("1234", "AB");
      
      const simpleId = await storeQRData(simpleText, simpleHash);
      
      if (!simpleId) {
        setError('Failed to store simple text');
        return;
      }
      
      setStatus('✅ Simple text stored successfully. Testing with longer content...');
      
      // 2. Test with a longer string (URL-like)
      const longText = "https://example.com/this/is/a/much/longer/url/that/might/cause/issues/if/there/are/limits/in/the/database/or/api".repeat(5);
      const longId = await storeQRData(longText, simpleHash);
      
      if (!longId) {
        setError('Failed to store longer text');
        return;
      }
      
      setStatus('✅ Longer text stored successfully. Trying with special characters...');
      
      // 3. Test with special characters
      const specialText = "Test with special chars: áéíóú, ñ, 汉字, ♥★☺";
      const specialId = await storeQRData(specialText, simpleHash);
      
      if (!specialId) {
        setError('Failed to store text with special characters');
        return;
      }
      
      setStatus('✅ Special characters stored successfully. Testing with JSON-like text...');
      
      // 4. Test with JSON-like text
      const jsonText = '{"type":"url","content":"https://example.com","title":"Example Website"}';
      const jsonId = await storeQRData(jsonText, simpleHash);
      
      if (!jsonId) {
        setError('Failed to store JSON-like text');
        return;
      }
      
      setStatus('✅ All tests passed! Storage is working properly.');
      
      // Clean up test data
      await Promise.all([
        supabase.from('qr_data').delete().eq('id', simpleId),
        supabase.from('qr_data').delete().eq('id', longId),
        supabase.from('qr_data').delete().eq('id', specialId),
        supabase.from('qr_data').delete().eq('id', jsonId)
      ]);
      
    } catch (err) {
      setError(`Test error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Debug test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="debug-storage">
      <h3>Debug Storage Tests</h3>
      
      <button 
        onClick={runDebugTest} 
        disabled={isLoading}
        className="debug-btn"
      >
        {isLoading ? 'Testing...' : 'Run Storage Tests'}
      </button>
      
      {status && (
        <div className="status-box">
          <strong>Status:</strong> {status}
        </div>
      )}
      
      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <style jsx>{`
        .debug-storage {
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
        .debug-btn {
          background-color: #9c27b0;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .debug-btn:disabled {
          background-color: #d1c4e9;
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
      `}</style>
    </div>
  );
}