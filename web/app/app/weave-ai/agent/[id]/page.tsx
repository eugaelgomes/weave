import React from 'react';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-8">
      <h1 className="text-2xl font-bold">Agent Details</h1>
      <p className="text-muted-foreground">ID: {id}</p>
      <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <p>This is a placeholder for the agent details page.</p>
      </div>
    </div>
  );
}
