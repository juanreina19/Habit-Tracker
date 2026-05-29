import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            background: "#4CAF82",
            borderRadius: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: -3,
          }}
        >
          H
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
