export default function Page(){
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Policies (Demo)</h1>
      <div className="card p-4">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>Standard working hours: 9am – 6pm.</li>
          <li>Request leave at least 2 days in advance.</li>
          <li>Overtime requires approver approval.</li>
        </ul>
      </div>
    </div>
  )
}
