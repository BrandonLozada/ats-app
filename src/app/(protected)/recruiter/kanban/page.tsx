interface KanbanPageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const { redirect: redirectTo } = await searchParams;

  console.log("redirect URL: ", redirectTo);

  return <div>KanbanPage</div>;
}
