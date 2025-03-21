'use client';

import DebugStorage from "../components/DebugStorage";
import SupabaseTest from "../components/test";


export default function TestPage() {
  return (
    <div className="test-container">
      <h1>QR Sync Admin Test Page</h1>
      
      <div className="test-section">
        <h2>Supabase Connection Test</h2>
        <SupabaseTest />
      </div>
      
      <div className="test-section">
        <h2>Storage Debug</h2>
        <DebugStorage />
      </div>
      
      <style jsx>{`
        .test-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .test-section {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
      `}</style>
    </div>
  );
}