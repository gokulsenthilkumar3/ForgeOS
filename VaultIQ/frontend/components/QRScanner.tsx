'use client';

import { useState, useRef } from 'react';
import { Camera, AlertCircle, ScanLine, XSquare, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

type ScannerState = 'IDLE' | 'LOADING' | 'SCANNING' | 'ERROR';

export default function AssetScanner({ onScanSuccess }: ScannerProps) {
  const [scannerState, setScannerState] = useState<ScannerState>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanner = () => {
    setScannerState('SCANNING');
    setError(null);
  };

  const stopScanner = () => {
    setScannerState('IDLE');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("hidden-file-qr-reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      onScanSuccess(decodedText);
      html5QrCode.clear();
    } catch (err) {
      setError("No QR code found in the uploaded image.");
      if (scannerState !== 'SCANNING') {
        setScannerState('ERROR');
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-ui-wrapper glass">
        
        <div id="hidden-file-qr-reader" style={{ display: 'none' }}></div>

        {scannerState === 'IDLE' && (
          <div className="scanner-placeholder glass-panel" style={{ zIndex: 5 }}>
            <div className="status-box">
              <ScanLine size={48} className="text-accent" />
              <h3>Ready to Scan</h3>
              <p>Choose an option below to start scanning an asset QR code.</p>
              <div className="action-buttons-large">
                <button className="btn-huge primary premium-btn" onClick={startScanner}>
                  <Video size={24} />
                  <span>Start Camera</span>
                </button>
                <button className="btn-huge secondary premium-btn" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={24} />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {scannerState === 'ERROR' && (
          <div className="scanner-placeholder glass-panel" style={{ zIndex: 5 }}>
            <div className="status-box error">
              <AlertCircle size={48} />
              <h3>Action Failed</h3>
              <p>{error}</p>
              <div className="action-buttons-large mt-4">
                <button className="btn-huge primary premium-btn" onClick={startScanner}>
                  <Video size={20} /> Retry Camera
                </button>
                <button className="btn-huge secondary premium-btn" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={20} /> Upload Instead
                </button>
              </div>
            </div>
          </div>
        )}

        {scannerState === 'SCANNING' && (
          <div className="scanner-active-view">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  onScanSuccess(result[0].rawValue);
                }
              }}
              onError={(err) => {
                console.error(err);
                if (err.message && err.message.includes('permissions')) {
                   setScannerState('ERROR');
                   setError("Camera permission denied.");
                }
              }}
              components={{
                onOff: false,
                finder: false,
              }}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { objectFit: 'cover' }
              }}
            />
            
            <div className="scanner-overlay">
              <div className="corner corner-tl"></div>
              <div className="corner corner-tr"></div>
              <div className="corner corner-bl"></div>
              <div className="corner corner-br"></div>
              <div className="scan-line"></div>
            </div>
            
            <div className="scanner-bottom-controls">
              <button className="control-btn cancel premium-btn-small" onClick={stopScanner}>
                <XSquare size={20} /> Stop
              </button>
              <button className="control-btn upload premium-btn-small" onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} /> Upload
              </button>
            </div>
          </div>
        )}

        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
        />
      </div>

      <style jsx>{`
        .scanner-container { width: 100%; display: flex; justify-content: center; }
        .scanner-ui-wrapper {
          position: relative;
          width: 100%; max-width: 500px; aspect-ratio: 1;
          border-radius: 24px; overflow: hidden;
          background: rgba(10, 10, 15, 0.6);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(16px);
        }

        .scanner-active-view {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          overflow: hidden;
        }

        .scanner-placeholder {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 20px; text-align: center;
        }
        .status-box { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
        .status-box.error { color: #ff7b78; }
        .status-box.loading, .text-accent { color: var(--accent-primary, #0070f3); }
        .status-box h3 { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; }
        .status-box p { margin: 0; font-size: 1rem; color: var(--text-secondary); max-width: 80%; line-height: 1.5; }

        .action-buttons-large {
          display: flex; flex-direction: column; gap: 16px; margin-top: 24px; width: 85%; max-width: 320px;
        }
        
        .premium-btn {
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .premium-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .premium-btn:active {
          transform: translateY(0);
        }

        .btn-huge {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 16px; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; 
        }
        .btn-huge.primary { 
          background: linear-gradient(135deg, var(--accent-primary, #0070f3), var(--accent-hover, #0051a8)); 
          color: white; 
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .btn-huge.secondary { 
          background: rgba(255,255,255,0.05); 
          color: var(--text-primary); 
          border: 1px solid rgba(255,255,255,0.1); 
          backdrop-filter: blur(10px);
        }

        .mt-4 { margin-top: 1rem; }

        .scanner-bottom-controls {
          position: absolute; bottom: 24px; left: 0; right: 0;
          display: flex; justify-content: center; gap: 16px; z-index: 20;
          padding: 0 20px;
        }
        .premium-btn-small {
          border-radius: 30px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .control-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 24px; font-weight: 600; font-size: 1rem;
          cursor: pointer; border: none; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          backdrop-filter: blur(12px);
        }
        .control-btn.cancel { background: rgba(255, 60, 60, 0.85); color: white; border: 1px solid rgba(255,255,255,0.1); }
        .control-btn.cancel:hover { background: rgba(255, 60, 60, 1); transform: translateY(-2px); }
        .control-btn.upload { background: rgba(30, 30, 35, 0.85); color: white; border: 1px solid rgba(255,255,255,0.15); }
        .control-btn.upload:hover { background: rgba(40, 40, 45, 1); transform: translateY(-2px); }

        .pulse-icon { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }

        .scanner-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: 24px; }
        .corner { position: absolute; width: 40px; height: 40px; border: 4px solid var(--accent-primary, #0070f3); opacity: 0.8; }
        .corner-tl { top: 30px; left: 30px; border-right: none; border-bottom: none; border-top-left-radius: 16px; }
        .corner-tr { top: 30px; right: 30px; border-left: none; border-bottom: none; border-top-right-radius: 16px; }
        .corner-bl { bottom: 90px; left: 30px; border-right: none; border-top: none; border-bottom-left-radius: 16px; }
        .corner-br { bottom: 90px; right: 30px; border-left: none; border-top: none; border-bottom-right-radius: 16px; }
        .scan-line {
          position: absolute; top: 30px; left: 30px; right: 30px; height: 2px;
          background: var(--accent-primary, #0070f3); box-shadow: 0 0 12px var(--accent-primary, #0070f3), 0 0 24px var(--accent-primary, #0070f3);
          animation: scan 2s linear infinite;
        }
        @keyframes scan { 0% { top: 30px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: calc(100% - 92px); opacity: 0; } }
      `}</style>
    </div>
  );
}
