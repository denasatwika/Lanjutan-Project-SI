'use client'
export function ApproveRejectBar({ onApprove, onReject }:{ onApprove:()=>void; onReject:()=>void }){
  return (
    <div className="flex gap-2">
      <button className="btn" onClick={onReject}>Reject</button>
      <button className="btn btn-primary" onClick={onApprove}>Approve</button>
    </div>
  )
}