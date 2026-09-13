import React, { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { Upload, Columns, Split, Layers, Sparkles } from 'lucide-react';
import { 
  loadImage, 
  computeImageDiff, 
  drawSwipeComparison, 
  drawOnionSkin,
  type ImageCompareMode,
  type ImageDiffResult
} from '../lib/imageEngine';

const ImageCompare: React.FC = () => {
  const [imgA, setImgA] = useState<HTMLImageElement | null>(null);
  const [imgB, setImgB] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<ImageCompareMode>('side-by-side');
  
  // Interaction states
  const [swipePosition, setSwipePosition] = useState(0.5);
  const [onionOpacity, setOnionOpacity] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  
  // Results
  const [diffResult, setDiffResult] = useState<ImageDiffResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = async (file: File, side: 'a' | 'b') => {
    try {
      const img = await loadImage(file);
      if (side === 'a') setImgA(img);
      else setImgB(img);
    } catch (e) {
      console.error('Error loading image', e);
    }
  };

  useEffect(() => {
    if (imgA && imgB && mode === 'difference') {
      const result = computeImageDiff(imgA, imgB, 30);
      setDiffResult(result);
    }
  }, [imgA, imgB, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgA || !imgB || mode === 'side-by-side' || mode === 'difference') return;

    // Set canvas dimensions to match the largest image
    canvas.width = Math.max(imgA.naturalWidth, imgB.naturalWidth);
    canvas.height = Math.max(imgA.naturalHeight, imgB.naturalHeight);

    if (mode === 'swipe') {
      drawSwipeComparison(canvas, imgA, imgB, swipePosition);
    } else if (mode === 'onion') {
      drawOnionSkin(canvas, imgA, imgB, onionOpacity);
    }
  }, [imgA, imgB, mode, swipePosition, onionOpacity]);

  // Pointer events for swipe/onion sliders
  const handlePointerDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    updateSlider(e);
  };

  const handlePointerMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    updateSlider(e);
  };

  const handlePointerUp = () => setIsDragging(false);

  const updateSlider = (e: ReactMouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate normalized position (0-1)
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    if (mode === 'swipe') setSwipePosition(x);
    else if (mode === 'onion') setOnionOpacity(x);
  };

  // Render file drop zones
  const FileZone = ({ side, img }: { side: 'a'|'b', img: HTMLImageElement | null }) => (
    <label className={`image-upload-zone ${img ? 'has-image' : ''}`}>
      {img ? (
        <img src={img.src} alt={`Image ${side}`} />
      ) : (
        <>
          <Upload size={32} />
          <span>Upload Image {side.toUpperCase()}</span>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>(Drag & Drop here)</span>
        </>
      )}
      <input type="file" accept="image/*" hidden onChange={(e) => {
        if(e.target.files?.[0]) handleFile(e.target.files[0], side);
      }} />
    </label>
  );

  return (
    <div className="image-compare-area fade-in" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Tools / Mode selection */}
      <div className="image-compare-controls">
        <button className={`image-mode-btn ${mode === 'side-by-side' ? 'active' : ''}`} onClick={() => setMode('side-by-side')}>
          <Columns size={14} className="inline-icon" /> Side-by-side
        </button>
        <button className={`image-mode-btn ${mode === 'swipe' ? 'active' : ''}`} onClick={() => setMode('swipe')}>
          <Split size={14} className="inline-icon" /> Swipe
        </button>
        <button className={`image-mode-btn ${mode === 'onion' ? 'active' : ''}`} onClick={() => setMode('onion')}>
          <Layers size={14} className="inline-icon" /> Onion Skin
        </button>
        <button className={`image-mode-btn ${mode === 'difference' ? 'active' : ''}`} onClick={() => setMode('difference')}>
          <Sparkles size={14} className="inline-icon" /> Pixel Difference
        </button>
      </div>

      <div className="flex flex-grow" style={{ overflow: 'hidden', position: 'relative' }}>
        {mode === 'side-by-side' ? (
          <div className="input-columns" style={{ width: '100%' }}>
            <FileZone side="a" img={imgA} />
            <FileZone side="b" img={imgB} />
          </div>
        ) : (!imgA || !imgB) ? (
          <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-muted)' }}>
             Please upload both images in Side-by-side view first.
          </div>
        ) : mode === 'difference' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
             <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
               <span style={{ color: 'var(--text-secondary)' }}>Pixel Difference: </span>
               <strong style={{ color: diffResult && diffResult.diffPercentage > 0 ? 'var(--red)' : 'var(--green)' }}>
                 {diffResult?.diffPercentage}% 
               </strong>
               <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}> ({diffResult?.diffPixelCount} differing pixels)</span>
             </div>
             <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                {diffResult?.diffCanvas && (
                  <img src={diffResult.diffCanvas.toDataURL()} alt="Diff result" style={{ maxWidth: '100%', objectFit: 'contain', border: '1px solid var(--border)' }} />
                )}
             </div>
          </div>
        ) : (
          <div 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'auto' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <canvas 
              ref={canvasRef} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain', 
                border: '1px solid var(--border)',
                cursor: isDragging ? 'grabbing' : (mode === 'swipe' ? 'col-resize' : 'ew-resize')
              }} 
            />
          </div>
        )}
      </div>
      <style>{`
        .inline-icon { display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px; }
      `}</style>
    </div>
  );
};

export default ImageCompare;
