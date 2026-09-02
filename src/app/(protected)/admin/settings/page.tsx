interface SettingsPageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { redirect: redirectTo } = await searchParams;

  return <div>SettingsPage</div>;
}
