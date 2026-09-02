interface CandidatesPageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function CandidatesPage({
  searchParams,
}: CandidatesPageProps) {
  const { redirect: redirectTo } = await searchParams;

  return <div>CandidatesPage</div>;
}
