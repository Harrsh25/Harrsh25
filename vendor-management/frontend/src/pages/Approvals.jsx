import { useState } from "react";
import { api } from "../api.js";
import { useApi } from "../useApi.js";

// Single inbox across every entity type (vendor / PO / invoice) driven by
// the same generic ApprovalInstance/ApprovalAction tables.
export default function Approvals() {
  const { data: queue, error, loading, reload } = useApi(() => api.get("/approvals/queue"), []);
  const [comments, setComments] = useState({});
  const [actionError, setActionError] = useState(null);

  const act = async (instanceId, decision) => {
    setActionError(null);
    try {
      await api.post(`/approvals/instances/${instanceId}/act`, {
        decision,
        approverUserId: "demo-user",
        comments: comments[instanceId] || "",
      });
      await reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <div>
      <h1>Approvals Queue</h1>
      {error && <div className="error-banner">{error}</div>}
      {actionError && <div className="error-banner">{actionError}</div>}
      {loading && <p className="muted">Loading...</p>}

      {queue?.map((instance) => {
        const stage = instance.workflow.stages.find((s) => s.sequence === instance.currentStage);
        return (
          <div className="card" key={instance.id}>
            <h2>
              {instance.workflow.name} <span className="badge badge-accent">{instance.entityType.replace("_", " ")}</span>
            </h2>
            <p className="muted">Entity ID: {instance.entityId}</p>
            <p>
              Stage {instance.currentStage} of {instance.workflow.stages.length}: <strong>{stage?.name}</strong> ({stage?.approverRole})
            </p>
            <input
              placeholder="Comments (optional)"
              value={comments[instance.id] || ""}
              onChange={(e) => setComments({ ...comments, [instance.id]: e.target.value })}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={() => act(instance.id, "APPROVED")}>Approve</button>
              <button onClick={() => act(instance.id, "REJECTED")}>Reject</button>
            </div>
          </div>
        );
      })}
      {queue?.length === 0 && <p className="muted">Nothing pending approval.</p>}
    </div>
  );
}
