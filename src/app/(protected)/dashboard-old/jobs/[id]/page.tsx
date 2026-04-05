import MetricsCards from "./components/metrics-cards";
import FunnelChart from "./components/funnel-chart";
import PipelineBoard from "./components/pipeline-board";

async function getData(jobId: string) {
  const [pipeline, funnel, durations] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/pipeline`).then(res => res.json()),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/funnel`).then(res => res.json()),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/durations`).then(res => res.json()),
  ]);

  return { pipeline, funnel, durations };
}

type Params = Promise<{ id: string }>;

export default async function JobPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await getData(id);

  return (
    <div className="space-y-6 p-6">
      <MetricsCards durations={data.durations} />
      <FunnelChart data={data.funnel} />
      <PipelineBoard data={data.pipeline} />
    </div>
  );
}
