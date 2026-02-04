export function SettingsPage() {
  const devMode = import.meta.env.VITE_DEV_MODE === "true" || import.meta.env.VITE_DEV_MODE === "1";

  return (
    <section>
      <h1>Settings</h1>

      <h2>Finance constants</h2>
      <div className="details-grid">
        <div>
          <strong>Service fee</strong>
          <div>3000</div>
        </div>
        <div>
          <strong>Delivery fee</strong>
          <div>3000 + ceil(distance_km) * 1000</div>
        </div>
      </div>

      <h2>Environment</h2>
      <div className="details-grid">
        <div>
          <strong>DEV_MODE</strong>
          <div>{devMode ? "ON" : "OFF"}</div>
        </div>
      </div>
    </section>
  );
}
