export default function FunnelChart({ data }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold mb-4">Funnel</h2>

      {data.map((item: any) => (
        <div key={item.stageId} className="mb-2">
          <div className="flex justify-between text-sm">
            <span>{item.stageId}</span>
            <span>{item._count}</span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-blue-500 h-2 rounded"
              style={{ width: `${item._count * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}