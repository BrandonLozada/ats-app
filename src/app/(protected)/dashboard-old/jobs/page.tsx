export default async function JobsPage() {
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/`).then(
    (res) => res.json(),
  );

  console.log("jobs: ", { data });

  return <h1>Welcome to Jobs</h1>;
}
