import React, { useCallback } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFile }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-400 rounded-xl p-16 text-center cursor-pointer hover:border-blue-500 transition"
    >
      <p className="text-gray-500 text-lg">📤 Drop your .glb / .gltf / .obj file here</p>
    </div>
  );
};
