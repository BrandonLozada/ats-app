// import { redirect } from "next/navigation";

interface RequiredPageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function RequiredPage({
  searchParams,
}: RequiredPageProps) {
  const { redirect: redirectTo } = await searchParams;

  console.log("redirect URL: ", redirectTo);

  // redirect(redirectTo || "/dashboard");

  return <div>RequiredPage</div>;
}
