'use client';
import { useEffect, useRef, useState } from 'react';

export function ModelViewerTool() {
  const mount = useRef<HTMLDivElement>(null); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [playing, setPlaying] = useState(true); const [rotation, setRotation] = useState(true);
  useEffect(() => {
    if (!file || !mount.current) return;
    let disposed = false, frame = 0, objectUrl = URL.createObjectURL(file);
    let dispose = () => {};
    void (async () => {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (disposed || !mount.current) return;
      const element = mount.current;
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101827);
      const camera = new THREE.PerspectiveCamera(45, element.clientWidth / 420, 0.01, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(element.clientWidth, 420); element.replaceChildren(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x53657e, 2));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(3, 5, 4); scene.add(light);
      const controls = new OrbitControls(camera, renderer.domElement);
      const mixer = new THREE.AnimationMixer(scene);
      const clock = new THREE.Clock();
      try {
        const gltf = await new GLTFLoader().loadAsync(objectUrl);
        if (disposed) return;
        scene.add(gltf.scene);
        const bounds = new THREE.Box3().setFromObject(gltf.scene), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3()).length();
        controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(size || 2, size || 2, size || 2)); camera.near = Math.max(0.01, size / 1000); camera.far = Math.max(100, size * 100); camera.updateProjectionMatrix(); controls.update();
        gltf.animations.forEach(clip => mixer.clipAction(clip, gltf.scene).play());
        const animate = () => { frame = requestAnimationFrame(animate); const delta = clock.getDelta(); if (playing) mixer.update(delta); if (rotation) gltf.scene.rotation.y += delta * 0.15; controls.update(); renderer.render(scene, camera); };
        animate();
        setError('');
      } catch { setError('Could not open this GLB file. Check that it is a valid binary glTF model.'); }
      dispose = () => { cancelAnimationFrame(frame); controls.dispose(); renderer.dispose(); scene.traverse(node => { const mesh = node as import('three').Mesh; mesh.geometry?.dispose(); if (mesh.material) { const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.forEach((material: import('three').Material) => material.dispose()); } }); element.replaceChildren(); };
    })();
    return () => { disposed = true; dispose(); URL.revokeObjectURL(objectUrl); };
  }, [file, playing, rotation]);
  return <section className="tool-card"><h2>3D model viewer</h2><p>Open a GLB model locally, rotate it, play embedded animations, and save a screenshot.</p><input type="file" accept=".glb,model/gltf-binary" onChange={event => setFile(event.target.files?.[0] || null)} /><div className="tool-row"><button onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'} animation</button><button onClick={() => setRotation(value => !value)}>{rotation ? 'Stop' : 'Start'} rotation</button><button onClick={() => { const canvas = mount.current?.querySelector('canvas'); if (canvas) { const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'forgeos-model.png'; link.click(); } }}>Save screenshot</button></div>{error && <div role="alert">{error}</div>}<div ref={mount} style={{ minHeight: 420, border: '1px solid #364156', borderRadius: 8 }} /></section>;
}
