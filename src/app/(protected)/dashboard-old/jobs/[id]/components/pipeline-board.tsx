export default function PipelineBoard({ data }: any) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Object.entries(data).map(([stage, apps]: any) => (
        <div key={stage} className="min-w-62.5 bg-gray-100 p-3 rounded-xl">
          <h3 className="font-bold mb-2">{stage}</h3>

          {apps.map((app: any) => (
            <div key={app.id} className="bg-white p-2 rounded mb-2 shadow">
              <p className="text-sm font-medium">
                {app.candidate.firstName} {app.candidate.lastName}
              </p>
              <p className="text-xs text-gray-500">{app.candidate.email}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
