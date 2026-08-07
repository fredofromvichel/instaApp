import { POST_FORMATS } from "./lib/formats";

/**
 * Placeholder start screen (task 02). The real wizard UI arrives with task 04.
 */
export function App() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80dvh",
        gap: "0.75rem",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0 }}>Insta-Studio</h1>
      <p style={{ margin: 0, maxWidth: "28rem" }}>
        Gestalte schöne Instagram-Posts – ganz einfach auf deinem Handy.
      </p>
      <p style={{ margin: 0, color: "#8a7f70" }}>
        Die App ist noch im Aufbau. Bald kannst du hier loslegen!
      </p>
      <p style={{ margin: 0, color: "#8a7f70", fontSize: "0.875rem" }}>
        Formate: {POST_FORMATS.map((f) => f.label).join(" · ")}
      </p>
    </main>
  );
}
