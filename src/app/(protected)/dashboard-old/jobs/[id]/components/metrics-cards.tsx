export default function MetricsCards({ durations }: any) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {durations.map((d: any) => (
        <div key={d.stage} className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">{d.stage}</p>
          <p className="text-xl font-bold">
            {(d.avgTimeMs / 1000 / 60 / 60).toFixed(1)} hrs
          </p>
        </div>
      ))}
    </div>
  );
}
