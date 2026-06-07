type DashboardBackgroundProps = {
  imageUrl?: string;
};

export default function DashboardBackground({
  imageUrl = "/images/mekuru-dashboard-bg.jpg",
}: DashboardBackgroundProps) {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />

      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-transparent" />
    </>
  );
}