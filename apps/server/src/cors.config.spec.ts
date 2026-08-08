import { isCorsOriginAllowed } from "./cors.config";

describe("isCorsOriginAllowed", () => {
  it("allows vite dev on localhost and 127.0.0.1", () => {
    expect(isCorsOriginAllowed("http://localhost:1420")).toBe(true);
    expect(isCorsOriginAllowed("http://127.0.0.1:1420")).toBe(true);
  });

  it("allows tauri origins", () => {
    expect(isCorsOriginAllowed("tauri://localhost")).toBe(true);
    expect(isCorsOriginAllowed("https://tauri.localhost")).toBe(true);
  });

  it("allows missing origin (same-machine tools)", () => {
    expect(isCorsOriginAllowed(undefined)).toBe(true);
  });

  it("rejects unknown remote origins", () => {
    expect(isCorsOriginAllowed("https://evil.example")).toBe(false);
  });
});
