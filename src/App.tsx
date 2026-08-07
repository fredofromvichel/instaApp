import { EngineDemo } from "./demo/EngineDemo";

/**
 * Placeholder shell (task 02) hosting the engine demo (task 03).
 * The real wizard UI arrives with task 04.
 */
export function App() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        padding: "1.5rem 0.5rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0 }}>Insta-Studio</h1>
      <p style={{ margin: 0, maxWidth: "28rem" }}>
        Gestalte schöne Instagram-Posts – ganz einfach auf deinem Handy.
      </p>
      <EngineDemo />
    </main>
  );
}
