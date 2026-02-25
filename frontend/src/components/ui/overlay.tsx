"use client";

interface OverlayProps {
  visible: boolean;
  onClick: () => void;
}

export function Overlay({ visible, onClick }: OverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      onClick={onClick}
    />
  );
}
