'use client'
import Webcam from 'react-webcam'
import { useRef, useState } from 'react'

export function CameraCapture({ onCapture, disabled }:{ onCapture:(dataUrl:string)=>void, disabled?: boolean }){
  const ref = useRef<Webcam>(null)
  const [shot, setShot] = useState<string|undefined>()
  return (
    <div className="space-y-3">
      {!shot && <Webcam ref={ref} screenshotFormat="image/jpeg" className="w-full rounded-2xl" />}
      {shot && <img src={shot} alt="preview" className="w-full rounded-2xl" />}
      <div className="flex gap-2">
        {!shot && <button className="btn btn-primary" disabled={disabled} onClick={()=>{ const s = ref.current?.getScreenshot(); if(s){ setShot(s) } }}>Capture</button>}
        {shot && <>
          <button className="btn btn-primary" disabled={disabled} onClick={()=> onCapture(shot)}>
            {disabled ? 'Menyimpan...' : 'Save'}
          </button>
          <button className="btn" disabled={disabled} onClick={()=> setShot(undefined)}>Retake</button>
        </>}
      </div>
    </div>
  )
}