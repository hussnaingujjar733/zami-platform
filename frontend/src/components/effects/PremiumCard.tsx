"use client";

import Tilt from "react-parallax-tilt";

export default function PremiumCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tilt
      glareEnable
      glareMaxOpacity={0.12}
      glareColor="#22c55e"
      glarePosition="all"
      scale={1.02}
      tiltMaxAngleX={8}
      tiltMaxAngleY={8}
      transitionSpeed={1800}
      className={className}
    >
      {children}
    </Tilt>
  );
}
