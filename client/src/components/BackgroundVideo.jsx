export default function BackgroundVideo({ overlayOpacity = 'bg-slate-950/40' }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        <source src="https://www.pexels.com/download/video/7439772/" type="video/mp4" />
      </video>
      {/* Dark overlay for readability & glassmorphism effect */}
      <div className={`absolute inset-0 ${overlayOpacity} backdrop-blur-[2px]`} />
    </div>
  );
}
