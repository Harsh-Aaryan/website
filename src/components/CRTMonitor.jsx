import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import './CRTMonitor.css'

const Monitor = ({ stage }) => {
  const monitorRef = useRef()
  const cameraRef = useRef()
  
  const startPosition = [0, 0, 5]
  const endPosition = [0, 0, 0.1]
  
  useFrame((state) => {
    if (stage === 'zooming' && cameraRef.current) {
      const progress = Math.min((state.clock.getElapsedTime() - 1) / 2.5, 1)
      const easedProgress = easeInOutCubic(progress)
      
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        startPosition[2],
        endPosition[2],
        easedProgress
      )
      cameraRef.current.updateProjectionMatrix()
    }
  })
  
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const monitorGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.6, -1.2)
    shape.lineTo(1.6, -1.2)
    shape.lineTo(1.6, 1.2)
    shape.lineTo(-1.6, 1.2)
    shape.lineTo(-1.6, -1.2)

    const hole = new THREE.Path()
    hole.moveTo(-1.3, -0.95)
    hole.lineTo(1.3, -0.95)
    hole.lineTo(1.3, 0.95)
    hole.lineTo(-1.3, 0.95)
    hole.lineTo(-1.3, -0.95)
    shape.holes.push(hole)

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 1
    })
  }, [])

  return (
    <group ref={monitorRef}>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={startPosition}
        fov={50}
      />
      
      <mesh geometry={monitorGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial color="#D4C5A8" roughness={0.7} metalness={0.1} />
      </mesh>
      
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[2.5, 1.85]} />
        <meshBasicMaterial color="#0E0A05" />
      </mesh>
      
      <pointLight position={[0, 0, 2]} intensity={1.5} color="#FFB000" distance={5} decay={2} />
      
      <mesh position={[1.6, -1.3, 0.1]} scale={0.05}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#FFB000" emissive="#FFB000" emissiveIntensity={2} />
      </mesh>
      
      <ambientLight intensity={0.1} color="#7BA3C0" />
      <directionalLight position={[-3, 2, 5]} intensity={0.3} color="#7BA3C0" />
    </group>
  )
}

const CRTMonitor = ({ stage }) => {
  return (
    <div className="crt-monitor-container">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(to bottom, #07090C, #121418)' }}
      >
        <Monitor stage={stage} />
        <fog attach="fog" args={['#07090C', 5, 15]} />
      </Canvas>
    </div>
  )
}

export default CRTMonitor
