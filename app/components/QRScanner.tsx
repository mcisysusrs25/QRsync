'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (data: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  useEffect(() => {
    return () => {
      // Clean up scanner on unmount
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(err => {
          console.error('Failed to stop scanner:', err);
        });
      }
    };
  }, [scanning]);

  const startScanner = async () => {
    setError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      setScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          stopScanner();
          onScanSuccess(decodedText);
        },
        undefined
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  return (
    <div className="qr-scanner">
      <div id={scannerContainerId} style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        {!scanning ? (
          <button onClick={startScanner} className="scan-btn">
            Start Scanning
          </button>
        ) : (
          <button onClick={stopScanner} className="stop-btn">
            Stop Scanning
          </button>
        )}
      </div>

      <style jsx>{`
        .qr-scanner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          width: 100%;
        }
        .error {
          color: red;
          font-size: 14px;
        }
        .controls {
          margin-top: 10px;
        }
        button {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .scan-btn {
          background-color: #4CAF50;
          color: white;
        }
        .stop-btn {
          background-color: #f44336;
          color: white;
        }
      `}</style>
    </div>
  );
}