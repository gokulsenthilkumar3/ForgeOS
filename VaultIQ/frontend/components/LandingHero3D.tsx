'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LandingHero3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x58a6ff, 3, 20);
    blueLight.position.set(5, 5, 5);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xa371f7, 3, 20);
    purpleLight.position.set(-5, -5, 5);
    scene.add(purpleLight);

    // 3. Generate Floating Nodes (Digital Twin representation)
    const particleCount = 60;
    const geometry = new THREE.SphereGeometry(0.12, 16, 16);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x58a6ff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x1f6feb,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    });

    const meshes: THREE.Mesh[] = [];
    const velocities: THREE.Vector3[] = [];

    // Create group to hold the network
    const networkGroup = new THREE.Group();

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      
      // Random position within a box
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6
      );
      
      networkGroup.add(mesh);
      meshes.push(mesh);
      
      // Random velocity vector
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.006
      ));
    }

    scene.add(networkGroup);

    // 4. Create Interconnecting Network Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x1f6feb,
      transparent: true,
      opacity: 0.25,
    });

    let lineSegments: THREE.LineSegments | null = null;

    const updateLines = () => {
      if (lineSegments) {
        scene.remove(lineSegments);
      }

      const points: THREE.Vector3[] = [];
      const maxDistance = 2.8;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dist = meshes[i].position.distanceTo(meshes[j].position);
          if (dist < maxDistance) {
            points.push(meshes[i].position.clone());
            points.push(meshes[j].position.clone());
          }
        }
      }

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineSegments);
    };

    // 5. Mouse Interaction for Parallax Tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 6. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Move nodes
      for (let i = 0; i < particleCount; i++) {
        const mesh = meshes[i];
        const vel = velocities[i];
        
        mesh.position.add(vel);

        // Boundary bounce
        if (Math.abs(mesh.position.x) > 8) vel.x *= -1;
        if (Math.abs(mesh.position.y) > 5) vel.y *= -1;
        if (Math.abs(mesh.position.z) > 4) vel.z *= -1;
      }

      updateLines();

      // Smooth camera interpolation based on mouse position
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      networkGroup.rotation.y = targetX * 0.25;
      networkGroup.rotation.x = -targetY * 0.20;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return <div ref={containerRef} className="hero-3d-bg" style={{ width: '100%', height: '100%' }} />;
}
