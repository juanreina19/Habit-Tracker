import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 340,
            height: 340,
            background: "#4CAF82",
            borderRadius: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            fontSize: 216,
            fontWeight: 900,
            letterSpacing: -8,
          }}
        >
          H
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
