export default function ScrollDownArrow({ targetId, color = "text-white/70" }) {
  const scrollTo = () => {
    const element = document.getElementById(targetId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div
      className={`absolute bottom-8 left-0 right-0 mx-auto w-fit animate-bounce cursor-pointer flex flex-col items-center gap-2 ${color} z-20`}
      onClick={scrollTo}
    >
      <span className="text-[10px] font-display font-semibold uppercase tracking-widest drop-shadow-md">Доош гүйлгэх</span>
      <div className="text-xl drop-shadow-md">&#8595;</div>
    </div>
  );
}
