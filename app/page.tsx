'use client';

import React, { useState, useEffect } from 'react';
import { hashPin, storeQRData, fetchQRDataByPin, deleteQRData } from '@/lib/supabase';
import QRScanner from './components/QRScanner';
import SupabaseTest from './components/test';
import DebugStorage from './components/DebugStorage';

// Main app modes
type AppMode = 'scan' | 'create-pin' | 'view-mobile' | 'enter-pin' | 'view-data';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('scan');
  const [qrContent, setQrContent] = useState<string>('');
  const [qrId, setQrId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [letters, setLetters] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(300); // 5 minutes
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  
  // Letters grid for selection
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  useEffect(() => {
    // Update letters when selected letters change
    setLetters(selectedLetters.join(''));
  }, [selectedLetters]);

  // Run cleanup on client-side only after mount
  useEffect(() => {
    // Import dynamically to avoid server-side issues
    const runCleanup = async () => {
      try {
        const { cleanupExpiredData } = await import('@/lib/supabase');
        await cleanupExpiredData();
      } catch (err) {
        console.error('Failed to run cleanup:', err);
      }
    };
    
    if (typeof window !== 'undefined') {
      runCleanup();
    }
  }, []);

  // Countdown timer for data view mode
  useEffect(() => {
    if (mode !== 'view-data') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDelete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode]);

  // Handle QR scan success
  const handleScan = (data: string) => {
    setQrContent(data);
    setMode('view-mobile');
  };

  // Enable QR Sync and create PIN
  const handleEnableSync = () => {
    console.log("Enable QR Sync clicked, switching to create-pin mode");
    setPin('');
    setLetters('');
    setSelectedLetters([]);
    setError('');
    setMode('create-pin');
  };

  // Handle letter selection for PIN
  const handleLetterClick = (letter: string) => {
    setSelectedLetters(prev => {
      if (prev.includes(letter)) {
        return prev.filter(l => l !== letter);
      } else if (prev.length < 2) {
        return [...prev, letter];
      }
      return prev;
    });
  };

  // Save PIN and store QR data
  const handleSavePin = async () => {
    setError('');
    
    // Validate PIN
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    
    if (letters.length !== 2) {
      setError('Select exactly 2 letters');
      return;
    }
    
    try {
      // Check if QR content is valid
      if (!qrContent || qrContent.trim() === '') {
        setError('No QR content to save');
        return;
      }
      
      // Create pin hash
      const pinHash = hashPin(pin, letters);
      
      // Log QR content details
      console.log('QR Content type:', typeof qrContent);
      console.log('QR Content length:', qrContent.length);
      console.log('QR Content preview:', qrContent.substring(0, 100) + (qrContent.length > 100 ? '...' : ''));
      
      // Try to sanitize content if needed
      let sanitizedContent = qrContent;
      if (sanitizedContent.length > 5000) {
        console.log('QR Content is very long, truncating...');
        sanitizedContent = sanitizedContent.substring(0, 5000);
      }
      
      // Store data
      console.log('Saving QR data...');
      const id = await storeQRData(sanitizedContent, pinHash);
      
      if (!id) {
        // Try one more time with a fallback approach
        console.log('First attempt failed, trying with simplified content...');
        
        // Force to string and simplify content
        const fallbackContent = String(qrContent).substring(0, 1000);
        const fallbackId = await storeQRData(fallbackContent, pinHash);
        
        if (!fallbackId) {
          throw new Error('Failed to store data after multiple attempts');
        }
        
        // Success with fallback
        setQrId(fallbackId);
        setMode('scan');
        alert(`Success! Just remember your PIN (${pin}) and letters (${letters}) to access your data.`);
        return;
      }
      
      // Success with normal approach
      setQrId(id);
      setMode('scan');
      alert(`Success! Just remember your PIN (${pin}) and letters (${letters}) to access your data.`);
    } catch (err) {
      console.error('Error in handleSavePin:', err);
      setError('Failed to save data. Please try again.');
    }
  };

  // Switch to enter PIN mode
  const handleAccessQRSync = () => {
    setQrId('');
    setPin('');
    setLetters('');
    setSelectedLetters([]);
    setError('');
    setMode('enter-pin');
  };

  // Verify PIN and fetch QR data (updated to not require QR ID)
  const handleVerifyPin = async () => {
    setError('');
    
    // Validate PIN inputs
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    
    if (letters.length !== 2) {
      setError('Select exactly 2 letters');
      return;
    }
    
    try {
      console.log('Verifying PIN...');
      
      // Fetch data using only PIN and letters
      const data = await fetchQRDataByPin(pin, letters);
      
      if (!data) {
        throw new Error('Invalid PIN or data expired');
      }
      
      // Show data
      setQrContent(data);
      setDataLoaded(true);
      setCountdown(300); // Reset countdown
      setMode('view-data');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Invalid PIN or data expired');
    }
  };

  // Delete data manually
  const handleDelete = async () => {
    if (!qrId) return;
    
    try {
      await deleteQRData(qrId);
      setMode('scan');
    } catch (err) {
      console.error('Error deleting data:', err);
    }
  };

  // Format countdown time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if content is a URL
  const isUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  // Render the appropriate UI based on mode
  const renderContent = () => {
    switch (mode) {
      case 'scan':
        return (
          <div className="section">
            <h2>Scan a QR Code</h2>
            <QRScanner onScanSuccess={handleScan} />
            <button className="btn access-btn" onClick={handleAccessQRSync}>
              Access QR Sync Data
            </button>
            
            {/* Add Supabase test tool to help diagnose connection issues */}
            <SupabaseTest />
            
            {/* Add Storage debug tests */}
            <DebugStorage />
          </div>
        );
        
      case 'view-mobile':
        return (
          <div className="section">
            <h2>QR Content</h2>
            <div className="qr-content">
              {isUrl(qrContent) ? (
                <a href={qrContent} target="_blank" rel="noopener noreferrer" className="url">
                  {qrContent}
                </a>
              ) : (
                <p>{qrContent}</p>
              )}
            </div>
            <div className="options">
              {isUrl(qrContent) && (
                <button className="btn open-btn" onClick={() => window.open(qrContent, '_blank')}>
                  Open Link
                </button>
              )}
              <button className="btn sync-btn" onClick={handleEnableSync}>
                Enable QR Sync
              </button>
              <button className="btn cancel-btn" onClick={() => setMode('scan')}>
                Cancel
              </button>
            </div>
          </div>
        );
        
      case 'create-pin':
        return (
          <div className="section">
            <h2>Create a PIN</h2>
            <p>Create a 4-digit PIN and select 2 letters to secure your QR data</p>
            
            {error && <div className="error">{error}</div>}
            
            <div className="pin-input">
              <label htmlFor="pin">4-Digit PIN:</label>
              <input
                id="pin"
                type="text"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val) && val.length <= 4) {
                    setPin(val);
                  }
                }}
                placeholder="Enter 4 digits"
                maxLength={4}
              />
            </div>
            
            <div className="letter-selection">
              <label>Select 2 Letters:</label>
              <div className="letter-grid">
                {alphabet.map(letter => (
                  <button
                    key={letter}
                    type="button"
                    className={`letter ${selectedLetters.includes(letter) ? 'selected' : ''}`}
                    onClick={() => handleLetterClick(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="selected">Selected: {selectedLetters.join(' ')}</div>
            </div>
            
            <div className="actions">
              <button
                className="btn save-btn"
                onClick={handleSavePin}
                disabled={pin.length !== 4 || letters.length !== 2}
              >
                Save & Exit
              </button>
              <button className="btn cancel-btn" onClick={() => setMode('view-mobile')}>
                Cancel
              </button>
            </div>
          </div>
        );
        
      case 'enter-pin':
        return (
          <div className="section">
            <h2>Access QR Sync Data</h2>
            
            {error && <div className="error">{error}</div>}
            
            <div className="pin-input">
              <label htmlFor="pin-access">4-Digit PIN:</label>
              <input
                id="pin-access"
                type="text"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val) && val.length <= 4) {
                    setPin(val);
                  }
                }}
                placeholder="Enter 4 digits"
                maxLength={4}
              />
            </div>
            
            <div className="letter-selection">
              <label>Select 2 Letters:</label>
              <div className="letter-grid">
                {alphabet.map(letter => (
                  <button
                    key={letter}
                    type="button"
                    className={`letter ${selectedLetters.includes(letter) ? 'selected' : ''}`}
                    onClick={() => handleLetterClick(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="selected">Selected: {selectedLetters.join(' ')}</div>
            </div>
            
            <div className="actions">
              <button
                className="btn verify-btn"
                onClick={handleVerifyPin}
                disabled={pin.length !== 4 || letters.length !== 2}
              >
                Access Data
              </button>
              <button className="btn cancel-btn" onClick={() => setMode('scan')}>
                Cancel
              </button>
            </div>
          </div>
        );
        
      case 'view-data':
        if (!dataLoaded) {
          return <div className="loading">Loading data...</div>;
        }
        return (
          <div className="section">
            <h2>QR Data Retrieved</h2>
            
            <div className="countdown">
              Data expires in: <span className="timer">{formatTime(countdown)}</span>
            </div>
            
            <div className="qr-content">
              <h3>Content:</h3>
              <div className="content-box">
                {isUrl(qrContent) ? (
                  <a href={qrContent} target="_blank" rel="noopener noreferrer" className="url">
                    {qrContent}
                  </a>
                ) : (
                  <p>{qrContent}</p>
                )}
              </div>
            </div>
            
            <div className="actions">
              {isUrl(qrContent) && (
                <button className="btn open-btn" onClick={() => window.open(qrContent, '_blank')}>
                  Open Link
                </button>
              )}
              <button className="btn delete-btn" onClick={handleDelete}>
                Delete Now
              </button>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown mode: {mode}</div>;
    }
  };

  return (
    <main className="container">
      <h1 className="title">QR Sync</h1>
      
      {renderContent()}
      
      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .title {
          text-align: center;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .section {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        h2 {
          font-size: 20px;
          margin-bottom: 10px;
        }
        .error {
          color: red;
          font-size: 14px;
          padding: 5px;
          border: 1px solid red;
          border-radius: 4px;
          background-color: rgba(255, 0, 0, 0.1);
        }
        .loading {
          text-align: center;
          padding: 20px;
          font-size: 16px;
          color: #666;
        }
        .qr-content {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          word-break: break-all;
        }
        .content-box {
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
        }
        .url {
          color: blue;
          text-decoration: underline;
        }
        .options, .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          min-width: 100px;
        }
        .btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .open-btn {
          background-color: #4CAF50;
          color: white;
        }
        .sync-btn, .access-btn, .verify-btn {
          background-color: #2196F3;
          color: white;
        }
        .save-btn {
          background-color: #2196F3;
          color: white;
        }
        .cancel-btn {
          background-color: #9e9e9e;
          color: white;
        }
        .delete-btn {
          background-color: #f44336;
          color: white;
        }
        .pin-input, .qr-id-input {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        input {
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .letter-selection {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .letter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
          gap: 5px;
        }
        .letter {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
        }
        .letter.selected {
          background-color: #4CAF50;
          color: white;
          font-weight: bold;
        }
        .selected {
          font-size: 14px;
          margin-top: 5px;
        }
        .countdown {
          text-align: center;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
          font-size: 16px;
        }
        .timer {
          font-weight: bold;
          color: ${countdown < 60 ? 'red' : 'inherit'};
        }
      `}</style>
    </main>
  );
}